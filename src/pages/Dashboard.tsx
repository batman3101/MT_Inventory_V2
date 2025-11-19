import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Typography, Spin, Alert } from 'antd';
import {
  InboxOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useInventoryStore, useSuppliersStore, useInboundStore, useOutboundStore } from '../store';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getLast7DaysInboundAmount } from '../services/inbound.service';
import { getLast7DaysOutboundAmount } from '../services/outbound.service';

const { Title } = Typography;

/**
 * Dashboard 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Dashboard = () => {
  const { t } = useTranslation();

  // Zustand 스토어에서 데이터 가져오기
  const { stats: inventoryStats, fetchInventoryStats, isLoading: inventoryLoading, error: inventoryError } = useInventoryStore();
  const { suppliers, fetchSuppliers, isLoading: suppliersLoading } = useSuppliersStore();
  const { recentInbounds, fetchRecentInbounds, isLoading: inboundLoading } = useInboundStore();
  const { recentOutbounds, fetchRecentOutbounds, isLoading: outboundLoading } = useOutboundStore();

  // 차트 데이터 상태
  const [chartData, setChartData] = useState<Array<{
    date: string;
    inbound: number;
    outbound: number;
  }>>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchInventoryStats();
    fetchSuppliers();
    fetchRecentInbounds(5);
    fetchRecentOutbounds(5);
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 차트 데이터 로드
  const loadChartData = async () => {
    setChartLoading(true);
    try {
      const [inboundData, outboundData] = await Promise.all([
        getLast7DaysInboundAmount(),
        getLast7DaysOutboundAmount()
      ]);

      // 두 데이터를 날짜별로 병합
      const mergedData = inboundData.map((inbound) => {
        const outbound = outboundData.find(out => out.date === inbound.date);
        return {
          date: dayjs(inbound.date).format('MM/DD'),
          inbound: Math.round(inbound.amount),
          outbound: Math.round(outbound?.amount || 0)
        };
      });

      setChartData(mergedData);
    } catch (error) {
      console.error('차트 데이터 로드 에러:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const isLoading = inventoryLoading || suppliersLoading || inboundLoading || outboundLoading;

  // 재고 없는 항목 계산
  const outOfStockCount = inventoryStats?.totalItems
    ? inventoryStats.totalItems - (inventoryStats.totalQuantity > 0 ? inventoryStats.totalItems : 0)
    : 0;

  // 최근 입고 활동
  const recentInboundActivities = recentInbounds.map(item => ({
    id: `in-${item.inbound_id}`,
    text: `${item.part_code} - ${item.part_name} (${item.quantity} ${item.part_unit})`,
    date: item.created_at
  }));

  // 최근 출고 활동
  const recentOutboundActivities = recentOutbounds.map(item => ({
    id: `out-${item.outbound_id}`,
    text: `${item.part_code} - ${item.part_name} (${item.quantity} ${item.part_unit})`,
    date: item.created_at
  }));

  if (inventoryError) {
    return (
      <Alert
        message={t('common.error')}
        description={inventoryError}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        {t('dashboard.title')}
      </Title>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('dashboard.totalInventory')}
                value={inventoryStats?.totalQuantity || 0}
                prefix={<InboxOutlined />}
                valueStyle={{ color: '#1890ff' }}
                suffix={t('common.items')}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('dashboard.lowStockItems')}
                value={inventoryStats?.lowStockCount || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('dashboard.outOfStock')}
                value={outOfStockCount}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('dashboard.totalSuppliers')}
                value={suppliers.length}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 최근 7일 입고/출고 금액 차트 */}
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24}>
            <Card title="최근 7일 입고/출고 금액 비교" loading={chartLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    style={{ fontSize: 14 }}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    style={{ fontSize: 14 }}
                    tick={{ fill: '#666' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} VND`,
                      name === 'inbound' ? '입고 금액' : '출고 금액'
                    ]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      padding: 10
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 20 }}
                    formatter={(value) => value === 'inbound' ? '입고 금액' : '출고 금액'}
                  />
                  <Line
                    type="monotone"
                    dataKey="inbound"
                    stroke="#52c41a"
                    strokeWidth={3}
                    name="inbound"
                    dot={{ fill: '#52c41a', r: 5 }}
                    activeDot={{ r: 7 }}
                    animationBegin={0}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound"
                    stroke="#f5222d"
                    strokeWidth={3}
                    name="outbound"
                    dot={{ fill: '#f5222d', r: 5 }}
                    activeDot={{ r: 7 }}
                    animationBegin={300}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card title={t('dashboard.recentInboundActivity')} style={{ height: '100%' }}>
              <List
                dataSource={recentInboundActivities}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <ArrowUpOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {item.text}
                    <span style={{ color: '#8c8c8c', marginLeft: 8, fontSize: 12 }}>
                      ({dayjs(item.date).format('YYYY-MM-DD HH:mm')})
                    </span>
                  </List.Item>
                )}
                locale={{ emptyText: t('common.noData') }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={t('dashboard.recentOutboundActivity')} style={{ height: '100%' }}>
              <List
                dataSource={recentOutboundActivities}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <ArrowDownOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                    {item.text}
                    <span style={{ color: '#8c8c8c', marginLeft: 8, fontSize: 12 }}>
                      ({dayjs(item.date).format('YYYY-MM-DD HH:mm')})
                    </span>
                  </List.Item>
                )}
                locale={{ emptyText: t('common.noData') }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;
