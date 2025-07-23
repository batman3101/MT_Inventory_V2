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
  IconButton,
  Autocomplete,
  CircularProgress,
  Pagination,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Assessment as ReportIcon,
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { supabase } from '../utils/supabase';
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
    dateRange: '',
    partCode: '',
    supplier: 'all',
    startDate: null as Date | null,
    endDate: null as Date | null
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
        .from('inbound_view')
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
        currency: 'VND',
        invoice_number: referenceNumber,
        notes: inboundForm.remarks,
        created_by: 'current_user' // TODO: 실제 사용자 정보로 교체
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
    if (inboundRecords.length === 0) {
      showSnackbar('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    // CSV 형태로 데이터 변환
    const csvData = inboundRecords.map(record => ({
      '입고ID': record.inbound_id,
      '부품코드': record.part_code,
      '부품명': record.part_name,
      '수량': record.quantity,
      '단위': record.part_unit,
      '입고일': record.inbound_date,
      '공급업체': record.supplier_name,
      '단가': record.unit_price,
      '총액': record.total_price,
      '통화': record.currency,
      '참조번호': record.reference_number,
      '등록자': record.created_by
    }));

    // CSV 문자열 생성
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');

    // 파일 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `입고기록_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSnackbar('Excel 파일이 다운로드되었습니다.', 'success');
  };

  const generateReport = () => {
    if (inboundRecords.length === 0) {
      showSnackbar('보고서를 생성할 데이터가 없습니다.', 'warning');
      return;
    }

    // 보고서 데이터 계산
    const totalQuantity = inboundRecords.reduce((sum, record) => sum + record.quantity, 0);
    const totalAmount = inboundRecords.reduce((sum, record) => sum + record.total_price, 0);
    const uniqueParts = new Set(inboundRecords.map(record => record.part_code)).size;
    const uniqueSuppliers = new Set(inboundRecords.map(record => record.supplier_name)).size;

    const reportContent = `
입고 관리 보고서
생성일: ${new Date().toLocaleDateString()}

=== 요약 정보 ===
총 입고 건수: ${inboundRecords.length}건
총 입고 수량: ${totalQuantity.toLocaleString()}개
총 입고 금액: ${formatCurrency(totalAmount)}
입고 부품 종류: ${uniqueParts}종
공급업체 수: ${uniqueSuppliers}개

=== 상세 내역 ===
${inboundRecords.map(record => 
  `입고ID: ${record.inbound_id}, 부품: ${record.part_code} (${record.part_name}), 수량: ${record.quantity}, 공급업체: ${record.supplier_name}, 입고일: ${record.inbound_date}`
).join('\n')}
    `;

    // 텍스트 파일 다운로드
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `입고보고서_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSnackbar('보고서가 생성되었습니다.', 'success');
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: 2, 
            bgcolor: '#1976d2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mr: 2
          }}>
            <AddIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 0.5 }}>
              입고 관리
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              부품 입고 이력 조회 및 신규 입고 등록
            </Typography>
          </Box>
        </Box>
        
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{ 
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '1rem',
                  fontWeight: 500
                },
                '& .Mui-selected': {
                  color: '#1976d2 !important',
                  fontWeight: 'bold'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1976d2',
                  height: 3
                }
              }}
            >
              <Tab 
                icon={<SearchIcon />} 
                label="입고 이력 검색" 
                iconPosition="start"
              />
              <Tab 
                icon={<AddIcon />} 
                label="신규 입고 등록" 
                iconPosition="start"
              />
            </Tabs>
          </Box>
          
          <CardContent sx={{ p: 3 }}>
            
            <TabPanel value={tabValue} index={0}>
              {/* 검색 탭 */}
              <Typography variant="h6" gutterBottom>
                입고 이력 검색
              </Typography>
              
              <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                  🔍 검색 조건
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
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
                        <MenuItem value="전체">전체</MenuItem>
                        <MenuItem value="오늘">오늘</MenuItem>
                        <MenuItem value="최근 7일">최근 7일</MenuItem>
                        <MenuItem value="이번 달">이번 달</MenuItem>
                        <MenuItem value="직접 선택">직접 선택</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {searchFilters.dateRange === '직접 선택' && (
                    <>
                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="시작일"
                          value={searchFilters.startDate}
                          onChange={(date) => setSearchFilters(prev => ({ ...prev, startDate: date }))}
                          slotProps={{
                            textField: { fullWidth: true }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="종료일"
                          value={searchFilters.endDate}
                          onChange={(date) => setSearchFilters(prev => ({ ...prev, endDate: date }))}
                          slotProps={{
                            textField: { fullWidth: true }
                          }}
                        />
                      </Grid>
                    </>
                  )}
                  
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="부품 코드 검색"
                      value={searchFilters.partCode}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, partCode: e.target.value }))}
                      placeholder="MT001"
                      helperText="부품 코드로 검색"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>공급업체 선택</InputLabel>
                      <Select
                        value={searchFilters.supplier}
                        label="공급업체 선택"
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, supplier: e.target.value }))}
                      >
                        <MenuItem value="전체">전체</MenuItem>
                        <MenuItem value="SAMSOO">SAMSOO</MenuItem>
                        <MenuItem value="RPS">RPS</MenuItem>
                        <MenuItem value="THT">THT</MenuItem>
                        <MenuItem value="FC TECH">FC TECH</MenuItem>
                        <MenuItem value="HTT">HTT</MenuItem>
                        <MenuItem value="ATH">ATH</MenuItem>
                        <MenuItem value="UIL">UIL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<SearchIcon />}
                        onClick={searchInboundRecords}
                        disabled={loading}
                      >
                        검색
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={exportToExcel}
                        disabled={inboundRecords.length === 0}
                      >
                        Excel 내보내기
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ReportIcon />}
                        onClick={generateReport}
                        disabled={inboundRecords.length === 0}
                      >
                        보고서 생성
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
              
              {inboundRecords.length === 0 && searchFilters.dateRange && (
                 <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#fafafa', border: '1px dashed #ddd' }}>
                   <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                   <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
                     검색 결과가 없습니다
                   </Typography>
                   <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                     다른 검색 조건을 시도해보세요
                   </Typography>
                 </Paper>
               )}
               
               {!searchFilters.dateRange && (
                 <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                   <SearchIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
                   <Typography variant="h6" sx={{ mb: 1, color: '#1976d2' }}>
                     입고 이력 검색
                   </Typography>
                   <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                     검색 조건을 설정하고 검색 버튼을 클릭하세요
                   </Typography>
                 </Paper>
               )}
              
              {inboundRecords.length > 0 && (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        📊 검색 결과: {inboundRecords.length}건 | 총액: {formatCurrency(inboundRecords.reduce((sum, record) => sum + record.total_price, 0))}
                      </Typography>
                    </Box>
                  </Alert>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={exportToExcel}
                      sx={{ 
                        bgcolor: '#4caf50',
                        '&:hover': { bgcolor: '#45a049' }
                      }}
                    >
                      📥 Excel 저장
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ReportIcon />}
                      onClick={generateReport}
                      sx={{ 
                        borderColor: '#ff9800',
                        color: '#ff9800',
                        '&:hover': { 
                          borderColor: '#f57c00',
                          color: '#f57c00',
                          bgcolor: '#fff3e0'
                        }
                      }}
                    >
                      📊 보고서 생성
                    </Button>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>입고 ID</strong></TableCell>
                          <TableCell><strong>부품 코드</strong></TableCell>
                          <TableCell><strong>부품명</strong></TableCell>
                          <TableCell><strong>수량</strong></TableCell>
                          <TableCell><strong>단위</strong></TableCell>
                          <TableCell><strong>입고일</strong></TableCell>
                          <TableCell><strong>공급업체</strong></TableCell>
                          <TableCell><strong>단가</strong></TableCell>
                          <TableCell><strong>총액</strong></TableCell>
                          <TableCell><strong>참조번호</strong></TableCell>
                          <TableCell><strong>등록자</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inboundRecords.map((record) => (
                          <TableRow key={record.inbound_id} hover>
                            <TableCell>
                              <Chip 
                                label={record.inbound_id} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {record.part_code}
                              </Typography>
                            </TableCell>
                            <TableCell>{record.part_name}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {record.quantity.toLocaleString()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {record.part_unit}
                              </Typography>
                            </TableCell>
                            <TableCell>{record.inbound_date}</TableCell>
                            <TableCell>
                              <Chip 
                                label={record.supplier_name} 
                                size="small" 
                                color="secondary"
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(record.unit_price)}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {formatCurrency(record.total_price)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={record.reference_number} 
                                size="small" 
                                color="info" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{record.created_by}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      총 {inboundRecords.length}건의 입고 기록
                    </Typography>
                    <Pagination 
                      count={Math.ceil(inboundRecords.length / 10)} 
                      page={1} 
                      color="primary" 
                    />
                  </Box>
                </>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              {/* 등록 탭 */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddIcon color="primary" />
                  신규 입고 등록
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={parts}
                      getOptionLabel={(option) => `${option.part_code} - ${option.part_name}`}
                      value={parts.find(p => p.part_id === inboundForm.selectedPart) || null}
                      onChange={(_, newValue) => setInboundForm(prev => ({ ...prev, selectedPart: newValue?.part_id || '' }))}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="부품 선택 *"
                          placeholder="부품을 검색하세요"
                          required
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {option.part_code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.part_name}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      sx={{ mb: 3 }}
                    />
                    {currentStock !== null && (
                      <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          현재 재고: {currentStock.toLocaleString()} {parts.find(p => p.part_id === inboundForm.selectedPart)?.unit || ''}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="수량 *"
                      type="number"
                      value={inboundForm.quantity}
                      onChange={(e) => setInboundForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      required
                      inputProps={{ min: 1 }}
                      helperText={inboundForm.selectedPart ? `단위: ${parts.find(p => p.part_id === inboundForm.selectedPart)?.unit || ''}` : ''}
                      sx={{ mb: 3 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>공급업체 선택 *</InputLabel>
                      <Select
                        value={inboundForm.selectedSupplier}
                        label="공급업체 선택 *"
                        onChange={(e) => setInboundForm(prev => ({ ...prev, selectedSupplier: e.target.value }))}
                        required
                      >
                        {suppliers.map(supplier => (
                          <MenuItem key={supplier.supplier_id} value={supplier.supplier_id}>
                            {supplier.supplier_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="단가 *"
                      type="number"
                      value={inboundForm.unitPrice}
                      onChange={(e) => setInboundForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      required
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        endAdornment: <Typography variant="caption">VND</Typography>
                      }}
                      sx={{ mb: 3 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="입고일 *"
                      value={inboundForm.inboundDate}
                      onChange={(date) => setInboundForm(prev => ({ ...prev, inboundDate: date || new Date() }))}
                      slotProps={{
                        textField: { fullWidth: true, required: true, sx: { mb: 3 } }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="참조번호"
                      value={referenceNumber}
                      InputProps={{
                        readOnly: true
                      }}
                      helperText="시스템에서 자동으로 생성됩니다"
                      sx={{ mb: 3 }}
                    />
                  </Grid>
                  
                  {inboundForm.quantity && inboundForm.unitPrice && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
                        <Typography variant="h6" color="primary">
                          총 입고 금액: {formatCurrency(inboundForm.quantity * inboundForm.unitPrice)}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="비고"
                      multiline
                      rows={3}
                      value={inboundForm.remarks}
                      onChange={(e) => setInboundForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="추가 정보를 입력하세요"
                      sx={{ mb: 3 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          setInboundForm({
                            selectedPart: '',
                            selectedSupplier: '',
                            quantity: 1,
                            inboundDate: new Date(),
                            unitPrice: 0,
                            remarks: ''
                          });
                          setCurrentStock(null);
                        }}
                        disabled={loading}
                      >
                        초기화
                      </Button>
                      
                      <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                        onClick={submitInboundRecord}
                        disabled={loading || !inboundForm.selectedPart || !inboundForm.selectedSupplier || !inboundForm.unitPrice}
                        size="large"
                      >
                        {loading ? '등록 중...' : '입고 등록'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
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