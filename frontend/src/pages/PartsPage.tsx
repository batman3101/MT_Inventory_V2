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
  TablePagination,
  Avatar,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Build as BuildIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { supabase } from '../utils/supabase';

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

interface Part {
  part_id: string;
  part_code: string;
  part_name: string;
  description?: string;
  category: string;
  unit: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  standard_cost: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface PartWithInventory extends Part {
  current_stock: number;
  stock_value: number;
  last_received_date?: string;
  last_issued_date?: string;
  stock_status: 'normal' | 'low' | 'critical' | 'overstock';
}

interface PartPrice {
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  currency: string;
  effective_date: string;
  is_current: boolean;
}

interface StockMovement {
  movement_id: string;
  movement_type: 'in' | 'out';
  quantity: number;
  unit_price?: number;
  reference_type: 'receiving' | 'issue' | 'adjustment';
  reference_id: string;
  movement_date: string;
  notes?: string;
  created_by: string;
}

const PartsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [parts, setParts] = useState<PartWithInventory[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartWithInventory | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [newPart, setNewPart] = useState<Partial<Part>>({
    part_code: '',
    part_name: '',
    description: '',
    category: '',
    unit: 'EA',
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_point: 0,
    standard_cost: 0,
    status: 'active'
  });
  const [partPrices, setPartPrices] = useState<PartPrice[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailsExpanded, setDetailsExpanded] = useState<string | false>(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadParts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedPart) {
      loadPartPrices(selectedPart.part_id);
      loadStockMovements(selectedPart.part_id);
    }
  }, [selectedPart]);

  const loadParts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parts')
        .select(`
          *,
          inventory(
            current_stock,
            last_received_date,
            last_issued_date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const partsWithInventory = data?.map(part => {
        const inventory = part.inventory?.[0] || { current_stock: 0 };
        const stockValue = inventory.current_stock * part.standard_cost;
        
        let stockStatus: 'normal' | 'low' | 'critical' | 'overstock' = 'normal';
        if (inventory.current_stock <= 0) {
          stockStatus = 'critical';
        } else if (inventory.current_stock <= part.reorder_point) {
          stockStatus = 'low';
        } else if (inventory.current_stock > part.max_stock_level) {
          stockStatus = 'overstock';
        }
        
        return {
          ...part,
          current_stock: inventory.current_stock,
          stock_value: stockValue,
          last_received_date: inventory.last_received_date,
          last_issued_date: inventory.last_issued_date,
          stock_status: stockStatus
        };
      }) || [];
      
      setParts(partsWithInventory);
    } catch (error) {
      console.error('부품 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '부품 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;
      
      const uniqueCategories = Array.from(new Set(data?.map(item => item.category) || []));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('카테고리 로드 실패:', error);
    }
  };

  const loadPartPrices = async (partId: string) => {
    try {
      const { data, error } = await supabase
        .from('part_prices')
        .select(`
          *,
          suppliers(supplier_name)
        `)
        .eq('part_id', partId)
        .eq('is_current', true)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      
      const pricesWithSuppliers = data?.map(price => ({
        ...price,
        supplier_name: price.suppliers?.supplier_name || ''
      })) || [];
      
      setPartPrices(pricesWithSuppliers);
    } catch (error) {
      console.error('부품 가격 정보 로드 실패:', error);
    }
  };

  const loadStockMovements = async (partId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('part_id', partId)
        .order('movement_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setStockMovements(data || []);
    } catch (error) {
      console.error('재고 이동 이력 로드 실패:', error);
    }
  };

  const handleAddPart = async () => {
    if (!newPart.part_code || !newPart.part_name || !newPart.category) {
      setSnackbar({
        open: true,
        message: '부품 코드, 부품명, 카테고리는 필수 입력 항목입니다.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // 부품 코드 중복 확인
      const { data: existingPart } = await supabase
        .from('parts')
        .select('part_id')
        .eq('part_code', newPart.part_code)
        .single();

      if (existingPart) {
        setSnackbar({
          open: true,
          message: '이미 존재하는 부품 코드입니다.',
          severity: 'error'
        });
        return;
      }

      const { error } = await supabase
        .from('parts')
        .insert({
          ...newPart,
          created_by: 'current_user' // 실제로는 현재 로그인한 사용자 ID
        });

      if (error) throw error;

      setSnackbar({
        open: true,
        message: '부품이 성공적으로 등록되었습니다.',
        severity: 'success'
      });
      
      setAddDialogOpen(false);
      setNewPart({
        part_code: '',
        part_name: '',
        description: '',
        category: '',
        unit: 'EA',
        min_stock_level: 0,
        max_stock_level: 0,
        reorder_point: 0,
        standard_cost: 0,
        status: 'active'
      });
      
      await loadParts();
      await loadCategories();
    } catch (error) {
      console.error('부품 등록 실패:', error);
      setSnackbar({
        open: true,
        message: '부품 등록에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePart = async () => {
    if (!editingPart) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('parts')
        .update({
          part_name: editingPart.part_name,
          description: editingPart.description,
          category: editingPart.category,
          unit: editingPart.unit,
          min_stock_level: editingPart.min_stock_level,
          max_stock_level: editingPart.max_stock_level,
          reorder_point: editingPart.reorder_point,
          standard_cost: editingPart.standard_cost,
          status: editingPart.status,
          updated_at: new Date().toISOString()
        })
        .eq('part_id', editingPart.part_id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: '부품 정보가 성공적으로 수정되었습니다.',
        severity: 'success'
      });
      
      setEditingPart(null);
      await loadParts();
      await loadCategories();
    } catch (error) {
      console.error('부품 수정 실패:', error);
      setSnackbar({
        open: true,
        message: '부품 정보 수정에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePart = async () => {
    if (!selectedPart) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('part_id', selectedPart.part_id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: '부품이 성공적으로 삭제되었습니다.',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setSelectedPart(null);
      await loadParts();
      await loadCategories();
    } catch (error) {
      console.error('부품 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '부품 삭제에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const csvContent = [
        ['부품 코드', '부품명', '카테고리', '단위', '현재고', '재고가치', '최소재고', '최대재고', '재주문점', '표준단가', '상태', '등록일'],
        ...filteredParts.map(part => [
          part.part_code,
          part.part_name,
          part.category,
          part.unit,
          part.current_stock.toString(),
          part.stock_value.toString(),
          part.min_stock_level.toString(),
          part.max_stock_level.toString(),
          part.reorder_point.toString(),
          part.standard_cost.toString(),
          part.status === 'active' ? '활성' : part.status === 'inactive' ? '비활성' : '단종',
          new Date(part.created_at).toLocaleDateString()
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `parts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      setSnackbar({
        open: true,
        message: '부품 목록이 CSV 파일로 내보내졌습니다.',
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

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'low':
        return <WarningIcon color="warning" />;
      case 'overstock':
        return <InfoIcon color="info" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'error';
      case 'low':
        return 'warning';
      case 'overstock':
        return 'info';
      default:
        return 'success';
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.part_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    const matchesStockStatus = stockStatusFilter === 'all' || part.stock_status === stockStatusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesStockStatus;
  });

  const paginatedParts = filteredParts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const stockSummary = {
    total: parts.length,
    critical: parts.filter(p => p.stock_status === 'critical').length,
    low: parts.filter(p => p.stock_status === 'low').length,
    normal: parts.filter(p => p.stock_status === 'normal').length,
    overstock: parts.filter(p => p.stock_status === 'overstock').length,
    totalValue: parts.reduce((sum, p) => sum + p.stock_value, 0)
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon />
        부품 관리
      </Typography>

      {/* 재고 현황 요약 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {stockSummary.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 부품
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error">
                {stockSummary.critical}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                재고 부족
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {stockSummary.low}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                재주문 필요
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                {stockSummary.normal}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                정상 재고
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                ₩{stockSummary.totalValue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 재고가치
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="부품 검색" />
          <Tab label="부품 추가" />
          <Tab label="부품 상세" />
        </Tabs>
      </Paper>

      {/* 부품 검색 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                부품 목록
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={loadParts}
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
                  부품 추가
                </Button>
              </Box>
            </Box>
            
            {/* 필터 */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="부품명, 코드, 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2.25}>
                <FormControl fullWidth size="small">
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="카테고리"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2.25}>
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
                    <MenuItem value="discontinued">단종</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2.25}>
                <FormControl fullWidth size="small">
                  <InputLabel>재고 상태</InputLabel>
                  <Select
                    value={stockStatusFilter}
                    label="재고 상태"
                    onChange={(e) => setStockStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="critical">재고 부족</MenuItem>
                    <MenuItem value="low">재주문 필요</MenuItem>
                    <MenuItem value="normal">정상</MenuItem>
                    <MenuItem value="overstock">과재고</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2.25}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setStockStatusFilter('all');
                  }}
                >
                  필터 초기화
                </Button>
              </Grid>
            </Grid>
            
            {/* 부품 테이블 */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>부품 코드</TableCell>
                    <TableCell>부품명</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>현재고</TableCell>
                    <TableCell>재고 상태</TableCell>
                    <TableCell>재고가치</TableCell>
                    <TableCell>표준단가</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedParts.map((part) => (
                    <TableRow key={part.part_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {part.part_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {part.part_name}
                        </Typography>
                        {part.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {part.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={part.category}
                          size="small"
                          variant="outlined"
                          icon={<CategoryIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {part.current_stock.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {part.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((part.current_stock / part.max_stock_level) * 100, 100)}
                          color={getStockStatusColor(part.stock_status) as any}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStockStatusIcon(part.stock_status)}
                          <Typography variant="body2">
                            {part.stock_status === 'critical' ? '재고부족' :
                             part.stock_status === 'low' ? '재주문필요' :
                             part.stock_status === 'overstock' ? '과재고' : '정상'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          ₩{part.stock_value.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          ₩{part.standard_cost.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={part.status === 'active' ? '활성' : part.status === 'inactive' ? '비활성' : '단종'}
                          color={part.status === 'active' ? 'success' : part.status === 'inactive' ? 'default' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="상세 보기">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPart(part);
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
              count={filteredParts.length}
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

      {/* 부품 추가 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              신규 부품 등록
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="부품 코드 *"
                  value={newPart.part_code}
                  onChange={(e) => setNewPart(prev => ({ ...prev, part_code: e.target.value }))}
                  helperText="고유한 부품 코드를 입력하세요"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="부품명 *"
                  value={newPart.part_name}
                  onChange={(e) => setNewPart(prev => ({ ...prev, part_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  multiline
                  rows={2}
                  value={newPart.description}
                  onChange={(e) => setNewPart(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>카테고리 *</InputLabel>
                  <Select
                    value={newPart.category}
                    label="카테고리 *"
                    onChange={(e) => setNewPart(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                    <MenuItem value="기계부품">기계부품</MenuItem>
                    <MenuItem value="전자부품">전자부품</MenuItem>
                    <MenuItem value="소모품">소모품</MenuItem>
                    <MenuItem value="원자재">원자재</MenuItem>
                    <MenuItem value="기타">기타</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>단위</InputLabel>
                  <Select
                    value={newPart.unit}
                    label="단위"
                    onChange={(e) => setNewPart(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    <MenuItem value="EA">EA</MenuItem>
                    <MenuItem value="KG">KG</MenuItem>
                    <MenuItem value="M">M</MenuItem>
                    <MenuItem value="L">L</MenuItem>
                    <MenuItem value="SET">SET</MenuItem>
                    <MenuItem value="BOX">BOX</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="최소 재고 수준"
                  type="number"
                  value={newPart.min_stock_level}
                  onChange={(e) => setNewPart(prev => ({ ...prev, min_stock_level: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="최대 재고 수준"
                  type="number"
                  value={newPart.max_stock_level}
                  onChange={(e) => setNewPart(prev => ({ ...prev, max_stock_level: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="재주문점"
                  type="number"
                  value={newPart.reorder_point}
                  onChange={(e) => setNewPart(prev => ({ ...prev, reorder_point: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="표준 단가"
                  type="number"
                  value={newPart.standard_cost}
                  onChange={(e) => setNewPart(prev => ({ ...prev, standard_cost: Number(e.target.value) }))}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>₩</Typography>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={newPart.status}
                    label="상태"
                    onChange={(e) => setNewPart(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'discontinued' }))}
                  >
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                    <MenuItem value="discontinued">단종</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleAddPart}
                    disabled={loading}
                    startIcon={<SaveIcon />}
                  >
                    등록
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setNewPart({
                        part_code: '',
                        part_name: '',
                        description: '',
                        category: '',
                        unit: 'EA',
                        min_stock_level: 0,
                        max_stock_level: 0,
                        reorder_point: 0,
                        standard_cost: 0,
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

      {/* 부품 상세 탭 */}
      <TabPanel value={tabValue} index={2}>
        {selectedPart ? (
          <Grid container spacing={3}>
            {/* 기본 정보 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon />
                      기본 정보
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!editingPart && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => setEditingPart({ ...selectedPart })}
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
                  
                  {editingPart ? (
                    // 편집 모드
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="부품 코드"
                          value={editingPart.part_code}
                          disabled
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="부품명"
                          value={editingPart.part_name}
                          onChange={(e) => setEditingPart(prev => prev ? {
                            ...prev,
                            part_name: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="설명"
                          multiline
                          rows={2}
                          value={editingPart.description || ''}
                          onChange={(e) => setEditingPart(prev => prev ? {
                            ...prev,
                            description: e.target.value
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>카테고리</InputLabel>
                          <Select
                            value={editingPart.category}
                            label="카테고리"
                            onChange={(e) => setEditingPart(prev => prev ? {
                              ...prev,
                              category: e.target.value
                            } : null)}
                          >
                            {categories.map(category => (
                              <MenuItem key={category} value={category}>{category}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>단위</InputLabel>
                          <Select
                            value={editingPart.unit}
                            label="단위"
                            onChange={(e) => setEditingPart(prev => prev ? {
                              ...prev,
                              unit: e.target.value
                            } : null)}
                          >
                            <MenuItem value="EA">EA</MenuItem>
                            <MenuItem value="KG">KG</MenuItem>
                            <MenuItem value="M">M</MenuItem>
                            <MenuItem value="L">L</MenuItem>
                            <MenuItem value="SET">SET</MenuItem>
                            <MenuItem value="BOX">BOX</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="최소 재고 수준"
                          type="number"
                          value={editingPart.min_stock_level}
                          onChange={(e) => setEditingPart(prev => prev ? {
                            ...prev,
                            min_stock_level: Number(e.target.value)
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="최대 재고 수준"
                          type="number"
                          value={editingPart.max_stock_level}
                          onChange={(e) => setEditingPart(prev => prev ? {
                            ...prev,
                            max_stock_level: Number(e.target.value)
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="재주문점"
                          type="number"
                          value={editingPart.reorder_point}
                          onChange={(e) => setEditingPart(prev => prev ? {
                            ...prev,
                            reorder_point: Number(e.target.value)
                          } : null)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="표준 단가"
                          type="number"
                          value={editingPart.standard_cost}
                          onChange={(e) => setEditingPart(prev => prev ? {
                            ...prev,
                            standard_cost: Number(e.target.value)
                          } : null)}
                          size="small"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>₩</Typography>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>상태</InputLabel>
                          <Select
                            value={editingPart.status}
                            label="상태"
                            onChange={(e) => setEditingPart(prev => prev ? {
                              ...prev,
                              status: e.target.value as 'active' | 'inactive' | 'discontinued'
                            } : null)}
                          >
                            <MenuItem value="active">활성</MenuItem>
                            <MenuItem value="inactive">비활성</MenuItem>
                            <MenuItem value="discontinued">단종</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleUpdatePart}
                            disabled={loading}
                          >
                            저장
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => setEditingPart(null)}
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
                          부품 코드
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedPart.part_code}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          부품명
                        </Typography>
                        <Typography variant="body1">
                          {selectedPart.part_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          설명
                        </Typography>
                        <Typography variant="body1">
                          {selectedPart.description || '설명 없음'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          카테고리
                        </Typography>
                        <Chip
                          label={selectedPart.category}
                          size="small"
                          variant="outlined"
                          icon={<CategoryIcon />}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          단위
                        </Typography>
                        <Typography variant="body1">
                          {selectedPart.unit}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          현재고
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStockStatusIcon(selectedPart.stock_status)}
                          <Typography variant="h6" fontWeight="medium">
                            {selectedPart.current_stock.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedPart.unit}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          재고가치
                        </Typography>
                        <Typography variant="h6" fontWeight="medium" color="primary">
                          ₩{selectedPart.stock_value.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          표준단가
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          ₩{selectedPart.standard_cost.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          최소 재고
                        </Typography>
                        <Typography variant="body1">
                          {selectedPart.min_stock_level.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          최대 재고
                        </Typography>
                        <Typography variant="body1">
                          {selectedPart.max_stock_level.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          재주문점
                        </Typography>
                        <Typography variant="body1">
                          {selectedPart.reorder_point.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          상태
                        </Typography>
                        <Chip
                          label={selectedPart.status === 'active' ? '활성' : selectedPart.status === 'inactive' ? '비활성' : '단종'}
                          color={selectedPart.status === 'active' ? 'success' : selectedPart.status === 'inactive' ? 'default' : 'error'}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          등록일
                        </Typography>
                        <Typography variant="body1">
                          {new Date(selectedPart.created_at).toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* 공급업체별 가격 정보 */}
            <Grid item xs={12}>
              <Accordion
                expanded={detailsExpanded === 'prices'}
                onChange={(_, isExpanded) => setDetailsExpanded(isExpanded ? 'prices' : false)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon />
                    공급업체별 가격 정보 ({partPrices.length}개)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {partPrices.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>공급업체</TableCell>
                            <TableCell>단가</TableCell>
                            <TableCell>통화</TableCell>
                            <TableCell>적용일</TableCell>
                            <TableCell>현재가격</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {partPrices.map((price, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <BusinessIcon fontSize="small" />
                                  {price.supplier_name}
                                </Box>
                              </TableCell>
                              <TableCell>{price.unit_price.toLocaleString()}</TableCell>
                              <TableCell>{price.currency}</TableCell>
                              <TableCell>{new Date(price.effective_date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip
                                  label={price.is_current ? '현재가격' : '이전가격'}
                                  color={price.is_current ? 'success' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      등록된 가격 정보가 없습니다.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            {/* 재고 이동 이력 */}
            <Grid item xs={12}>
              <Accordion
                expanded={detailsExpanded === 'movements'}
                onChange={(_, isExpanded) => setDetailsExpanded(isExpanded ? 'movements' : false)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon />
                    재고 이동 이력 ({stockMovements.length}건)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {stockMovements.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>이동 유형</TableCell>
                            <TableCell>수량</TableCell>
                            <TableCell>단가</TableCell>
                            <TableCell>참조 유형</TableCell>
                            <TableCell>이동일</TableCell>
                            <TableCell>처리자</TableCell>
                            <TableCell>비고</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stockMovements.map((movement) => (
                            <TableRow key={movement.movement_id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {movement.movement_type === 'in' ? (
                                    <TrendingUpIcon color="success" />
                                  ) : (
                                    <TrendingDownIcon color="error" />
                                  )}
                                  <Typography variant="body2">
                                    {movement.movement_type === 'in' ? '입고' : '출고'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color={movement.movement_type === 'in' ? 'success.main' : 'error.main'}
                                  fontWeight="medium"
                                >
                                  {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {movement.unit_price ? `₩${movement.unit_price.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    movement.reference_type === 'receiving' ? '입고' :
                                    movement.reference_type === 'issue' ? '출고' : '조정'
                                  }
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{new Date(movement.movement_date).toLocaleString()}</TableCell>
                              <TableCell>{movement.created_by}</TableCell>
                              <TableCell>{movement.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      재고 이동 이력이 없습니다.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            부품을 선택하여 상세 정보를 확인하세요.
          </Alert>
        )}
      </TabPanel>

      {/* 부품 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          신규 부품 등록
        </DialogTitle>
        <DialogContent>
          {/* 여기에 추가 폼 내용 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" onClick={handleAddPart} disabled={loading}>
            등록
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          부품 삭제 확인
        </DialogTitle>
        <DialogContent>
          <Typography>
            '{selectedPart?.part_name}' 부품을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            취소
          </Button>
          <Button color="error" variant="contained" onClick={handleDeletePart} disabled={loading}>
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

export default PartsPage;