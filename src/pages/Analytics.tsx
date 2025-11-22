import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Alert, Typography, Space, Tabs, DatePicker } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  BarChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase.ts';
import { ResizableTable } from '../components/ResizableTable';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface TopPart {
  part_code: string;
  part_name: string;
  quantity: number;
  value?: number;
  percentage: number;
  suppliers?: Array<{
    supplier_name: string;
    unit_price: number;
    quantity: number;
  }>;
}

interface CategoryData {
  category: string;
  quantity: number;
  value: number;
  percentage: number;
}

interface SupplierData {
  supplier_name: string;
  quantity: number;
  value: number;
  count: number;
}

// Supabase 응답 타입
interface InboundQuantityRow {
  quantity: number;
}

interface InboundValueRow {
  quantity: number;
  total_price: number;
}

interface InboundPartsRow {
  part_id: string;
  quantity: number;
  total_price: number;
  unit_price: number;
  parts?: { part_code: string; part_name: string } | null;
  suppliers?: { supplier_name: string } | null;
}

interface OutboundPartsRow {
  part_id: string;
  quantity: number;
  parts?: { part_code: string; part_name: string } | null;
}

interface CategoryInboundRow {
  quantity: number;
  total_price: number;
  parts?: { category: string } | null;
}

interface SupplierInboundRow {
  quantity: number;
  total_price: number;
  suppliers?: { supplier_name: string } | null;
}

interface PartAccumulator {
  part_code: string;
  part_name: string;
  quantity: number;
  value: number;
  suppliers: Array<{
    supplier_name: string;
    unit_price: number;
    quantity: number;
  }>;
}

interface SimplePartAccumulator {
  part_code: string;
  part_name: string;
  quantity: number;
}

interface CategoryAccumulator {
  category: string;
  quantity: number;
  value: number;
}

interface SupplierAccumulator {
  supplier_name: string;
  quantity: number;
  value: number;
  count: number;
}

/**
 * Analytics (분석) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Analytics = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalInbound: 0,
    totalOutbound: 0,
    inboundValue: 0,
    previousInbound: 0,
    previousOutbound: 0,
  });
  const [topInboundParts, setTopInboundParts] = useState<TopPart[]>([]);
  const [topOutboundParts, setTopOutboundParts] = useState<TopPart[]>([]);
  const [topInboundPartsByValue, setTopInboundPartsByValue] = useState<TopPart[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierData[]>([]);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 현재 기간 계산
      const now = dayjs();
      let startDate: dayjs.Dayjs;
      let endDate: dayjs.Dayjs;
      let prevStartDate: dayjs.Dayjs;
      let prevEndDate: dayjs.Dayjs;

      if (period === 'custom' && dateRange[0] && dateRange[1]) {
        // 커스텀 기간
        startDate = dateRange[0].startOf('day');
        endDate = dateRange[1].endOf('day');
        const daysDiff = endDate.diff(startDate, 'day');
        prevStartDate = startDate.subtract(daysDiff + 1, 'day');
        prevEndDate = startDate.subtract(1, 'day').endOf('day');
      } else {
        // 기본 기간
        endDate = now.endOf('day');
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
          default:
            startDate = now.startOf('month');
            prevStartDate = now.subtract(1, 'month').startOf('month');
            prevEndDate = now.subtract(1, 'month').endOf('month');
        }
      }

      // 현재 기간 입고 데이터
      const { data: inboundData, error: inboundError } = await supabase
        .from('inbound')
        .select('quantity, total_price')
        .gte('inbound_date', startDate.format('YYYY-MM-DD'))
        .lte('inbound_date', endDate.format('YYYY-MM-DD'));

      if (inboundError) throw inboundError;

      // 현재 기간 출고 데이터
      const { data: outboundData, error: outboundError } = await supabase
        .from('outbound')
        .select('quantity')
        .gte('outbound_date', startDate.format('YYYY-MM-DD'))
        .lte('outbound_date', endDate.format('YYYY-MM-DD'));

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

      const totalInbound = (inboundData as InboundQuantityRow[] | null)?.reduce((sum: number, item: InboundQuantityRow) => sum + (item.quantity || 0), 0) || 0;
      const totalOutbound = (outboundData as InboundQuantityRow[] | null)?.reduce((sum: number, item: InboundQuantityRow) => sum + (item.quantity || 0), 0) || 0;
      const inboundValue = (inboundData as InboundValueRow[] | null)?.reduce((sum: number, item: InboundValueRow) => sum + (item.total_price || 0), 0) || 0;
      const previousInbound = (prevInboundData as InboundQuantityRow[] | null)?.reduce((sum: number, item: InboundQuantityRow) => sum + (item.quantity || 0), 0) || 0;
      const previousOutbound = (prevOutboundData as InboundQuantityRow[] | null)?.reduce((sum: number, item: InboundQuantityRow) => sum + (item.quantity || 0), 0) || 0;

      setStats({
        totalInbound,
        totalOutbound,
        inboundValue,
        previousInbound,
        previousOutbound,
      });

      // 상세 분석 데이터 가져오기
      await fetchDetailedAnalytics(startDate, endDate);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedAnalytics = async (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
    try {
      // 입고 상위 부품 (수량 및 금액)
      const { data: inboundPartsData } = await supabase
        .from('inbound')
        .select('part_id, quantity, total_price, unit_price, parts(part_code, part_name), suppliers(supplier_name)')
        .gte('inbound_date', startDate.format('YYYY-MM-DD'))
        .lte('inbound_date', endDate.format('YYYY-MM-DD'));

      const inboundByPart = (inboundPartsData as InboundPartsRow[] | null)?.reduce((acc: Record<string, PartAccumulator>, item: InboundPartsRow) => {
        const partCode = item.parts?.part_code || t('analytics.unknown');
        const partName = item.parts?.part_name || t('analytics.unknown');
        const supplierName = item.suppliers?.supplier_name || t('analytics.unknown');
        const unitPrice = item.unit_price || 0;
        const quantity = item.quantity || 0;

        if (!acc[partCode]) {
          acc[partCode] = {
            part_code: partCode,
            part_name: partName,
            quantity: 0,
            value: 0,
            suppliers: []
          };
        }
        acc[partCode].quantity += quantity;
        acc[partCode].value += item.total_price || 0;

        // 공급업체 정보 추가 (중복 체크)
        const existingSupplier = acc[partCode].suppliers.find(
          (s) => s.supplier_name === supplierName && s.unit_price === unitPrice
        );
        if (existingSupplier) {
          existingSupplier.quantity += quantity;
        } else {
          acc[partCode].suppliers.push({
            supplier_name: supplierName,
            unit_price: unitPrice,
            quantity: quantity
          });
        }

        return acc;
      }, {} as Record<string, PartAccumulator>);

      // 수량 기준 상위 부품
      const topInbound = Object.values(inboundByPart || {})
        .sort((a: PartAccumulator, b: PartAccumulator) => b.quantity - a.quantity)
        .slice(0, 10) as TopPart[];
      const totalInboundQty = topInbound.reduce((sum: number, item: TopPart) => sum + item.quantity, 0);
      setTopInboundParts(topInbound.map((item: TopPart) => ({
        ...item,
        percentage: Number(totalInboundQty) > 0 ? (Number(item.quantity) / Number(totalInboundQty) * 100) : 0
      })));

      // 금액 기준 상위 부품
      const topInboundByValue = Object.values(inboundByPart || {})
        .sort((a: PartAccumulator, b: PartAccumulator) => (b.value || 0) - (a.value || 0))
        .slice(0, 10) as TopPart[];
      const totalInboundValue = topInboundByValue.reduce((sum: number, item: TopPart) => sum + (item.value || 0), 0);
      setTopInboundPartsByValue(topInboundByValue.map((item: TopPart) => ({
        ...item,
        percentage: Number(totalInboundValue) > 0 ? (Number(item.value || 0) / Number(totalInboundValue) * 100) : 0
      })));

      // 출고 상위 부품 (수량만)
      const { data: outboundPartsData } = await supabase
        .from('outbound')
        .select('part_id, quantity, parts(part_code, part_name)')
        .gte('outbound_date', startDate.format('YYYY-MM-DD'))
        .lte('outbound_date', endDate.format('YYYY-MM-DD'));

      const outboundByPart = (outboundPartsData as OutboundPartsRow[] | null)?.reduce((acc: Record<string, SimplePartAccumulator>, item: OutboundPartsRow) => {
        const partCode = item.parts?.part_code || t('analytics.unknown');
        const partName = item.parts?.part_name || t('analytics.unknown');
        if (!acc[partCode]) {
          acc[partCode] = { part_code: partCode, part_name: partName, quantity: 0 };
        }
        acc[partCode].quantity += item.quantity || 0;
        return acc;
      }, {} as Record<string, SimplePartAccumulator>);

      // 수량 기준 상위 부품
      const topOutbound = Object.values(outboundByPart || {})
        .sort((a: SimplePartAccumulator, b: SimplePartAccumulator) => b.quantity - a.quantity)
        .slice(0, 10) as TopPart[];
      const totalOutboundQty = topOutbound.reduce((sum: number, item: TopPart) => sum + item.quantity, 0);
      setTopOutboundParts(topOutbound.map((item: TopPart) => ({
        ...item,
        percentage: Number(totalOutboundQty) > 0 ? (Number(item.quantity) / Number(totalOutboundQty) * 100) : 0
      })));

      // 카테고리별 분석
      const { data: categoryInboundData } = await supabase
        .from('inbound')
        .select('quantity, total_price, parts(category)')
        .gte('inbound_date', startDate.format('YYYY-MM-DD'))
        .lte('inbound_date', endDate.format('YYYY-MM-DD'));

      const categoryStats = (categoryInboundData as CategoryInboundRow[] | null)?.reduce((acc: Record<string, CategoryAccumulator>, item: CategoryInboundRow) => {
        const category = item.parts?.category || t('analytics.unknown');
        if (!acc[category]) {
          acc[category] = { category, quantity: 0, value: 0 };
        }
        acc[category].quantity += item.quantity || 0;
        acc[category].value += item.total_price || 0;
        return acc;
      }, {} as Record<string, CategoryAccumulator>);

      const categories = Object.values(categoryStats || {}) as CategoryData[];
      const totalCategoryQty = categories.reduce((sum: number, item: CategoryData) => sum + item.quantity, 0);
      setCategoryData(categories.map((item: CategoryData) => ({
        ...item,
        percentage: Number(totalCategoryQty) > 0 ? (Number(item.quantity) / Number(totalCategoryQty) * 100) : 0
      })).sort((a: CategoryData, b: CategoryData) => b.quantity - a.quantity));

      // 공급업체별 분석
      const { data: supplierInboundData } = await supabase
        .from('inbound')
        .select('quantity, total_price, suppliers(supplier_name)')
        .gte('inbound_date', startDate.format('YYYY-MM-DD'))
        .lte('inbound_date', endDate.format('YYYY-MM-DD'));

      const supplierStats = (supplierInboundData as SupplierInboundRow[] | null)?.reduce((acc: Record<string, SupplierAccumulator>, item: SupplierInboundRow) => {
        const supplierName = item.suppliers?.supplier_name || t('analytics.unknown');
        if (!acc[supplierName]) {
          acc[supplierName] = { supplier_name: supplierName, quantity: 0, value: 0, count: 0 };
        }
        acc[supplierName].quantity += item.quantity || 0;
        acc[supplierName].value += item.total_price || 0;
        acc[supplierName].count += 1;
        return acc;
      }, {} as Record<string, SupplierAccumulator>);

      setSupplierData((Object.values(supplierStats || {}) as SupplierData[]).sort((a: SupplierData, b: SupplierData) => b.quantity - a.quantity));
    } catch (err: unknown) {
      console.error('Failed to fetch detailed analytics:', err);
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

  const handlePeriodChange = (value: PeriodType) => {
    setPeriod(value);
    if (value !== 'custom') {
      setDateRange([null, null]);
    }
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates) {
      setDateRange(dates);
      setPeriod('custom');
    } else {
      setDateRange([null, null]);
      setPeriod('monthly');
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('analytics.title')}
        </Title>
        <Space>
          <Select
            value={period}
            onChange={handlePeriodChange}
            style={{ width: 150 }}
          >
            <Option value="daily">{t('analytics.daily')}</Option>
            <Option value="weekly">{t('analytics.weekly')}</Option>
            <Option value="monthly">{t('analytics.monthly')}</Option>
            <Option value="yearly">{t('analytics.yearly')}</Option>
            <Option value="custom">{t('analytics.custom')}</Option>
          </Select>
          {period === 'custom' && (
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={[t('common.startDate'), t('common.endDate')]}
              style={{ width: 260 }}
              allowClear
            />
          )}
        </Space>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
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

          <Col xs={24} sm={12} lg={8}>
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

          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title={t('analytics.inboundValue')}
                value={stats.inboundValue}
                precision={0}
                suffix="₫"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 24 }}>
          <Title level={4}>{t('analytics.details')}</Title>
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: '1',
                label: t('analytics.topInboundParts'),
                children: (
                  <ResizableTable
                    columns={[
                      {
                        title: t('analytics.rank'),
                        key: 'rank',
                        width: 80,
                        render: (_: unknown, __: unknown, index: number) => index + 1,
                      },
                      {
                        title: t('parts.partCode'),
                        dataIndex: 'part_code',
                        key: 'part_code',
                        width: 120,
                      },
                      {
                        title: t('parts.partName'),
                        dataIndex: 'part_name',
                        key: 'part_name',
                      },
                      {
                        title: t('inbound.quantity'),
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 120,
                        align: 'right',
                        render: (val: number) => val.toLocaleString(),
                      },
                      {
                        title: t('analytics.percentage'),
                        dataIndex: 'percentage',
                        key: 'percentage',
                        width: 100,
                        align: 'right',
                        render: (val: number) => `${val.toFixed(1)}%`,
                      },
                    ]}
                    dataSource={topInboundParts}
                    rowKey="part_code"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                ),
              },
              {
                key: '2',
                label: t('analytics.topOutboundParts'),
                children: (
                  <ResizableTable
                    columns={[
                      {
                        title: t('analytics.rank'),
                        key: 'rank',
                        width: 80,
                        render: (_: unknown, __: unknown, index: number) => index + 1,
                      },
                      {
                        title: t('parts.partCode'),
                        dataIndex: 'part_code',
                        key: 'part_code',
                        width: 120,
                      },
                      {
                        title: t('parts.partName'),
                        dataIndex: 'part_name',
                        key: 'part_name',
                      },
                      {
                        title: t('outbound.quantity'),
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 120,
                        align: 'right',
                        render: (val: number) => val.toLocaleString(),
                      },
                      {
                        title: t('analytics.percentage'),
                        dataIndex: 'percentage',
                        key: 'percentage',
                        width: 100,
                        align: 'right',
                        render: (val: number) => `${val.toFixed(1)}%`,
                      },
                    ]}
                    dataSource={topOutboundParts}
                    rowKey="part_code"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                ),
              },
              {
                key: '3',
                label: t('analytics.topInboundPartsByValue'),
                children: (
                  <ResizableTable
                    columns={[
                      {
                        title: t('analytics.rank'),
                        key: 'rank',
                        width: 80,
                        render: (_: unknown, __: unknown, index: number) => index + 1,
                      },
                      {
                        title: t('parts.partCode'),
                        dataIndex: 'part_code',
                        key: 'part_code',
                        width: 120,
                      },
                      {
                        title: t('parts.partName'),
                        dataIndex: 'part_name',
                        key: 'part_name',
                        width: 200,
                      },
                      {
                        title: t('inbound.quantity'),
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 120,
                        align: 'right',
                        render: (val: number) => val.toLocaleString(),
                      },
                      {
                        title: t('suppliers.name'),
                        dataIndex: 'suppliers',
                        key: 'suppliers',
                        width: 200,
                        render: (suppliers: Array<{ supplier_name: string; unit_price: number; quantity: number }>) => {
                          if (!suppliers || suppliers.length === 0) return t('analytics.notAvailable');
                          return suppliers.map(s => s.supplier_name).join(', ');
                        },
                      },
                      {
                        title: t('inbound.unitPrice'),
                        dataIndex: 'suppliers',
                        key: 'unit_price',
                        width: 150,
                        align: 'right',
                        render: (suppliers: Array<{ supplier_name: string; unit_price: number; quantity: number }>) => {
                          if (!suppliers || suppliers.length === 0) return t('analytics.notAvailable');
                          return suppliers.map(s => `${s.unit_price.toLocaleString()} ₫`).join(', ');
                        },
                      },
                      {
                        title: t('analytics.value'),
                        dataIndex: 'value',
                        key: 'value',
                        width: 150,
                        align: 'right',
                        render: (val: number) => `${(val || 0).toLocaleString()} ₫`,
                      },
                      {
                        title: t('analytics.percentage'),
                        dataIndex: 'percentage',
                        key: 'percentage',
                        width: 100,
                        align: 'right',
                        render: (val: number) => `${val.toFixed(1)}%`,
                      },
                    ]}
                    dataSource={topInboundPartsByValue}
                    rowKey="part_code"
                    pagination={false}
                    scroll={{ x: 1200 }}
                  />
                ),
              },
              {
                key: '4',
                label: t('analytics.categoryBreakdown'),
                children: (
                  <ResizableTable
                    columns={[
                      {
                        title: t('parts.category'),
                        dataIndex: 'category',
                        key: 'category',
                      },
                      {
                        title: t('inbound.quantity'),
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 120,
                        align: 'right',
                        render: (val: number) => val.toLocaleString(),
                      },
                      {
                        title: t('analytics.value'),
                        dataIndex: 'value',
                        key: 'value',
                        width: 150,
                        align: 'right',
                        render: (val: number) => `${val.toLocaleString()} ₫`,
                      },
                      {
                        title: t('analytics.percentage'),
                        dataIndex: 'percentage',
                        key: 'percentage',
                        width: 100,
                        align: 'right',
                        render: (val: number) => `${val.toFixed(1)}%`,
                      },
                    ]}
                    dataSource={categoryData}
                    rowKey="category"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                ),
              },
              {
                key: '5',
                label: t('analytics.supplierBreakdown'),
                children: (
                  <ResizableTable
                    columns={[
                      {
                        title: t('suppliers.name'),
                        dataIndex: 'supplier_name',
                        key: 'supplier_name',
                      },
                      {
                        title: t('inbound.totalCount'),
                        dataIndex: 'count',
                        key: 'count',
                        width: 100,
                        align: 'right',
                      },
                      {
                        title: t('inbound.quantity'),
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 120,
                        align: 'right',
                        render: (val: number) => val.toLocaleString(),
                      },
                      {
                        title: t('analytics.value'),
                        dataIndex: 'value',
                        key: 'value',
                        width: 150,
                        align: 'right',
                        render: (val: number) => `${val.toLocaleString()} ₫`,
                      },
                    ]}
                    dataSource={supplierData}
                    rowKey="supplier_name"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Analytics;
