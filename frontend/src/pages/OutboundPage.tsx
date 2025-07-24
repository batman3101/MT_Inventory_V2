import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
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
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Autocomplete,
  TablePagination,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Assessment as ReportIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Inventory as InventoryIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/utils/supabase';
import { exportToExcel, formatOutboundDataForExcel } from '../utils/excelUtils';

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
      id={`outbound-tabpanel-${index}`}
      aria-labelledby={`outbound-tab-${index}`}
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

interface OutboundRecord {
  outbound_id: number;
  part_code: string;
  part_name: string;
  quantity: number;
  unit: string;
  outbound_date: string;
  requester: string;
  department: string;
  equipment_id?: string;
  purpose: string;
  reference_number: string;
  created_by: string;
}

interface Part {
  part_id: number;
  part_code: string;
  part_name: string;
  unit: string;
  min_stock: number;
}

interface Department {
  department_id: number;
  department_name: string;
}

interface InventoryInfo {
  current_quantity: number;
}

const OutboundPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // 검색 관련 상태
  const [searchFilters, setSearchFilters] = useState({
    dateRange: 'all',
    startDate: null as Date | null,
    endDate: null as Date | null,
    partCode: '',
    department: 'all',
    requester: ''
  });
  const [outboundRecords, setOutboundRecords] = useState<OutboundRecord[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 등록 관련 상태
  const [parts, setParts] = useState<Part[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [inventoryInfo, setInventoryInfo] = useState<InventoryInfo | null>(null);
  const [outboundForm, setOutboundForm] = useState({
    quantity: 1,
    outbound_date: new Date(),
    requester: '',
    department_id: '',
    equipment_id: '',
    purpose: '',
    custom_purpose: '',
    remarks: ''
  });
  const [referenceNumber, setReferenceNumber] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '' });

  const purposeOptions = [
    '정기 교체',
    '고장 수리', 
    '예방 정비',
    '비상 수리',
    '테스트',
    '기타'
  ];

  const dateRangeOptions = [
    { value: 'all', label: '전체' },
    { value: 'today', label: '오늘' },
    { value: 'week', label: '최근 7일' },
    { value: 'month', label: '이번 달' },
    { value: 'custom', label: '직접 선택' }
  ];

  // 데이터 로딩
  useEffect(() => {
    loadParts();
    loadDepartments();
    generateReferenceNumber();
  }, []);

  useEffect(() => {
    if (selectedPart) {
      loadInventoryInfo(selectedPart.part_id);
    }
  }, [selectedPart]);

  const loadParts = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('part_id, part_code, part_name, unit, min_stock')
        .order('part_code');
      
      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('부품 데이터 로드 오류:', error);
      showSnackbar('부품 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('department_id, department_name')
        .order('department_name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('부서 데이터 로드 오류:', error);
      showSnackbar('부서 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    }
  };

  const loadInventoryInfo = async (partId: number) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('current_quantity')
        .eq('part_id', partId)
        .single();
      
      if (error) throw error;
      setInventoryInfo(data);
    } catch (error) {
      console.error('재고 정보 로드 오류:', error);
      setInventoryInfo(null);
    }
  };

  const generateReferenceNumber = async () => {
    try {
      const today = format(new Date(), 'yyyyMMdd');
      const prefix = `OUT-${today}`;
      
      const { data, error } = await supabase
        .from('outbound')
        .select('reference_number')
        .ilike('reference_number', `${prefix}%`)
        .order('reference_number', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastRef = data[0].reference_number;
        const lastNum = parseInt(lastRef.split('-')[2] || '0');
        nextNumber = lastNum + 1;
      }
      
      setReferenceNumber(`${prefix}-${nextNumber.toString().padStart(3, '0')}`);
    } catch (error) {
      console.error('참조번호 생성 오류:', error);
      const today = format(new Date(), 'yyyyMMdd');
      setReferenceNumber(`OUT-${today}-001`);
    }
  };

  const searchOutboundRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('outbound')
        .select(`
          outbound_id,
          outbound_date,
          quantity,
          requester,
          equipment,
          reason,
          reference_number,
          created_by,
          part_code,
          part_name,
          department_name,
          part_unit
        `);

      // 날짜 필터
      if (searchFilters.dateRange !== 'all') {
        let startDate: Date;
        let endDate: Date;
        
        switch (searchFilters.dateRange) {
          case 'today':
            startDate = new Date();
            endDate = new Date();
            break;
          case 'week':
            startDate = subDays(new Date(), 7);
            endDate = new Date();
            break;
          case 'month':
            startDate = startOfMonth(new Date());
            endDate = endOfMonth(new Date());
            break;
          case 'custom':
            if (searchFilters.startDate && searchFilters.endDate) {
              startDate = searchFilters.startDate;
              endDate = searchFilters.endDate;
            } else {
              startDate = new Date();
              endDate = new Date();
            }
            break;
          default:
            startDate = new Date();
            endDate = new Date();
        }
        
        query = query
          .gte('outbound_date', format(startDate, 'yyyy-MM-dd'))
          .lte('outbound_date', format(endDate, 'yyyy-MM-dd'));
      }

      // 부품 코드 필터
      if (searchFilters.partCode) {
        query = query.ilike('part_code', `%${searchFilters.partCode}%`);
      }

      // 요청자 필터
      if (searchFilters.requester) {
        query = query.ilike('requester', `%${searchFilters.requester}%`);
      }

      const { data, error } = await query.order('outbound_date', { ascending: false });
      
      if (error) throw error;
      
      const formattedData: OutboundRecord[] = (data || []).map(item => ({
        outbound_id: item.outbound_id,
        part_code: item.part_code || '',
        part_name: item.part_name || '',
        quantity: item.quantity,
        unit: item.part_unit || 'EA',
        outbound_date: item.outbound_date,
        requester: item.requester,
        department: item.department_name || '',
        equipment_id: item.equipment || '',
        purpose: item.reason || '',
        reference_number: item.reference_number,
        created_by: item.created_by
      }));
      
      setOutboundRecords(formattedData);
      setPage(0);
      
      showSnackbar(`검색 결과: ${formattedData.length}건`, 'info');
    } catch (error) {
      console.error('출고 이력 검색 오류:', error);
      showSnackbar('출고 이력 검색 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOutboundSubmit = async () => {
    // 유효성 검사
    if (!selectedPart) {
      showSnackbar('부품을 선택해주세요.', 'error');
      return;
    }
    if (outboundForm.quantity <= 0) {
      showSnackbar('수량은 1 이상이어야 합니다.', 'error');
      return;
    }
    if (!outboundForm.requester) {
      showSnackbar('요청자를 입력해주세요.', 'error');
      return;
    }
    if (!outboundForm.department_id) {
      showSnackbar('부서를 선택해주세요.', 'error');
      return;
    }
    if (!outboundForm.purpose) {
      showSnackbar('용도를 선택해주세요.', 'error');
      return;
    }
    if (outboundForm.purpose === '기타' && !outboundForm.custom_purpose) {
      showSnackbar('기타 용도를 입력해주세요.', 'error');
      return;
    }

    // 재고 확인
    if (inventoryInfo && outboundForm.quantity > inventoryInfo.current_quantity) {
      setConfirmDialog({
        open: true,
        message: `재고 부족 경고: 현재 재고(${inventoryInfo.current_quantity})보다 많은 수량(${outboundForm.quantity})을 출고하려 합니다. 계속하시겠습니까?`
      });
      return;
    }

    await saveOutbound();
  };

  const saveOutbound = async () => {
    if (!selectedPart) return;
    
    setLoading(true);
    try {
      const purpose = outboundForm.purpose === '기타' ? outboundForm.custom_purpose : outboundForm.purpose;
      
      // 출고 데이터 저장
      const outboundData = {
        part_id: selectedPart.part_id,
        quantity: outboundForm.quantity,
        outbound_date: format(outboundForm.outbound_date, 'yyyy-MM-dd'),
        requester: outboundForm.requester,
        department_id: parseInt(outboundForm.department_id),
        equipment: outboundForm.equipment_id,
        reason: purpose,
        reference_number: referenceNumber,
        notes: outboundForm.remarks,
        created_by: 'current_user', // 실제로는 현재 사용자 정보
        part_code: selectedPart.part_code,
        part_name: selectedPart.part_name,
        department_name: departments.find(d => d.department_id.toString() === outboundForm.department_id)?.department_name || '',
        part_unit: selectedPart.unit
      };

      const { error: outboundError } = await supabase
        .from('outbound')
        .insert([outboundData]);

      if (outboundError) throw outboundError;

      // 재고 업데이트
      if (inventoryInfo) {
        const newQuantity = Math.max(0, inventoryInfo.current_quantity - outboundForm.quantity);
        
        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({
            current_quantity: newQuantity,
            updated_at: new Date().toISOString(),
            updated_by: 'current_user'
          })
          .eq('part_id', selectedPart.part_id);

        if (inventoryError) throw inventoryError;
      }

      showSnackbar(
        `새 출고 정보가 등록되었습니다. (부품: ${selectedPart.part_code}, 수량: ${outboundForm.quantity})`,
        'success'
      );
      
      // 폼 초기화
      resetForm();
      generateReferenceNumber();
      
    } catch (error) {
      console.error('출고 등록 오류:', error);
      showSnackbar('출고 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, message: '' });
    }
  };

  const resetForm = () => {
    setSelectedPart(null);
    setInventoryInfo(null);
    setOutboundForm({
      quantity: 1,
      outbound_date: new Date(),
      requester: '',
      department_id: '',
      equipment_id: '',
      purpose: '',
      custom_purpose: '',
      remarks: ''
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const exportToExcel = () => {
    if (outboundRecords.length === 0) {
      showSnackbar('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    try {
      const formattedData = formatOutboundDataForExcel(outboundRecords);
      exportToExcel({
        filename: '출고기록',
        sheetName: '출고 이력',
        data: formattedData
      });
      showSnackbar('Excel 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      showSnackbar('Excel 파일 내보내기 중 오류가 발생했습니다.', 'error');
    }
  };

  const generateReport = () => {
    // 보고서 생성 로직
    showSnackbar('보고서가 생성되었습니다.', 'success');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              📦 출고 관리
            </Typography>
            <Typography variant="body1" color="text.secondary">
              부품 출고 이력 조회 및 신규 출고 등록
            </Typography>
          </Box>
          
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab 
              icon={<SearchIcon />} 
              label="출고 이력 검색" 
              id="outbound-tab-0"
              aria-controls="outbound-tabpanel-0"
            />
            <Tab 
              icon={<AddIcon />} 
              label="신규 출고 등록" 
              id="outbound-tab-1"
              aria-controls="outbound-tabpanel-1"
            />
          </Tabs>
        </Paper>

        {/* 출고 이력 검색 탭 */}
        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🔍 검색 조건
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>기간 선택</InputLabel>
                  <Select
                    value={searchFilters.dateRange}
                    label="기간 선택"
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  >
                    {dateRangeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="부품 코드 검색"
                  placeholder="MT001"
                  value={searchFilters.partCode}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, partCode: e.target.value }))}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              
              {searchFilters.dateRange === 'custom' && (
                <>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="시작일"
                      value={searchFilters.startDate}
                      onChange={(date) => setSearchFilters(prev => ({ ...prev, startDate: date }))}
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
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
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="요청자 검색"
                  placeholder="홍길동"
                  value={searchFilters.requester}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, requester: e.target.value }))}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                    onClick={searchOutboundRecords}
                    disabled={loading}
                  >
                    검색
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={exportToExcel}
                    disabled={outboundRecords.length === 0}
                  >
                    Excel 내보내기
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ReportIcon />}
                    onClick={generateReport}
                    disabled={outboundRecords.length === 0}
                  >
                    보고서 생성
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* 검색 결과 */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>출고 ID</TableCell>
                    <TableCell>부품 코드</TableCell>
                    <TableCell>부품명</TableCell>
                    <TableCell>수량</TableCell>
                    <TableCell>단위</TableCell>
                    <TableCell>출고일</TableCell>
                    <TableCell>요청자</TableCell>
                    <TableCell>부서</TableCell>
                    <TableCell>설비 ID</TableCell>
                    <TableCell>용도</TableCell>
                    <TableCell>참조번호</TableCell>
                    <TableCell>등록자</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outboundRecords
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((record) => (
                    <TableRow key={record.outbound_id}>
                      <TableCell>{record.outbound_id}</TableCell>
                      <TableCell>
                        <Chip label={record.part_code} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{record.part_name}</TableCell>
                      <TableCell>{record.quantity.toLocaleString()}</TableCell>
                      <TableCell>{record.unit}</TableCell>
                      <TableCell>{format(new Date(record.outbound_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{record.requester}</TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.equipment_id || '-'}</TableCell>
                      <TableCell>{record.purpose}</TableCell>
                      <TableCell>
                        <Chip label={record.reference_number} size="small" />
                      </TableCell>
                      <TableCell>{record.created_by}</TableCell>
                    </TableRow>
                  ))}
                  {outboundRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          검색 결과가 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={outboundRecords.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="페이지당 행 수:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
          </Paper>
        </TabPanel>

        {/* 신규 출고 등록 탭 */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ➕ 신규 출고 등록
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={parts}
                  getOptionLabel={(option) => `${option.part_code} - ${option.part_name}`}
                  value={selectedPart}
                  onChange={(_, newValue) => setSelectedPart(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="부품 선택 *"
                      placeholder="부품을 검색하세요"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InventoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
                
                {selectedPart && inventoryInfo && (
                  <Card sx={{ mt: 2 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        단위: {selectedPart.unit} | 
                        현재 재고: {inventoryInfo.current_quantity.toLocaleString()} | 
                        최소 재고: {selectedPart.min_stock.toLocaleString()}
                      </Typography>
                      {inventoryInfo.current_quantity <= selectedPart.min_stock && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          재고가 최소 수준 이하입니다!
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="수량 *"
                  value={outboundForm.quantity}
                  onChange={(e) => setOutboundForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>부서 선택 *</InputLabel>
                  <Select
                    value={outboundForm.department_id}
                    label="부서 선택 *"
                    onChange={(e) => setOutboundForm(prev => ({ ...prev, department_id: e.target.value }))}
                    startAdornment={<BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept.department_id} value={dept.department_id.toString()}>
                        {dept.department_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="요청자 *"
                  placeholder="홍길동"
                  value={outboundForm.requester}
                  onChange={(e) => setOutboundForm(prev => ({ ...prev, requester: e.target.value }))}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="출고일 *"
                  value={outboundForm.outbound_date}
                  onChange={(date) => setOutboundForm(prev => ({ ...prev, outbound_date: date || new Date() }))}
                  slotProps={{
                    textField: { 
                      fullWidth: true,
                      InputProps: {
                        startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="설비 ID"
                  placeholder="EQ-001"
                  value={outboundForm.equipment_id}
                  onChange={(e) => setOutboundForm(prev => ({ ...prev, equipment_id: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="참조번호"
                  value={referenceNumber}
                  disabled
                  helperText="자동 생성됩니다"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>용도 *</InputLabel>
                  <Select
                    value={outboundForm.purpose}
                    label="용도 *"
                    onChange={(e) => setOutboundForm(prev => ({ ...prev, purpose: e.target.value }))}
                  >
                    {purposeOptions.map(purpose => (
                      <MenuItem key={purpose} value={purpose}>
                        {purpose}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {outboundForm.purpose === '기타' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="기타 용도 입력 *"
                    value={outboundForm.custom_purpose}
                    onChange={(e) => setOutboundForm(prev => ({ ...prev, custom_purpose: e.target.value }))}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="비고"
                  placeholder="특이사항 입력"
                  value={outboundForm.remarks}
                  onChange={(e) => setOutboundForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                    onClick={handleOutboundSubmit}
                    disabled={loading}
                    size="large"
                  >
                    출고 등록
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={resetForm}
                    disabled={loading}
                    size="large"
                  >
                    초기화
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        {/* 확인 다이얼로그 */}
        <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, message: '' })}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              재고 부족 경고
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ open: false, message: '' })}>
              취소
            </Button>
            <Button onClick={saveOutbound} variant="contained" color="warning">
              출고 진행
            </Button>
          </DialogActions>
        </Dialog>

        {/* 스낵바 */}
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

export default OutboundPage;