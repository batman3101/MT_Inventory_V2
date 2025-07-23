import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TablePagination
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { supabase } from '../utils/supabase';
import { exportToExcel, formatSuppliersDataForExcel } from '../utils/excelUtils';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

interface Supplier {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  country: string;
  website?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface PartPrice {
  part_id: string;
  part_code: string;
  part_name: string;
  unit_price: number;
  currency: string;
  effective_date: string;
  is_current: boolean;
}

interface ReceivingHistory {
  receiving_id: string;
  part_code: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  received_date: string;
  received_by: string;
}

const SuppliersPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    supplier_code: '',
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    country: '대한민국',
    website: '',
    status: 'active'
  });
  const [partPrices, setPartPrices] = useState<PartPrice[]>([]);
  const [receivingHistory, setReceivingHistory] = useState<ReceivingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailsExpanded, setDetailsExpanded] = useState<string | false>(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      loadPartPrices(selectedSupplier.supplier_id);
      loadReceivingHistory(selectedSupplier.supplier_id);
    }
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('공급업체 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '공급업체 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPartPrices = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('part_prices')
        .select(`
          *,
          parts(part_code, part_name)
        `)
        .eq('supplier_id', supplierId)
        .eq('is_current', true)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      
      const pricesWithParts = data?.map(price => ({
        ...price,
        part_code: price.parts?.part_code || '',
        part_name: price.parts?.part_name || ''
      })) || [];
      
      setPartPrices(pricesWithParts);
    } catch (error) {
      console.error('부품 가격 정보 로드 실패:', error);
    }
  };

  const loadReceivingHistory = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('receiving_details')
        .select(`
          *,
          parts(part_code, part_name),
          receiving(received_date, received_by)
        `)
        .eq('supplier_id', supplierId)
        .order('received_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const historyWithDetails = data?.map(detail => ({
        receiving_id: detail.receiving_id,
        part_code: detail.parts?.part_code || '',
        part_name: detail.parts?.part_name || '',
        quantity: detail.quantity,
        unit_price: detail.unit_price,
        total_amount: detail.quantity * detail.unit_price,
        received_date: detail.receiving?.received_date || '',
        received_by: detail.receiving?.received_by || ''
      })) || [];
      
      setReceivingHistory(historyWithDetails);
    } catch (error) {
      console.error('입고 이력 로드 실패:', error);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.supplier_code || !newSupplier.supplier_name) {
      setSnackbar({
        open: true,
        message: '공급업체 코드와 이름은 필수 입력 항목입니다.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // 공급업체 코드 중복 확인
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('supplier_id')
        .eq('supplier_code', newSupplier.supplier_code)
        .single();

      if (existingSupplier) {
        setSnackbar({
          open: true,
          message: '이미 존재하는 공급업체 코드입니다.',
          severity: 'error'
        });
        return;
      }

      const { error } = await supabase
        .from('suppliers')
        .insert({
          ...newSupplier,
          created_by: 'current_user' // 실제로는 현재 로그인한 사용자 ID
        });

      if (error) throw error;

      setSnackbar({
        open: true,
        message: '공급업체가 성공적으로 등록되었습니다.',
        severity: 'success'
      });
      
      setAddDialogOpen(false);
      setNewSupplier({
        supplier_code: '',
        supplier_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        country: '대한민국',
        website: '',
        status: 'active'
      });
      
      await loadSuppliers();
    } catch (error) {
      console.error('공급업체 등록 실패:', error);
      setSnackbar({
        open: true,
        message: '공급업체 등록에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('suppliers')
        .update({
          supplier_name: editingSupplier.supplier_name,
          contact_person: editingSupplier.contact_person,
          phone: editingSupplier.phone,
          email: editingSupplier.email,
          address: editingSupplier.address,
          country: editingSupplier.country,
          website: editingSupplier.website,
          status: editingSupplier.status,
          updated_at: new Date().toISOString()
        })
        .eq('supplier_id', editingSupplier.supplier_id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: '공급업체 정보가 성공적으로 수정되었습니다.',
        severity: 'success'
      });
      
      setEditingSupplier(null);
      setSelectedSupplier(editingSupplier);
      await loadSuppliers();
    } catch (error) {
      console.error('공급업체 수정 실패:', error);
      setSnackbar({
        open: true,
        message: '공급업체 정보 수정에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('supplier_id', selectedSupplier.supplier_id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: '공급업체가 성공적으로 삭제되었습니다.',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setSelectedSupplier(null);
      await loadSuppliers();
    } catch (error) {
      console.error('공급업체 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '공급업체 삭제에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (filteredSuppliers.length === 0) {
      setSnackbar({
        open: true,
        message: '내보낼 데이터가 없습니다.',
        severity: 'warning'
      });
      return;
    }

    try {
      const formattedData = formatSuppliersDataForExcel(filteredSuppliers);
      exportToExcel(formattedData, '공급업체목록');
      
      setSnackbar({
        open: true,
        message: '공급업체 목록이 Excel 파일로 내보내졌습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Excel 내보내기에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.supplier_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
    const matchesCountry = countryFilter === 'all' || supplier.country === countryFilter;
    
    return matchesSearch && matchesStatus && matchesCountry;
  });

  const paginatedSuppliers = filteredSuppliers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const uniqueCountries = Array.from(new Set(suppliers.map(s => s.country)));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BusinessIcon />
        공급업체 관리
      </Typography>

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="공급업체 검색" />
          <Tab label="공급업체 추가" />
          <Tab label="공급업체 상세" />
        </Tabs>
      </Paper>

      {/* 공급업체 검색 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                공급업체 목록
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={loadSuppliers}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                >
                  새로고침
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExportToExcel}
                  startIcon={<DownloadIcon />}
                >
                  Excel 내보내기
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setAddDialogOpen(true)}
                  startIcon={<AddIcon />}
                >
                  공급업체 추가
                </Button>
              </Box>
            </Box>
            
            {/* 필터 */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="공급업체명, 코드, 담당자로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={statusFilter}
                    label="상태"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>국가</InputLabel>
                  <Select
                    value={countryFilter}
                    label="국가"
                    onChange={(e) => setCountryFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {uniqueCountries.map(country => (
                      <MenuItem key={country} value={country}>{country}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {/* 공급업체 테이블 */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>공급업체 코드</TableCell>
                    <TableCell>공급업체명</TableCell>
                    <TableCell>담당자</TableCell>
                    <TableCell>연락처</TableCell>
                    <TableCell>국가</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>등록일</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSuppliers.map((supplier) => (
                    <TableRow key={supplier.supplier_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {supplier.supplier_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {supplier.supplier_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {supplier.contact_person || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {supplier.phone && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon fontSize="small" />
                              {supplier.phone}
                            </Typography>
                          )}
                          {supplier.email && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon fontSize="small" />
                              {supplier.email}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {supplier.country}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={supplier.status === 'active' ? '활성' : '비활성'}
                          color={supplier.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(supplier.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="상세 보기">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setTabValue(2);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={filteredSuppliers.length}
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
          </CardContent>
        </Card>
      </TabPanel>

      {/* 공급업체 추가 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              신규 공급업체 등록
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="공급업체 코드 *"
                  value={newSupplier.supplier_code}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, supplier_code: e.target.value }))}
                  helperText="고유한 공급업체 코드를 입력하세요"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="공급업체명 *"
                  value={newSupplier.supplier_name}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, supplier_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="담당자"
                  value={newSupplier.contact_person}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, contact_person: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="전화번호"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="이메일"
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="웹사이트"
                  value={newSupplier.website}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="주소"
                  multiline
                  rows={2}
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>국가</InputLabel>
                  <Select
                    value={newSupplier.country}
                    label="국가"
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, country: e.target.value }))}
                  >
                    <MenuItem value="대한민국">대한민국</MenuItem>
                    <MenuItem value="중국">중국</MenuItem>
                    <MenuItem value="일본">일본</MenuItem>
                    <MenuItem value="미국">미국</MenuItem>
                    <MenuItem value="독일">독일</MenuItem>
                    <MenuItem value="기타">기타</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={newSupplier.status}
                    label="상태"
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  >
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleAddSupplier}
                    disabled={loading}
                    startIcon={<SaveIcon />}
                  >
                    등록
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setNewSupplier({
                        supplier_code: '',
                        supplier_name: '',
                        contact_person: '',
                        phone: '',
                        email: '',
                        address: '',
                        country: '대한민국',
                        website: '',
                        status: 'active'
                      });
                    }}
                  >
                    초기화
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 공급업체 상세 탭 */}
      <TabPanel value={tabValue} index={2}>
        {selectedSupplier ? (
          <Grid container spacing={3}>
            {/* 기본 정보 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon />
                      기본 정보
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!editingSupplier && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => setEditingSupplier({ ...selectedSupplier })}
                        >
                          수정
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        삭제
                      </Button>
                    </Box>
                  </Box>
                  
                  {editingSupplier ? (
                    // 편집 모드
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="공급업체 코드"
                          value={editingSupplier.supplier_code}
                          disabled
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="공급업체명"
                          value={editingSupplier.supplier_name}
                          onChange={(e) => setEditingSupplier(prev => prev ? {
                            ...prev,
                            supplier_name: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="담당자"
                          value={editingSupplier.contact_person || ''}
                          onChange={(e) => setEditingSupplier(prev => prev ? {
                            ...prev,
                            contact_person: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="전화번호"
                          value={editingSupplier.phone || ''}
                          onChange={(e) => setEditingSupplier(prev => prev ? {
                            ...prev,
                            phone: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="이메일"
                          value={editingSupplier.email || ''}
                          onChange={(e) => setEditingSupplier(prev => prev ? {
                            ...prev,
                            email: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="웹사이트"
                          value={editingSupplier.website || ''}
                          onChange={(e) => setEditingSupplier(prev => prev ? {
                            ...prev,
                            website: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="주소"
                          multiline
                          rows={2}
                          value={editingSupplier.address || ''}
                          onChange={(e) => setEditingSupplier(prev => prev ? {
                            ...prev,
                            address: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>국가</InputLabel>
                          <Select
                            value={editingSupplier.country}
                            label="국가"
                            onChange={(e) => setEditingSupplier(prev => prev ? {
                              ...prev,
                              country: e.target.value
                            } : null)}
                          >
                            <MenuItem value="대한민국">대한민국</MenuItem>
                            <MenuItem value="중국">중국</MenuItem>
                            <MenuItem value="일본">일본</MenuItem>
                            <MenuItem value="미국">미국</MenuItem>
                            <MenuItem value="독일">독일</MenuItem>
                            <MenuItem value="기타">기타</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>상태</InputLabel>
                          <Select
                            value={editingSupplier.status}
                            label="상태"
                            onChange={(e) => setEditingSupplier(prev => prev ? {
                              ...prev,
                              status: e.target.value as 'active' | 'inactive'
                            } : null)}
                          >
                            <MenuItem value="active">활성</MenuItem>
                            <MenuItem value="inactive">비활성</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleUpdateSupplier}
                            disabled={loading}
                          >
                            저장
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => setEditingSupplier(null)}
                          >
                            취소
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    // 보기 모드
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          공급업체 코드
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedSupplier.supplier_code}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          공급업체명
                        </Typography>
                        <Typography variant="body1">
                          {selectedSupplier.supplier_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          담당자
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" />
                          {selectedSupplier.contact_person || '미등록'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          전화번호
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" />
                          {selectedSupplier.phone || '미등록'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          이메일
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon fontSize="small" />
                          {selectedSupplier.email || '미등록'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          웹사이트
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WebsiteIcon fontSize="small" />
                          {selectedSupplier.website ? (
                            <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer">
                              {selectedSupplier.website}
                            </a>
                          ) : '미등록'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          주소
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <LocationIcon fontSize="small" />
                          {selectedSupplier.address || '미등록'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          국가
                        </Typography>
                        <Typography variant="body1">
                          {selectedSupplier.country}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          상태
                        </Typography>
                        <Chip
                          label={selectedSupplier.status === 'active' ? '활성' : '비활성'}
                          color={selectedSupplier.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          등록일
                        </Typography>
                        <Typography variant="body1">
                          {new Date(selectedSupplier.created_at).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          수정일
                        </Typography>
                        <Typography variant="body1">
                          {new Date(selectedSupplier.updated_at).toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* 공급 부품 정보 */}
            <Grid item xs={12}>
              <Accordion
                expanded={detailsExpanded === 'parts'}
                onChange={(_, isExpanded) => setDetailsExpanded(isExpanded ? 'parts' : false)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InventoryIcon />
                    공급 부품 정보 ({partPrices.length}개)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {partPrices.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>부품 코드</TableCell>
                            <TableCell>부품명</TableCell>
                            <TableCell>단가</TableCell>
                            <TableCell>통화</TableCell>
                            <TableCell>적용일</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {partPrices.map((price, index) => (
                            <TableRow key={index}>
                              <TableCell>{price.part_code}</TableCell>
                              <TableCell>{price.part_name}</TableCell>
                              <TableCell>{price.unit_price.toLocaleString()}</TableCell>
                              <TableCell>{price.currency}</TableCell>
                              <TableCell>{new Date(price.effective_date).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      등록된 부품 가격 정보가 없습니다.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            {/* 최근 입고 이력 */}
            <Grid item xs={12}>
              <Accordion
                expanded={detailsExpanded === 'history'}
                onChange={(_, isExpanded) => setDetailsExpanded(isExpanded ? 'history' : false)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon />
                    최근 입고 이력 ({receivingHistory.length}건)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {receivingHistory.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>부품 코드</TableCell>
                            <TableCell>부품명</TableCell>
                            <TableCell>수량</TableCell>
                            <TableCell>단가</TableCell>
                            <TableCell>총액</TableCell>
                            <TableCell>입고일</TableCell>
                            <TableCell>입고자</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {receivingHistory.map((history, index) => (
                            <TableRow key={index}>
                              <TableCell>{history.part_code}</TableCell>
                              <TableCell>{history.part_name}</TableCell>
                              <TableCell>{history.quantity.toLocaleString()}</TableCell>
                              <TableCell>{history.unit_price.toLocaleString()}</TableCell>
                              <TableCell>{history.total_amount.toLocaleString()}</TableCell>
                              <TableCell>{new Date(history.received_date).toLocaleDateString()}</TableCell>
                              <TableCell>{history.received_by}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      입고 이력이 없습니다.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            공급업체를 선택하여 상세 정보를 확인하세요.
          </Alert>
        )}
      </TabPanel>

      {/* 공급업체 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          신규 공급업체 등록
        </DialogTitle>
        <DialogContent>
          {/* 여기에 추가 폼 내용 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" onClick={handleAddSupplier} disabled={loading}>
            등록
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          공급업체 삭제 확인
        </DialogTitle>
        <DialogContent>
          <Typography>
            '{selectedSupplier?.supplier_name}' 공급업체를 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            취소
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteSupplier} disabled={loading}>
            삭제
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
  );
};

export default SuppliersPage;