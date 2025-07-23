import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Assessment as ReportIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { supabase } from '../utils/supabaseClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Part {
  part_id: string;
  part_code: string;
  part_name: string;
  unit: string;
}

interface Supplier {
  supplier_id: string;
  supplier_name: string;
}

interface InboundRecord {
  inbound_id: string;
  inbound_date: string;
  part_id: string;
  supplier_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  reference_number: string;
  notes?: string;
  created_by: string;
  part_code: string;
  part_name: string;
  supplier_name: string;
  part_unit: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inbound-tabpanel-${index}`}
      aria-labelledby={`inbound-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const InboundPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  // 검색 필터 상태
  const [searchFilters, setSearchFilters] = useState({
    dateRange: '전체',
    startDate: null as Date | null,
    endDate: null as Date | null,
    partCode: '',
    supplier: '전체'
  });

  // 입고 등록 폼 상태
  const [inboundForm, setInboundForm] = useState({
    selectedPart: '',
    selectedSupplier: '',
    quantity: 1,
    inboundDate: new Date(),
    unitPrice: 0,
    remarks: ''
  });

  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');

  // 데이터 로드
  useEffect(() => {
    loadParts();
    loadSuppliers();
  }, []);

  // 참조번호 자동생성
  useEffect(() => {
    if (inboundForm.inboundDate) {
      generateReferenceNumber(inboundForm.inboundDate);
    }
  }, [inboundForm.inboundDate]);

  // 현재 재고 조회
  useEffect(() => {
    if (inboundForm.selectedPart) {
      loadCurrentStock(inboundForm.selectedPart);
      loadUnitPrice(inboundForm.selectedPart, inboundForm.selectedSupplier);
    }
  }, [inboundForm.selectedPart, inboundForm.selectedSupplier]);

  const loadParts = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('part_id, part_code, part_name, unit');
      
      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('부품 데이터 로드 실패:', error);
      showSnackbar('부품 데이터 로드에 실패했습니다.', 'error');
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('supplier_id, supplier_name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('공급업체 데이터 로드 실패:', error);
      showSnackbar('공급업체 데이터 로드에 실패했습니다.', 'error');
    }
  };

  const loadCurrentStock = async (partId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('current_quantity')
        .eq('part_id', partId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setCurrentStock(data?.current_quantity || 0);
    } catch (error) {
      console.error('재고 조회 실패:', error);
      setCurrentStock(0);
    }
  };

  const loadUnitPrice = async (partId: string, supplierId: string) => {
    if (!partId || !supplierId) return;
    
    try {
      const { data, error } = await supabase
        .from('part_prices')
        .select('unit_price')
        .eq('part_id', partId)
        .eq('supplier_id', supplierId)
        .eq('is_current', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      setInboundForm(prev => ({
        ...prev,
        unitPrice: data?.unit_price || 0
      }));
    } catch (error) {
      console.error('단가 조회 실패:', error);
    }
  };

  const generateReferenceNumber = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyyMMdd');
      const prefix = `IN-${dateStr}`;
      
      const { data, error } = await supabase
        .from('inbound')
        .select('reference_number')
        .ilike('reference_number', `${prefix}-%`)
        .order('reference_number', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastRef = data[0].reference_number;
        const lastNum = parseInt(lastRef.split('-')[2]);
        nextNumber = lastNum + 1;
      }
      
      setReferenceNumber(`${prefix}-${nextNumber.toString().padStart(3, '0')}`);
    } catch (error) {
      console.error('참조번호 생성 실패:', error);
      const dateStr = format(date, 'yyyyMMdd');
      setReferenceNumber(`IN-${dateStr}-001`);
    }
  };

  const searchInboundRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inbound')
        .select(`
          inbound_id, inbound_date, quantity, unit_price, total_price, 
          currency, reference_number, created_by, part_id, supplier_id,
          part_code, part_name, supplier_name, part_unit
        `);

      // 날짜 필터 적용
      if (searchFilters.dateRange !== '전체' && searchFilters.startDate && searchFilters.endDate) {
        query = query
          .gte('inbound_date', format(searchFilters.startDate, 'yyyy-MM-dd'))
          .lte('inbound_date', format(searchFilters.endDate, 'yyyy-MM-dd'));
      }

      // 공급업체 필터 적용
      if (searchFilters.supplier !== '전체') {
        const supplier = suppliers.find(s => s.supplier_name === searchFilters.supplier);
        if (supplier) {
          query = query.eq('supplier_id', supplier.supplier_id);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // 부품 코드 필터 적용 (클라이언트 사이드)
      let filteredData = data || [];
      if (searchFilters.partCode) {
        filteredData = filteredData.filter(record => 
          record.part_code.toLowerCase().includes(searchFilters.partCode.toLowerCase())
        );
      }
      
      setInboundRecords(filteredData);
      showSnackbar(`검색 결과: ${filteredData.length}건`, 'info');
    } catch (error) {
      console.error('검색 실패:', error);
      showSnackbar('검색에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitInboundRecord = async () => {
    // 유효성 검사
    if (!inboundForm.selectedPart) {
      showSnackbar('부품을 선택해주세요.', 'error');
      return;
    }
    if (!inboundForm.selectedSupplier) {
      showSnackbar('공급업체를 선택해주세요.', 'error');
      return;
    }
    if (inboundForm.quantity < 1) {
      showSnackbar('수량은 1 이상이어야 합니다.', 'error');
      return;
    }
    if (inboundForm.unitPrice <= 0) {
      showSnackbar('단가를 입력해주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const selectedPart = parts.find(p => p.part_id === inboundForm.selectedPart);
      const selectedSupplier = suppliers.find(s => s.supplier_id === inboundForm.selectedSupplier);
      
      const inboundData = {
        inbound_date: format(inboundForm.inboundDate, 'yyyy-MM-dd'),
        part_id: inboundForm.selectedPart,
        supplier_id: inboundForm.selectedSupplier,
        quantity: inboundForm.quantity,
        unit_price: inboundForm.unitPrice,
        total_price: inboundForm.quantity * inboundForm.unitPrice,
        currency: '₫',
        reference_number: referenceNumber,
        notes: inboundForm.remarks,
        created_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        part_code: selectedPart?.part_code || '',
        part_name: selectedPart?.part_name || '',
        supplier_name: selectedSupplier?.supplier_name || '',
        part_unit: selectedPart?.unit || 'EA'
      };

      // 입고 데이터 저장
      const { error: inboundError } = await supabase
        .from('inbound')
        .insert(inboundData);
      
      if (inboundError) throw inboundError;

      // 재고 업데이트
      const { data: inventoryData, error: inventorySelectError } = await supabase
        .from('inventory')
        .select('inventory_id, current_quantity')
        .eq('part_id', inboundForm.selectedPart)
        .single();

      if (inventorySelectError && inventorySelectError.code !== 'PGRST116') {
        throw inventorySelectError;
      }

      if (inventoryData) {
        // 기존 재고 업데이트
        const newQuantity = (inventoryData.current_quantity || 0) + inboundForm.quantity;
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ current_quantity: newQuantity })
          .eq('inventory_id', inventoryData.inventory_id);
        
        if (updateError) throw updateError;
      } else {
        // 새 재고 생성
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            part_id: inboundForm.selectedPart,
            current_quantity: inboundForm.quantity
          });
        
        if (insertError) throw insertError;
      }

      showSnackbar('입고 등록이 완료되었습니다.', 'success');
      
      // 폼 초기화
      setInboundForm({
        selectedPart: '',
        selectedSupplier: '',
        quantity: 1,
        inboundDate: new Date(),
        unitPrice: 0,
        remarks: ''
      });
      setCurrentStock(null);
      
    } catch (error) {
      console.error('입고 등록 실패:', error);
      showSnackbar('입고 등록에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    // TODO: Excel 내보내기 구현
    showSnackbar('Excel 내보내기 기능을 구현 중입니다.', 'info');
  };

  const generateReport = () => {
    // TODO: 보고서 생성 구현
    showSnackbar('보고서 생성 기능을 구현 중입니다.', 'info');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getDateRangeOptions = () => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      '전체': { start: null, end: null },
      '최근 7일': { start: lastWeek, end: today },
      '최근 30일': { start: lastMonth, end: today }
    };
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          입고 관리
        </Typography>
        
        <Card>
          <CardContent>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab icon={<SearchIcon />} label="검색" />
              <Tab icon={<AddIcon />} label="등록" />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              {/* 검색 탭 */}
              <Typography variant="h6" gutterBottom>
                입고 이력 검색
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>기간 선택</InputLabel>
                    <Select
                      value={searchFilters.dateRange}
                      label="기간 선택"
                      onChange={(e) => {
                        const range = e.target.value;
                        const options = getDateRangeOptions();
                        setSearchFilters(prev => ({
                          ...prev,
                          dateRange: range,
                          startDate: options[range as keyof typeof options]?.start || null,
                          endDate: options[range as keyof typeof options]?.end || null
                        }));
                      }}
                    >
                      {Object.keys(getDateRangeOptions()).map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="부품 코드 검색"
                    placeholder="MT001"
                    value={searchFilters.partCode}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, partCode: e.target.value }))}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>공급업체 선택</InputLabel>
                    <Select
                      value={searchFilters.supplier}
                      label="공급업체 선택"
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, supplier: e.target.value }))}
                    >
                      <MenuItem value="전체">전체</MenuItem>
                      {suppliers.map(supplier => (
                        <MenuItem key={supplier.supplier_id} value={supplier.supplier_name}>
                          {supplier.supplier_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={searchInboundRecords}
                disabled={loading}
                sx={{ mb: 3 }}
              >
                검색
              </Button>
              
              {inboundRecords.length > 0 && (
                <>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">
                      검색 결과: {inboundRecords.length}건, 
                      총액: {formatCurrency(inboundRecords.reduce((sum, record) => sum + record.total_price, 0))}
                    </Typography>
                    
                    <Box>
                      <Button
                        startIcon={<DownloadIcon />}
                        onClick={exportToExcel}
                        sx={{ mr: 1 }}
                      >
                        Excel 저장
                      </Button>
                      <Button
                        startIcon={<ReportIcon />}
                        onClick={generateReport}
                      >
                        보고서 생성
                      </Button>
                    </Box>
                  </Box>
                  
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>부품 코드</TableCell>
                          <TableCell>부품명</TableCell>
                          <TableCell>공급업체</TableCell>
                          <TableCell>수량</TableCell>
                          <TableCell>단위</TableCell>
                          <TableCell>단가</TableCell>
                          <TableCell>총액</TableCell>
                          <TableCell>입고일</TableCell>
                          <TableCell>참조번호</TableCell>
                          <TableCell>등록자</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inboundRecords.map((record) => (
                          <TableRow key={record.inbound_id}>
                            <TableCell>{record.part_code}</TableCell>
                            <TableCell>{record.part_name}</TableCell>
                            <TableCell>{record.supplier_name}</TableCell>
                            <TableCell>{record.quantity.toLocaleString()}</TableCell>
                            <TableCell>{record.part_unit}</TableCell>
                            <TableCell>{formatCurrency(record.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(record.total_price)}</TableCell>
                            <TableCell>{format(new Date(record.inbound_date), 'yyyy-MM-dd')}</TableCell>
                            <TableCell>{record.reference_number}</TableCell>
                            <TableCell>{record.created_by}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              {/* 등록 탭 */}
              <Typography variant="h6" gutterBottom>
                신규 입고 등록
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>부품 선택</InputLabel>
                    <Select
                      value={inboundForm.selectedPart}
                      label="부품 선택"
                      onChange={(e) => setInboundForm(prev => ({ ...prev, selectedPart: e.target.value }))}
                    >
                      {parts.map(part => (
                        <MenuItem key={part.part_id} value={part.part_id}>
                          {part.part_code} - {part.part_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {currentStock !== null && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <InfoIcon sx={{ mr: 1 }} />
                        현재 재고: {currentStock.toLocaleString()}
                      </Box>
                    </Alert>
                  )}
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>공급업체 선택</InputLabel>
                    <Select
                      value={inboundForm.selectedSupplier}
                      label="공급업체 선택"
                      onChange={(e) => setInboundForm(prev => ({ ...prev, selectedSupplier: e.target.value }))}
                    >
                      {suppliers.map(supplier => (
                        <MenuItem key={supplier.supplier_id} value={supplier.supplier_id}>
                          {supplier.supplier_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="수량"
                    value={inboundForm.quantity}
                    onChange={(e) => setInboundForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    inputProps={{ min: 1 }}
                    sx={{ mb: 3 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="입고일"
                    value={inboundForm.inboundDate}
                    onChange={(date) => setInboundForm(prev => ({ ...prev, inboundDate: date || new Date() }))}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { mb: 3 }
                      }
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    label="참조번호"
                    value={referenceNumber}
                    disabled
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="단가"
                    value={inboundForm.unitPrice}
                    onChange={(e) => setInboundForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    inputProps={{ min: 0, step: 1000 }}
                    sx={{ mb: 3 }}
                  />
                  
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, textAlign: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      총액: {formatCurrency(inboundForm.quantity * inboundForm.unitPrice)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="비고"
                    value={inboundForm.remarks}
                    onChange={(e) => setInboundForm(prev => ({ ...prev, remarks: e.target.value }))}
                    sx={{ mb: 3 }}
                  />
                  
                  <Button
                    variant="contained"
                    size="large"
                    onClick={submitInboundRecord}
                    disabled={loading}
                    sx={{ minWidth: 120 }}
                  >
                    저장
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>
          </CardContent>
        </Card>
        
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default InboundPage;