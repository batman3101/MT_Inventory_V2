import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  Category as CategoryIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { exportToExcel } from '../utils/excelUtils';
import {
  generateInOutData,
  generateInboundDetails,
  generateOutboundDetails,
  generateInventoryAnalysis,
  generateCostAnalysis,
  type InOutData,
  type InboundDetail,
  type OutboundDetail,
  type InventoryAnalysis,
  type CostAnalysis
} from '../utils/mockData';

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
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

// 인터페이스는 mockData.ts에서 import

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const ReportsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // 입출고 보고서 상태
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [inOutData, setInOutData] = useState<InOutData[]>([]);
  const [inboundDetails, setInboundDetails] = useState<InboundDetail[]>([]);
  const [outboundDetails, setOutboundDetails] = useState<OutboundDetail[]>([]);
  
  // 재고 분석 상태
  const [inventoryAnalysis, setInventoryAnalysis] = useState<InventoryAnalysis[]>([]);
  
  // 비용 분석 상태
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis[]>([]);

  useEffect(() => {
    loadCategories();
    if (tabValue === 0) {
      loadInOutReport();
    } else if (tabValue === 1) {
      loadInventoryAnalysis();
    } else if (tabValue === 2) {
      loadCostAnalysis();
    }
  }, [tabValue, startDate, endDate, selectedCategory]);

  const loadCategories = async () => {
    try {
      // 모의 카테고리 데이터
      const mockCategories = [
        { category_id: '1', category_name: '전자부품' },
        { category_id: '2', category_name: '기계부품' },
        { category_id: '3', category_name: '소모품' },
        { category_id: '4', category_name: '공구' },
        { category_id: '5', category_name: '안전용품' }
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error('카테고리 로드 실패:', error);
    }
  };

  const loadInOutReport = async () => {
    setLoading(true);
    try {
      // 모의 데이터 생성
      const inOutData = generateInOutData(startDate, endDate);
      const inboundDetails = generateInboundDetails(startDate, endDate, selectedCategory);
      const outboundDetails = generateOutboundDetails(startDate, endDate, selectedCategory);
      
      setInOutData(inOutData);
      setInboundDetails(inboundDetails);
      setOutboundDetails(outboundDetails);
      
    } catch (error) {
      console.error('입출고 보고서 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '입출고 보고서를 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryAnalysis = async () => {
    setLoading(true);
    try {
      // 모의 데이터 생성
      const inventoryData = generateInventoryAnalysis();
      setInventoryAnalysis(inventoryData);
      
    } catch (error) {
      console.error('재고 분석 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '재고 분석을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCostAnalysis = async () => {
    setLoading(true);
    try {
      // 모의 데이터 생성
      const costData = generateCostAnalysis(startDate, endDate);
      setCostAnalysis(costData);
      
    } catch (error) {
      console.error('비용 분석 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '비용 분석을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      setSnackbar({
        open: true,
        message: '내보낼 데이터가 없습니다.',
        severity: 'warning'
      });
      return;
    }

    try {
      exportToExcel({
        filename,
        sheetName: filename,
        data
      });
      
      setSnackbar({
        open: true,
        message: `${filename} 데이터가 Excel 파일로 내보내졌습니다.`,
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReportsIcon />
        보고서
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label="입출고 보고서"
              icon={<TrendingUpIcon />}
              iconPosition="start"
            />
            <Tab
              label="재고 분석"
              icon={<InventoryIcon />}
              iconPosition="start"
            />
            <Tab
              label="비용 분석"
              icon={<MoneyIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* 입출고 보고서 탭 */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="시작일"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="종료일"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={selectedCategory}
                  label="카테고리"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  startAdornment={<CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="all">전체</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadInOutReport}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                sx={{ height: '56px' }}
              >
                새로고침
              </Button>
            </Grid>
          </Grid>

          {/* 월별 입출고 추이 차트 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  월별 입출고 추이
                </Typography>
                <Button
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportToExcel(inOutData, '월별_입출고_추이')}
                >
                  Excel 내보내기
                </Button>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={inOutData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inbound"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="입고"
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="출고"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 입고 상세 내역 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  입고 상세 내역 ({inboundDetails.length}건)
                </Typography>
                <Button
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportToExcel(inboundDetails, '입고_상세_내역')}
                >
                  Excel 내보내기
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>입고일</TableCell>
                      <TableCell>부품코드</TableCell>
                      <TableCell>부품명</TableCell>
                      <TableCell>공급업체</TableCell>
                      <TableCell>카테고리</TableCell>
                      <TableCell align="right">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">총액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inboundDetails.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(item.inbound_date).toLocaleDateString()}</TableCell>
                        <TableCell>{item.part_code}</TableCell>
                        <TableCell>{item.part_name}</TableCell>
                        <TableCell>{item.supplier_name}</TableCell>
                        <TableCell>
                          <Chip label={item.category_name} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatNumber(item.quantity)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {inboundDetails.length > 10 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  상위 10건만 표시됩니다. 전체 데이터는 Excel로 내보내기를 이용하세요.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* 출고 상세 내역 */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  출고 상세 내역 ({outboundDetails.length}건)
                </Typography>
                <Button
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportToExcel(outboundDetails, '출고_상세_내역')}
                >
                  Excel 내보내기
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>출고일</TableCell>
                      <TableCell>부품코드</TableCell>
                      <TableCell>부품명</TableCell>
                      <TableCell>부서</TableCell>
                      <TableCell>카테고리</TableCell>
                      <TableCell align="right">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">총액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outboundDetails.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(item.outbound_date).toLocaleDateString()}</TableCell>
                        <TableCell>{item.part_code}</TableCell>
                        <TableCell>{item.part_name}</TableCell>
                        <TableCell>{item.department_name}</TableCell>
                        <TableCell>
                          <Chip label={item.category_name} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatNumber(item.quantity)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {outboundDetails.length > 10 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  상위 10건만 표시됩니다. 전체 데이터는 Excel로 내보내기를 이용하세요.
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* 재고 분석 탭 */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* 카테고리별 재고 수량 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      카테고리별 재고 수량
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleExportToExcel(inventoryAnalysis, '재고_분석')}
                    >
                      Excel 내보내기
                    </Button>
                  </Box>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryAnalysis}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_quantity"
                      >
                        {inventoryAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatNumber(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* 카테고리별 재고 가치 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    카테고리별 재고 가치
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryAnalysis}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_value"
                      >
                        {inventoryAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* 재고 분석 상세 테이블 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    카테고리별 재고 현황
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>카테고리</TableCell>
                          <TableCell align="right">부품 수</TableCell>
                          <TableCell align="right">총 재고량</TableCell>
                          <TableCell align="right">총 재고 가치</TableCell>
                          <TableCell align="right">평균 단가</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inventoryAnalysis.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: COLORS[index % COLORS.length]
                                  }}
                                />
                                {item.category_name}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{formatNumber(item.part_count)}</TableCell>
                            <TableCell align="right">{formatNumber(item.total_quantity)}</TableCell>
                            <TableCell align="right">{formatCurrency(item.total_value)}</TableCell>
                            <TableCell align="right">
                              {item.total_quantity > 0 ? formatCurrency(item.total_value / item.total_quantity) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 비용 분석 탭 */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="시작일"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="종료일"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadCostAnalysis}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                sx={{ height: '56px' }}
              >
                새로고침
              </Button>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  월별 비용 분석
                </Typography>
                <Button
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportToExcel(costAnalysis, '월별_비용_분석')}
                >
                  Excel 내보내기
                </Button>
              </Box>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={costAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="inbound_cost" fill="#8884d8" name="입고 비용" />
                  <Bar dataKey="outbound_cost" fill="#82ca9d" name="출고 비용" />
                  <Bar dataKey="net_cost" fill="#ffc658" name="순 비용" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabPanel>
      </Card>

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

export default ReportsPage;