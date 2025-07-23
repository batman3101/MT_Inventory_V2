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
import { dashboardApi, inventoryApi, inboundApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/supabase';

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

      // 실제 Supabase 데이터 로드
      const [dashboardStats, lowStockData, recentInboundData] = await Promise.all([
        dashboardApi.getStats(),
        inventoryApi.getLowStock(),
        inboundApi.getAll(1, 5) // 최근 5개 입고 데이터
      ]);
      
      // 대시보드 통계 설정
      setStats({
        totalParts: dashboardStats.totalParts,
        lowStockParts: dashboardStats.lowStockItems,
        totalValue: 0, // TODO: 재고 가치 계산 로직 추가
        recentInbound: dashboardStats.recentInbound.length,
        recentOutbound: 0 // TODO: 출고 데이터 추가
      });

      // 최근 활동 데이터 변환
      const activities: RecentActivity[] = recentInboundData.data.map((inbound: any) => ({
        id: inbound.id,
        type: 'inbound' as const,
        partName: inbound.parts?.vietnamese_name || inbound.parts?.korean_name || 'Unknown Part',
        quantity: inbound.quantity,
        date: inbound.inbound_date,
        user: inbound.received_by || 'Unknown User'
      }));
      setRecentActivities(activities);

      // 저재고 항목 데이터 변환
      const lowStock: LowStockItem[] = lowStockData.map((item: any) => ({
        id: item.id,
        partName: item.parts?.vietnamese_name || item.parts?.korean_name || 'Unknown Part',
        currentStock: item.quantity,
        minStock: item.parts?.min_stock || 0,
        category: item.parts?.category || 'Unknown'
      }));
      setLowStockItems(lowStock);
      
    } catch (err) {
      console.error('대시보드 데이터 로드 오류:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // formatCurrency와 formatDate는 utils/supabase에서 import

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