import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Alert, Typography, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  BarChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Analytics (분석) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Analytics = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalInbound: 0,
    totalOutbound: 0,
    inboundValue: 0,
    outboundQuantity: 0,
    previousInbound: 0,
    previousOutbound: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 현재 기간 계산
      const now = dayjs();
      let startDate: dayjs.Dayjs;
      let prevStartDate: dayjs.Dayjs;
      let prevEndDate: dayjs.Dayjs;

      switch (period) {
        case 'daily':
          startDate = now.startOf('day');
          prevStartDate = now.subtract(1, 'day').startOf('day');
          prevEndDate = now.subtract(1, 'day').endOf('day');
          break;
        case 'weekly':
          startDate = now.startOf('week');
          prevStartDate = now.subtract(1, 'week').startOf('week');
          prevEndDate = now.subtract(1, 'week').endOf('week');
          break;
        case 'monthly':
          startDate = now.startOf('month');
          prevStartDate = now.subtract(1, 'month').startOf('month');
          prevEndDate = now.subtract(1, 'month').endOf('month');
          break;
        case 'yearly':
          startDate = now.startOf('year');
          prevStartDate = now.subtract(1, 'year').startOf('year');
          prevEndDate = now.subtract(1, 'year').endOf('year');
          break;
      }

      // 현재 기간 입고 데이터
      const { data: inboundData, error: inboundError } = await supabase
        .from('inbound')
        .select('quantity, total_price')
        .gte('inbound_date', startDate.format('YYYY-MM-DD'));

      if (inboundError) throw inboundError;

      // 현재 기간 출고 데이터
      const { data: outboundData, error: outboundError } = await supabase
        .from('outbound')
        .select('quantity')
        .gte('outbound_date', startDate.format('YYYY-MM-DD'));

      if (outboundError) throw outboundError;

      // 이전 기간 입고 데이터
      const { data: prevInboundData } = await supabase
        .from('inbound')
        .select('quantity')
        .gte('inbound_date', prevStartDate.format('YYYY-MM-DD'))
        .lte('inbound_date', prevEndDate.format('YYYY-MM-DD'));

      // 이전 기간 출고 데이터
      const { data: prevOutboundData } = await supabase
        .from('outbound')
        .select('quantity')
        .gte('outbound_date', prevStartDate.format('YYYY-MM-DD'))
        .lte('outbound_date', prevEndDate.format('YYYY-MM-DD'));

      const totalInbound = (inboundData as any[])?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      const totalOutbound = (outboundData as any[])?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      const inboundValue = (inboundData as any[])?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0;
      const previousInbound = (prevInboundData as any[])?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      const previousOutbound = (prevOutboundData as any[])?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

      setStats({
        totalInbound,
        totalOutbound,
        inboundValue,
        outboundQuantity: totalOutbound,
        previousInbound,
        previousOutbound,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const inboundGrowth = calculateGrowth(stats.totalInbound, stats.previousInbound);
  const outboundGrowth = calculateGrowth(stats.totalOutbound, stats.previousOutbound);

  if (error) {
    return (
      <Alert
        message={t('common.error')}
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('analytics.title')}
        </Title>
        <Select
          value={period}
          onChange={setPeriod}
          style={{ width: 150 }}
        >
          <Option value="daily">{t('analytics.daily')}</Option>
          <Option value="weekly">{t('analytics.weekly')}</Option>
          <Option value="monthly">{t('analytics.monthly')}</Option>
          <Option value="yearly">{t('analytics.yearly')}</Option>
        </Select>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('analytics.inboundAnalysis')}
                value={stats.totalInbound}
                suffix={t('common.items')}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
              <div style={{ marginTop: 8, fontSize: 14 }}>
                {Number(inboundGrowth) >= 0 ? (
                  <span style={{ color: '#3f8600' }}>
                    <ArrowUpOutlined /> {inboundGrowth}%
                  </span>
                ) : (
                  <span style={{ color: '#cf1322' }}>
                    <ArrowDownOutlined /> {inboundGrowth}%
                  </span>
                )}
                <span style={{ marginLeft: 8, color: '#999' }}>
                  {t('analytics.comparison')}
                </span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('analytics.outboundAnalysis')}
                value={stats.totalOutbound}
                suffix={t('common.items')}
                prefix={<LineChartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ marginTop: 8, fontSize: 14 }}>
                {Number(outboundGrowth) >= 0 ? (
                  <span style={{ color: '#3f8600' }}>
                    <ArrowUpOutlined /> {outboundGrowth}%
                  </span>
                ) : (
                  <span style={{ color: '#cf1322' }}>
                    <ArrowDownOutlined /> {outboundGrowth}%
                  </span>
                )}
                <span style={{ marginLeft: 8, color: '#999' }}>
                  {t('analytics.comparison')}
                </span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('inbound.totalValue')}
                value={stats.inboundValue}
                precision={0}
                suffix="₫"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('analytics.summary')}
                value={stats.totalInbound - stats.totalOutbound}
                suffix={t('common.items')}
                valueStyle={{
                  color: stats.totalInbound - stats.totalOutbound >= 0 ? '#3f8600' : '#cf1322'
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 24 }}>
          <Title level={4}>{t('analytics.details')}</Title>
          <p>{t('analytics.noDataAvailable')}</p>
          <p style={{ color: '#999', fontSize: 14 }}>
            차트 및 상세 분석 기능은 추후 추가 예정입니다.
          </p>
        </Card>
      </Spin>
    </div>
  );
};

export default Analytics;
