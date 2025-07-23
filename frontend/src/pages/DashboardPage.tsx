import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { supabase } from '../utils/supabase';

interface DashboardStats {
  totalParts: number;
  lowStockParts: number;
  totalValue: number;
  recentInbound: number;
  recentOutbound: number;
}

interface RecentActivity {
  id: string;
  type: 'inbound' | 'outbound';
  partName: string;
  quantity: number;
  date: string;
  user: string;
}

interface LowStockItem {
  id: string;
  partName: string;
  currentStock: number;
  minStock: number;
  category: string;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalParts: 0,
    lowStockParts: 0,
    totalValue: 0,
    recentInbound: 0,
    recentOutbound: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 통계 데이터 로드
      await Promise.all([
        loadStats(),
        loadRecentActivities(),
        loadLowStockItems(),
      ]);
    } catch (err) {
      console.error('대시보드 데이터 로드 오류:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // 부품 총 개수
    const { data: partsData, error: partsError } = await supabase
      .from('parts')
      .select('id, current_stock, min_stock');

    if (partsError) throw partsError;

    const totalParts = partsData?.length || 0;
    const lowStockParts = partsData?.filter(
      (part) => part.current_stock <= part.min_stock
    ).length || 0;

    // 최근 7일 입고/출고 건수
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: inboundData } = await supabase
      .from('inbound')
      .select('id')
      .gte('inbound_date', sevenDaysAgo.toISOString());

    const { data: outboundData } = await supabase
      .from('outbound')
      .select('id')
      .gte('outbound_date', sevenDaysAgo.toISOString());

    // 총 재고 가치 계산 (부품 가격 * 현재 재고)
    const { data: inventoryValue } = await supabase
      .from('parts')
      .select(`
        current_stock,
        part_prices!inner(
          price
        )
      `);

    const totalValue = inventoryValue?.reduce((sum, item) => {
      const price = item.part_prices?.[0]?.price || 0;
      return sum + (item.current_stock * price);
    }, 0) || 0;

    setStats({
      totalParts,
      lowStockParts,
      totalValue,
      recentInbound: inboundData?.length || 0,
      recentOutbound: outboundData?.length || 0,
    });
  };

  const loadRecentActivities = async () => {
    // 최근 입고 활동
    const { data: inboundData } = await supabase
      .from('inbound')
      .select(`
        id,
        quantity,
        inbound_date,
        created_by,
        parts!inner(
          part_name
        )
      `)
      .order('inbound_date', { ascending: false })
      .limit(5);

    // 최근 출고 활동
    const { data: outboundData } = await supabase
      .from('outbound')
      .select(`
        id,
        quantity,
        outbound_date,
        created_by,
        parts!inner(
          part_name
        )
      `)
      .order('outbound_date', { ascending: false })
      .limit(5);

    const activities: RecentActivity[] = [];

    // 입고 데이터 변환
    inboundData?.forEach((item) => {
      activities.push({
        id: item.id,
        type: 'inbound',
        partName: item.parts?.part_name || '알 수 없음',
        quantity: item.quantity,
        date: item.inbound_date,
        user: item.created_by || '시스템',
      });
    });

    // 출고 데이터 변환
    outboundData?.forEach((item) => {
      activities.push({
        id: item.id,
        type: 'outbound',
        partName: item.parts?.part_name || '알 수 없음',
        quantity: item.quantity,
        date: item.outbound_date,
        user: item.created_by || '시스템',
      });
    });

    // 날짜순 정렬
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivities(activities.slice(0, 10));
  };

  const loadLowStockItems = async () => {
    const { data, error } = await supabase
      .from('parts')
      .select(`
        id,
        part_name,
        current_stock,
        min_stock,
        category
      `)
      .lte('current_stock', supabase.raw('min_stock'))
      .order('current_stock', { ascending: true })
      .limit(10);

    if (error) throw error;

    setLowStockItems(
      data?.map((item) => ({
        id: item.id,
        partName: item.part_name,
        currentStock: item.current_stock,
        minStock: item.min_stock,
        category: item.category || '미분류',
      })) || []
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          대시보드 데이터를 불러오는 중...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InventoryIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    총 부품 수
                  </Typography>
                  <Typography variant="h5">
                    {stats.totalParts.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    재고 부족
                  </Typography>
                  <Typography variant="h5">
                    {stats.lowStockParts.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    총 재고 가치
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(stats.totalValue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    최근 7일 활동
                  </Typography>
                  <Typography variant="h5">
                    {(stats.recentInbound + stats.recentOutbound).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 최근 활동 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              최근 활동
            </Typography>
            <List>
              {recentActivities.map((activity) => (
                <ListItem key={`${activity.type}-${activity.id}`} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={activity.type === 'inbound' ? '입고' : '출고'}
                          color={activity.type === 'inbound' ? 'success' : 'warning'}
                          size="small"
                        />
                        <Typography variant="body2">
                          {activity.partName}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        수량: {activity.quantity.toLocaleString()} | {formatDate(activity.date)} | {activity.user}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {recentActivities.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="최근 활동이 없습니다."
                    secondary="입고 또는 출고 활동이 있으면 여기에 표시됩니다."
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* 재고 부족 알림 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              재고 부족 알림
            </Typography>
            <List>
              {lowStockItems.map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon color="warning" fontSize="small" />
                        <Typography variant="body2">
                          {item.partName}
                        </Typography>
                        <Chip label={item.category} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        현재: {item.currentStock.toLocaleString()} | 최소: {item.minStock.toLocaleString()}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {lowStockItems.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="재고 부족 항목이 없습니다."
                    secondary="모든 부품의 재고가 충분합니다."
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;