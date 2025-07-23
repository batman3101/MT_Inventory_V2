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
  LinearProgress,
  Autocomplete
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
  SwapHoriz as TransferIcon
} from '@mui/icons-material';
import { inventoryApi, partsApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/supabase';
import { exportToExcel, formatInventoryDataForExcel } from '../utils/excelUtils';

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
  id: string;
  part_number: string;
  vietnamese_name: string;
  korean_name?: string;
  description?: string;
  category: string;
  unit: string;
  min_stock: number;
  spec?: string;
  status: 'active' | 'inactive' | 'discontinued';
}

interface Inventory {
  id: string;
  part_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  last_received_date?: string;
  last_issued_date?: string;
  location?: string;
  bin_location?: string;
  updated_at: string;
  part?: Part;
}

interface InventoryWithPart extends Inventory {
  part: Part;
  stock_value: number;
  stock_status: 'normal' | 'low' | 'critical' | 'overstock';
}

interface StockMovement {
  movement_id: string;
  part_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_price?: number;
  reference_type: 'receiving' | 'issue' | 'adjustment' | 'transfer';
  reference_id: string;
  movement_date: string;
  notes?: string;
  created_by: string;
  part?: Part;
}

interface ReceivingRecord {
  receiving_id: string;
  part_id: string;
  supplier_id: string;
  quantity_received: number;
  unit_price: number;
  total_cost: number;
  received_date: string;
  received_by: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  part?: Part;
  supplier?: { supplier_name: string };
}

interface IssueRecord {
  issue_id: string;
  part_id: string;
  department_id: string;
  quantity_issued: number;
  unit_cost: number;
  total_cost: number;
  issue_date: string;
  issued_by: string;
  requested_by: string;
  purpose?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  part?: Part;
  department?: { department_name: string };
}

interface StockAdjustment {
  adjustment_id: string;
  part_id: string;
  adjustment_type: 'increase' | 'decrease' | 'correction';
  quantity_before: number;
  quantity_after: number;
  adjustment_quantity: number;
  reason: string;
  adjustment_date: string;
  adjusted_by: string;
  notes?: string;
  part?: Part;
}

const InventoryPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [inventories, setInventories] = useState<InventoryWithPart[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<InventoryWithPart | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [receivingRecords, setReceivingRecords] = useState<ReceivingRecord[]>([]);
  const [issueRecords, setIssueRecords] = useState<IssueRecord[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  // 입고 관련 상태
  const [receivingDialogOpen, setReceivingDialogOpen] = useState(false);
  const [newReceiving, setNewReceiving] = useState<Partial<ReceivingRecord>>({
    part_id: '',
    supplier_id: '',
    quantity_received: 0,
    unit_price: 0,
    received_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'pending'
  });
  
  // 출고 관련 상태
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [newIssue, setNewIssue] = useState<Partial<IssueRecord>>({
    part_id: '',
    department_id: '',
    quantity_issued: 0,
    issue_date: new Date().toISOString().split('T')[0],
    requested_by: '',
    purpose: '',
    notes: '',
    status: 'pending'
  });
  
  // 재고 조정 관련 상태
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState<Partial<StockAdjustment>>({
    part_id: '',
    adjustment_type: 'correction',
    quantity_before: 0,
    quantity_after: 0,
    reason: '',
    adjustment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadInventories();
    loadParts();
    loadSuppliers();
    loadDepartments();
    loadCategories();
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedInventory) {
      loadStockMovements(selectedInventory.part_id);
    }
  }, [selectedInventory]);

  const loadInventories = async () => {
    setLoading(true);
    try {
      const inventoryResponse = await inventoryApi.getAll(1, 1000);
      const partsResponse = await partsApi.getAll(1, 1000);
      
      const inventoriesWithPart = inventoryResponse.data?.map(inventory => {
        const part = partsResponse.data.find(p => p.id === inventory.part_id);
        const stockValue = inventory.current_stock * 0; // 가격 정보가 없으므로 0으로 설정
        
        let stockStatus: 'normal' | 'low' | 'critical' | 'overstock' = 'normal';
        if (inventory.current_stock <= 0) {
          stockStatus = 'critical';
        } else if (inventory.current_stock <= (part?.min_stock || 0)) {
          stockStatus = 'low';
        }
        
        return {
          ...inventory,
          part,
          stock_value: stockValue,
          stock_status: stockStatus,
          available_stock: inventory.current_stock - (inventory.reserved_stock || 0)
        };
      }) || [];
      
      setInventories(inventoriesWithPart);
    } catch (error) {
      console.error('재고 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '재고 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadParts = async () => {
    try {
      const response = await partsApi.getAll(1, 1000);
      const activeParts = response.data.filter(part => part.status === 'active');
      setParts(activeParts || []);
    } catch (error) {
      console.error('부품 목록 로드 실패:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      // 공급업체 API가 구현되지 않았으므로 임시로 빈 배열 설정
      setSuppliers([]);
    } catch (error) {
      console.error('공급업체 목록 로드 실패:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      // 부서 API가 구현되지 않았으므로 임시로 빈 배열 설정
      setDepartments([]);
    } catch (error) {
      console.error('부서 목록 로드 실패:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await partsApi.getAll(1, 1000);
      const uniqueCategories = Array.from(new Set(response.data.map(item => item.category).filter(Boolean)));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('카테고리 로드 실패:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await inventoryApi.getAll(1, 1000);
      const uniqueLocations = Array.from(new Set(response.data.map(item => item.location).filter(Boolean)));
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('위치 정보 로드 실패:', error);
    }
  };

  const loadStockMovements = async (partId: string) => {
    try {
      // 재고 이동 이력 API가 구현되지 않았으므로 임시로 빈 배열 설정
      setStockMovements([]);
    } catch (error) {
      console.error('재고 이동 이력 로드 실패:', error);
    }
  };

  const handleReceiving = async () => {
    if (!newReceiving.part_id || !newReceiving.supplier_id || !newReceiving.quantity_received || !newReceiving.unit_price) {
      setSnackbar({
        open: true,
        message: '모든 필수 항목을 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // 입고 API가 구현되지 않았으므로 임시로 성공 메시지만 표시
      setSnackbar({
        open: true,
        message: '입고 처리가 완료되었습니다. (API 구현 필요)',
        severity: 'warning'
      });
      
      setReceivingDialogOpen(false);
      setNewReceiving({
        part_id: '',
        supplier_id: '',
        quantity_received: 0,
        unit_price: 0,
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'pending'
      });
      
      await loadInventories();
    } catch (error) {
      console.error('입고 처리 실패:', error);
      setSnackbar({
        open: true,
        message: '입고 처리에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!newIssue.part_id || !newIssue.department_id || !newIssue.quantity_issued || !newIssue.requested_by) {
      setSnackbar({
        open: true,
        message: '모든 필수 항목을 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // 출고 API가 구현되지 않았으므로 임시로 성공 메시지만 표시
      setSnackbar({
        open: true,
        message: '출고 처리가 완료되었습니다. (API 구현 필요)',
        severity: 'warning'
      });
      
      setIssueDialogOpen(false);
      setNewIssue({
        part_id: '',
        department_id: '',
        quantity_issued: 0,
        issue_date: new Date().toISOString().split('T')[0],
        requested_by: '',
        purpose: '',
        notes: '',
        status: 'pending'
      });
      
      await loadInventories();
    } catch (error) {
      console.error('출고 처리 실패:', error);
      setSnackbar({
        open: true,
        message: '출고 처리에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!newAdjustment.part_id || newAdjustment.quantity_after === undefined || !newAdjustment.reason) {
      setSnackbar({
        open: true,
        message: '모든 필수 항목을 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // 재고 조정 API가 구현되지 않았으므로 임시로 성공 메시지만 표시
      setSnackbar({
        open: true,
        message: '재고 조정이 완료되었습니다. (API 구현 필요)',
        severity: 'warning'
      });
      
      setAdjustmentDialogOpen(false);
      setNewAdjustment({
        part_id: '',
        adjustment_type: 'correction',
        quantity_before: 0,
        quantity_after: 0,
        reason: '',
        adjustment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      await loadInventories();
    } catch (error) {
      console.error('재고 조정 실패:', error);
      setSnackbar({
        open: true,
        message: '재고 조정에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (filteredInventories.length === 0) {
      setSnackbar({
        open: true,
        message: '내보낼 데이터가 없습니다.',
        severity: 'warning'
      });
      return;
    }

    try {
      const formattedData = formatInventoryDataForExcel(filteredInventories);
      exportToExcel({
        filename: '재고현황',
        sheetName: '재고 목록',
        data: formattedData
      });
      
      setSnackbar({
        open: true,
        message: 'Excel 파일이 다운로드되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      setSnackbar({
        open: true,
        message: 'Excel 파일 내보내기 중 오류가 발생했습니다.',
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

  const filteredInventories = inventories.filter(inventory => {
    const part = inventory.part;
    const matchesSearch = part?.vietnamese_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part?.korean_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part?.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part?.spec?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || part?.category === categoryFilter;
    const matchesStockStatus = stockStatusFilter === 'all' || inventory.stock_status === stockStatusFilter;
    const matchesLocation = locationFilter === 'all' || inventory.location === locationFilter;
    
    return matchesSearch && matchesCategory && matchesStockStatus && matchesLocation;
  });

  const paginatedInventories = filteredInventories.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const stockSummary = {
    total: inventories.length,
    critical: inventories.filter(i => i.stock_status === 'critical').length,
    low: inventories.filter(i => i.stock_status === 'low').length,
    normal: inventories.filter(i => i.stock_status === 'normal').length,
    overstock: inventories.filter(i => i.stock_status === 'overstock').length,
    totalValue: inventories.reduce((sum, i) => sum + i.stock_value, 0),
    totalStock: inventories.reduce((sum, i) => sum + i.current_stock, 0),
    totalReserved: inventories.reduce((sum, i) => sum + (i.reserved_stock || 0), 0)
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon />
        재고 관리
      </Typography>

      {/* 재고 현황 요약 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {stockSummary.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 품목
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {stockSummary.totalStock.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 재고량
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {stockSummary.totalReserved.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                예약 재고
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                ₫{stockSummary.totalValue.toLocaleString()}
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
          <Tab label="재고 현황" />
          <Tab label="입고 관리" />
          <Tab label="출고 관리" />
          <Tab label="재고 조정" />
        </Tabs>
      </Paper>

      {/* 재고 현황 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                재고 목록
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={loadInventories}
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
              </Box>
            </Box>
            
            {/* 필터 */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="부품명, 코드로 검색..."
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
                <FormControl fullWidth size="small">
                  <InputLabel>위치</InputLabel>
                  <Select
                    value={locationFilter}
                    label="위치"
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {locations.map(location => (
                      <MenuItem key={location} value={location}>{location}</MenuItem>
                    ))}
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
                    setStockStatusFilter('all');
                    setLocationFilter('all');
                  }}
                >
                  필터 초기화
                </Button>
              </Grid>
            </Grid>
            
            {/* 재고 테이블 */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>부품 정보</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>현재고</TableCell>
                    <TableCell>예약재고</TableCell>
                    <TableCell>사용가능</TableCell>
                    <TableCell>재고 상태</TableCell>
                    <TableCell>재고가치</TableCell>
                    <TableCell>위치</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedInventories.map((inventory) => (
                    <TableRow key={inventory.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {inventory.part?.part_number}
                          </Typography>
                          <Typography variant="body2">
                            {inventory.part?.vietnamese_name}
                          </Typography>
                          {inventory.part?.korean_name && (
                            <Typography variant="caption" color="text.secondary">
                              {inventory.part.korean_name}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={inventory.part?.category}
                          size="small"
                          variant="outlined"
                          icon={<CategoryIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {inventory.current_stock.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {inventory.part?.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((inventory.current_stock / (inventory.part?.max_stock || 1)) * 100, 100)}
                          color={getStockStatusColor(inventory.stock_status) as any}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="warning.main" fontWeight="medium">
                          {(inventory.reserved_stock || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main" fontWeight="medium">
                          {inventory.available_stock.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStockStatusIcon(inventory.stock_status)}
                          <Typography variant="body2">
                            {inventory.stock_status === 'critical' ? '재고부족' :
                             inventory.stock_status === 'low' ? '재주문필요' :
                             inventory.stock_status === 'overstock' ? '과재고' : '정상'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          ₫{inventory.stock_value.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {inventory.location || '-'}
                        </Typography>
                        {inventory.bin_location && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {inventory.bin_location}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="상세 보기">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedInventory(inventory)}
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
              count={filteredInventories.length}
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
        
        {/* 선택된 재고 상세 정보 */}
        {selectedInventory && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BuildIcon />
                재고 상세 정보
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    부품 코드
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedInventory.part?.part_number}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    부품명
                  </Typography>
                  <Typography variant="body1">
                    {selectedInventory.part?.vietnamese_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    현재고
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStockStatusIcon(selectedInventory.stock_status)}
                    <Typography variant="h6" fontWeight="medium">
                      {selectedInventory.current_stock.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedInventory.part?.unit}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    예약재고
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" color="warning.main">
                    {(selectedInventory.reserved_stock || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    사용가능재고
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" color="success.main">
                    {selectedInventory.available_stock.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    재고가치
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" color="primary">
                    ₫{selectedInventory.stock_value.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    위치
                  </Typography>
                  <Typography variant="body1">
                    {selectedInventory.location || '미지정'}
                    {selectedInventory.bin_location && (
                      <Typography variant="body2" color="text.secondary">
                        ({selectedInventory.bin_location})
                      </Typography>
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    최종 입고일
                  </Typography>
                  <Typography variant="body1">
                    {selectedInventory.last_received_date ? 
                      new Date(selectedInventory.last_received_date).toLocaleDateString() : '없음'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    최종 출고일
                  </Typography>
                  <Typography variant="body1">
                    {selectedInventory.last_issued_date ? 
                      new Date(selectedInventory.last_issued_date).toLocaleDateString() : '없음'}
                  </Typography>
                </Grid>
              </Grid>
              
              {/* 재고 이동 이력 */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon />
                재고 이동 이력 (최근 20건)
              </Typography>
              
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
                                {movement.movement_type === 'in' ? '입고' : 
                                 movement.movement_type === 'out' ? '출고' : '조정'}
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
                            {movement.unit_price ? `₫${movement.unit_price.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                movement.reference_type === 'receiving' ? '입고' :
                                movement.reference_type === 'issue' ? '출고' :
                                movement.reference_type === 'adjustment' ? '조정' : '이동'
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
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* 입고 관리 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShippingIcon />
                입고 관리
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setReceivingDialogOpen(true)}
              >
                신규 입고
              </Button>
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              입고 처리 시 재고가 자동으로 업데이트됩니다.
            </Alert>
            
            {/* 입고 이력 테이블은 여기에 추가 */}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 출고 관리 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon />
                출고 관리
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIssueDialogOpen(true)}
              >
                신규 출고
              </Button>
            </Box>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              출고 처리 시 사용 가능한 재고량을 확인한 후 처리됩니다.
            </Alert>
            
            {/* 출고 이력 테이블은 여기에 추가 */}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 재고 조정 탭 */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TransferIcon />
                재고 조정
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAdjustmentDialogOpen(true)}
              >
                재고 조정
              </Button>
            </Box>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              재고 조정은 실제 재고와 시스템 재고의 차이를 보정할 때 사용합니다.
            </Alert>
            
            {/* 재고 조정 이력 테이블은 여기에 추가 */}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 입고 다이얼로그 */}
      <Dialog open={receivingDialogOpen} onClose={() => setReceivingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          신규 입고 등록
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={parts}
                getOptionLabel={(option) => `${option.part_number} - ${option.vietnamese_name}`}
                value={parts.find(p => p.id === newReceiving.part_id) || null}
                onChange={(_, value) => setNewReceiving(prev => ({ ...prev, part_id: value?.id || '' }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="부품 선택 *"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>공급업체 *</InputLabel>
                <Select
                  value={newReceiving.supplier_id}
                  label="공급업체 *"
                  onChange={(e) => setNewReceiving(prev => ({ ...prev, supplier_id: e.target.value }))}
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
                label="입고 수량 *"
                type="number"
                value={newReceiving.quantity_received}
                onChange={(e) => setNewReceiving(prev => ({ ...prev, quantity_received: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="단가 *"
                type="number"
                value={newReceiving.unit_price}
                onChange={(e) => setNewReceiving(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₫</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="입고일 *"
                type="date"
                value={newReceiving.received_date}
                onChange={(e) => setNewReceiving(prev => ({ ...prev, received_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="총 비용"
                value={`₫${((newReceiving.quantity_received || 0) * (newReceiving.unit_price || 0)).toLocaleString()}`}
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={2}
                value={newReceiving.notes}
                onChange={(e) => setNewReceiving(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceivingDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" onClick={handleReceiving} disabled={loading}>
            입고 처리
          </Button>
        </DialogActions>
      </Dialog>

      {/* 출고 다이얼로그 */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          신규 출고 등록
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={parts}
                getOptionLabel={(option) => `${option.part_number} - ${option.vietnamese_name}`}
                value={parts.find(p => p.id === newIssue.part_id) || null}
                onChange={(_, value) => setNewIssue(prev => ({ ...prev, part_id: value?.id || '' }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="부품 선택 *"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>부서 *</InputLabel>
                <Select
                  value={newIssue.department_id}
                  label="부서 *"
                  onChange={(e) => setNewIssue(prev => ({ ...prev, department_id: e.target.value }))}
                >
                  {departments.map(department => (
                    <MenuItem key={department.department_id} value={department.department_id}>
                      {department.department_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="출고 수량 *"
                type="number"
                value={newIssue.quantity_issued}
                onChange={(e) => setNewIssue(prev => ({ ...prev, quantity_issued: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="요청자 *"
                value={newIssue.requested_by}
                onChange={(e) => setNewIssue(prev => ({ ...prev, requested_by: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="출고일 *"
                type="date"
                value={newIssue.issue_date}
                onChange={(e) => setNewIssue(prev => ({ ...prev, issue_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="사용 목적"
                value={newIssue.purpose}
                onChange={(e) => setNewIssue(prev => ({ ...prev, purpose: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={2}
                value={newIssue.notes}
                onChange={(e) => setNewIssue(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" onClick={handleIssue} disabled={loading}>
            출고 처리
          </Button>
        </DialogActions>
      </Dialog>

      {/* 재고 조정 다이얼로그 */}
      <Dialog open={adjustmentDialogOpen} onClose={() => setAdjustmentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          재고 조정
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={parts}
                getOptionLabel={(option) => `${option.part_number} - ${option.vietnamese_name}`}
                value={parts.find(p => p.id === newAdjustment.part_id) || null}
                onChange={(_, value) => {
                  const selectedPart = value;
                  if (selectedPart) {
                    const currentInventory = inventories.find(inv => inv.part_id === selectedPart.id);
                    setNewAdjustment(prev => ({
                      ...prev,
                      part_id: selectedPart.id,
                      quantity_before: currentInventory?.current_stock || 0
                    }));
                  } else {
                    setNewAdjustment(prev => ({ ...prev, part_id: '', quantity_before: 0 }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="부품 선택 *"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="현재 재고량"
                value={newAdjustment.quantity_before}
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="조정 후 재고량 *"
                type="number"
                value={newAdjustment.quantity_after}
                onChange={(e) => setNewAdjustment(prev => ({ ...prev, quantity_after: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="조정 수량"
                value={((newAdjustment.quantity_after || 0) - (newAdjustment.quantity_before || 0)).toLocaleString()}
                disabled
                InputProps={{
                  style: {
                    color: ((newAdjustment.quantity_after || 0) - (newAdjustment.quantity_before || 0)) >= 0 ? 'green' : 'red'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="조정일 *"
                type="date"
                value={newAdjustment.adjustment_date}
                onChange={(e) => setNewAdjustment(prev => ({ ...prev, adjustment_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="조정 사유 *"
                value={newAdjustment.reason}
                onChange={(e) => setNewAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="예: 실사 결과 차이, 손상품 폐기, 시스템 오류 수정 등"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={2}
                value={newAdjustment.notes}
                onChange={(e) => setNewAdjustment(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" onClick={handleStockAdjustment} disabled={loading}>
            조정 처리
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

export default InventoryPage;