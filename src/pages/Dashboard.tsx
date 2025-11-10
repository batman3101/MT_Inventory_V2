import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
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

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchInventoryStats();
    fetchSuppliers();
    fetchRecentInbounds(5);
    fetchRecentOutbounds(5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = inventoryLoading || suppliersLoading || inboundLoading || outboundLoading;

  // 재고 없는 항목 계산
  const outOfStockCount = inventoryStats?.totalItems
    ? inventoryStats.totalItems - (inventoryStats.totalQuantity > 0 ? inventoryStats.totalItems : 0)
    : 0;

  // 최근 활동 통합 (입고 + 출고)
  const recentActivities = [
    ...recentInbounds.map(item => ({
      id: `in-${item.inbound_id}`,
      text: `${t('dashboard.inbound')}: ${item.part_code} - ${item.part_name} (${item.quantity} ${item.part_unit})`,
      type: 'inbound',
      date: item.created_at
    })),
    ...recentOutbounds.map(item => ({
      id: `out-${item.outbound_id}`,
      text: `${t('dashboard.outbound')}: ${item.part_code} - ${item.part_name} (${item.quantity} ${item.part_unit})`,
      type: 'outbound',
      date: item.created_at
    }))
  ]
    .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
    .slice(0, 10);

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

        <Card title={t('dashboard.recentActivity')} style={{ marginTop: 24 }}>
          <List
            dataSource={recentActivities}
            renderItem={(item) => (
              <List.Item key={item.id}>
                {item.type === 'inbound' ? (
                  <ArrowUpOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                ) : (
                  <ArrowDownOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                )}
                {item.text}
                <span style={{ color: '#8c8c8c', marginLeft: 8, fontSize: 12 }}>
                  ({dayjs(item.date).format('YYYY-MM-DD HH:mm')})
                </span>
              </List.Item>
            )}
            locale={{ emptyText: t('common.noData') }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Dashboard;
