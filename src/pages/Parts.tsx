import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Modal, Form, message, Select, InputNumber, Spin, Tag, Alert, Row, Col, Statistic, Descriptions, Table, Divider, Popover, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined, EyeOutlined, DollarOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePartsStore, usePartPriceStore, useSuppliersStore } from '../store';
import { useFactoryStore } from '../store/factory.store';
import type { Part, Inventory, Inbound, Outbound, PartPrice, Supplier } from '../types/database.types';
import dayjs from 'dayjs';
import { exportToExcel } from '../utils/excelExport';
import { translateError } from '../utils/errorTranslation';
import { ResizableTable } from '../components/ResizableTable';
import { getInventoryByPartId } from '../services/inventory.service';
import { supabase } from '../lib/supabase';
import BulkImportModal from '@/components/BulkImportModal';

const { Title } = Typography;
const { Option } = Select;

/**
 * Parts (부품) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Parts = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Part | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [priceImportModalOpen, setPriceImportModalOpen] = useState(false);

  // 상세보기 모달 상태
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailPart, setDetailPart] = useState<Part | null>(null);
  const [detailInventory, setDetailInventory] = useState<Inventory | null>(null);
  const [detailInbounds, setDetailInbounds] = useState<Inbound[]>([]);
  const [detailOutbounds, setDetailOutbounds] = useState<Outbound[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Zustand 스토어에서 실제 데이터 가져오기
  const { parts, isLoading, error, stats, fetchParts, fetchPartsStats, createPart, updatePart, updatePartStatus, deletePart, searchParts } = usePartsStore();

  // 단가 스토어
  const { latestPrices, pricesByPart, fetchLatestPrices, fetchPricesByPartId, createPrice, updatePrice, deletePrice } = usePartPriceStore();

  // 공급사 스토어
  const { suppliers, fetchSuppliers } = useSuppliersStore();

  // 공장 스토어 (옵저버 모드 확인용)
  const { isObserverMode } = useFactoryStore();

  // 단가 빠른 편집 Popover 상태
  const [pricePopoverOpen, setPricePopoverOpen] = useState<string | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState<number>(0);
  const [quickCurrency, setQuickCurrency] = useState<string>('₫');

  // 단가 추가/수정 모달 상태
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PartPrice | null>(null);
  const [priceForm] = Form.useForm();

  // 동적 필터 옵션 생성
  const getCategoryFilters = () => {
    const categories = [...new Set(parts.map(item => item.category).filter(Boolean))];
    return categories.map(cat => ({ text: cat, value: cat }));
  };

  const getUnitFilters = () => {
    const units = [...new Set(parts.map(item => item.unit).filter(Boolean))];
    return units.map(unit => ({ text: unit, value: unit }));
  };

  const getStatusFilters = () => {
    const statuses = [...new Set(parts.map(item => item.status).filter(Boolean))];
    return statuses.map(status => ({ text: status, value: status }));
  };

  // 모달 Select 옵션 생성 (실제 데이터 기반)
  const getAllCategories = () => {
    const categories = [...new Set(parts.map(item => item.category).filter(Boolean))];
    return categories.sort();
  };

  const getAllUnits = () => {
    const units = [...new Set(parts.map(item => item.unit).filter(Boolean))];
    return units.sort();
  };

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchParts();
    fetchPartsStats();
    fetchLatestPrices();
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색 처리 - searchText 변경 시에만 실행
  useEffect(() => {
    if (searchText) {
      searchParts(searchText);
    } else {
      fetchParts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const showAddModal = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // 상세보기 모달 열기
  const showDetailModal = async (part: Part) => {
    setDetailPart(part);
    setIsDetailModalOpen(true);
    setDetailLoading(true);

    try {
      // 재고 정보 조회
      const inventory = await getInventoryByPartId(part.part_id);
      setDetailInventory(inventory);

      // 최근 입고 내역 조회 (최근 5건)
      const { data: inboundData } = await supabase
        .from('inbound')
        .select(`
          *,
          suppliers(supplier_name)
        `)
        .eq('part_id', part.part_id)
        .order('inbound_date', { ascending: false })
        .limit(5);

      if (inboundData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDetailInbounds(inboundData.map((item: any) => ({
          ...item,
          supplier_name: item.suppliers?.supplier_name || ''
        })));
      }

      // 최근 출고 내역 조회 (최근 5건)
      const { data: outboundData } = await supabase
        .from('outbound')
        .select('*')
        .eq('part_id', part.part_id)
        .order('outbound_date', { ascending: false })
        .limit(5);

      if (outboundData) {
        setDetailOutbounds(outboundData as Outbound[]);
      }

      // 단가 이력 조회
      await fetchPricesByPartId(part.part_id);
    } catch (error) {
      console.error('상세 정보 조회 에러:', error);
      messageApi.error(t('common.error'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailPart(null);
    setDetailInventory(null);
    setDetailInbounds([]);
    setDetailOutbounds([]);
  };

  const showEditModal = (item: Part) => {
    setEditingItem(item);
    form.setFieldsValue({
      part_code: item.part_code,
      part_name: item.part_name,
      vietnamese_name: item.vietnamese_name,
      korean_name: item.korean_name,
      spec: item.spec,
      unit: item.unit,
      category: item.category,
      status: item.status,
      min_stock: item.min_stock,
      description: item.description,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (partId: string, currentStatus: string) => {
    try {
      // NEW, ACTIVE -> INACTIVE로 변경
      // INACTIVE, DISCONTINUED -> ACTIVE로 변경
      const newStatus = (currentStatus === 'NEW' || currentStatus === 'ACTIVE') ? 'INACTIVE' : 'ACTIVE';
      await updatePartStatus(partId, newStatus);
      messageApi.success(t('parts.statusUpdated'));
    } catch {
      messageApi.error(t('parts.statusUpdateError'));
    }
  };

  const handleDelete = (partId: string) => {
    Modal.confirm({
      title: t('parts.deleteConfirm'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deletePart(partId);
          messageApi.success(t('parts.partDeleted'));
        } catch {
          messageApi.error(t('parts.deleteError'));
        }
      },
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingItem) {
        // 기존 부품 수정 - 실제 Supabase에 업데이트
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { initial_quantity, ...updateValues } = values;
        await updatePart(editingItem.part_id, {
          ...updateValues,
          updated_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        });
        messageApi.success(t('parts.partUpdated'));
      } else {
        // 새 부품 추가 - 실제 Supabase에 추가
        const { initial_quantity, ...partValues } = values;
        await createPart({
          ...partValues,
          created_by: 'current_user', // TODO: 실제 사용자 정보로 교체
          updated_by: 'current_user',
        }, initial_quantity || 0);
        messageApi.success(t('parts.partAdded'));
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      messageApi.error(translateError(error instanceof Error ? error.message : t('common.error')));
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  // 빠른 단가 편집 저장
  const handleQuickPriceSave = async (partId: string) => {
    try {
      await createPrice({
        part_id: partId,
        unit_price: quickPriceValue,
        currency: quickCurrency,
        effective_from: dayjs().format('YYYY-MM-DD'),
        created_by: 'current_user',
        supplier_id: null,
      });
      messageApi.success(t('partPrice.priceAdded'));
      setPricePopoverOpen(null);
    } catch {
      messageApi.error(t('common.error'));
    }
  };

  // 단가 모달 열기 (추가)
  const showAddPriceModal = () => {
    setEditingPrice(null);
    priceForm.resetFields();
    priceForm.setFieldsValue({
      currency: '₫',
      effective_from: dayjs(),
    });
    setIsPriceModalOpen(true);
  };

  // 단가 모달 열기 (수정)
  const showEditPriceModal = (price: PartPrice) => {
    setEditingPrice(price);
    priceForm.setFieldsValue({
      unit_price: price.unit_price,
      currency: price.currency,
      effective_from: dayjs(price.effective_from),
      supplier_id: price.supplier_id,
    });
    setIsPriceModalOpen(true);
  };

  // 단가 모달 저장
  const handlePriceModalOk = async () => {
    try {
      const values = await priceForm.validateFields();
      const priceData = {
        ...values,
        effective_from: values.effective_from.format('YYYY-MM-DD'),
        part_id: detailPart!.part_id,
        created_by: 'current_user',
      };

      if (editingPrice) {
        await updatePrice(editingPrice.price_id, priceData);
        messageApi.success(t('partPrice.priceUpdated'));
      } else {
        await createPrice(priceData);
        messageApi.success(t('partPrice.priceAdded'));
      }

      setIsPriceModalOpen(false);
      priceForm.resetFields();
      if (detailPart) {
        fetchPricesByPartId(detailPart.part_id);
      }
    } catch {
      messageApi.error(t('common.error'));
    }
  };

  // 단가 삭제
  const handleDeletePrice = (priceId: string, partId: string) => {
    Modal.confirm({
      title: t('partPrice.deleteConfirm'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deletePrice(priceId, partId);
          messageApi.success(t('partPrice.priceDeleted'));
        } catch {
          messageApi.error(t('common.error'));
        }
      },
    });
  };

  const columns: ColumnsType<Part> = [
    {
      title: t('parts.partCode'),
      dataIndex: 'part_code',
      key: 'part_code',
      sorter: (a, b) => a.part_code.localeCompare(b.part_code),
      width: 120,
    },
    {
      title: t('parts.partName'),
      dataIndex: 'part_name',
      key: 'part_name',
      sorter: (a, b) => a.part_name.localeCompare(b.part_name),
    },
    {
      title: t('parts.vietnameseName'),
      dataIndex: 'vietnamese_name',
      key: 'vietnamese_name',
      sorter: (a, b) => (a.vietnamese_name || '').localeCompare(b.vietnamese_name || ''),
    },
    {
      title: t('parts.category'),
      dataIndex: 'category',
      key: 'category',
      width: 150,
      sorter: (a, b) => a.category.localeCompare(b.category),
      filters: getCategoryFilters(),
      onFilter: (value, record) => record.category === value,
      filterSearch: true,
    },
    {
      title: t('parts.unit'),
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      sorter: (a, b) => a.unit.localeCompare(b.unit),
      filters: getUnitFilters(),
      onFilter: (value, record) => record.unit === value,
      filterSearch: true,
    },
    {
      title: t('parts.minStock'),
      dataIndex: 'min_stock',
      key: 'min_stock',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.min_stock - b.min_stock,
    },
    {
      title: t('partPrice.latestPrice'),
      key: 'latest_price',
      width: 150,
      align: 'right' as const,
      render: (_: unknown, record: Part) => {
        const price = latestPrices[record.part_id];
        if (!price) {
          return <span style={{ color: '#999' }}>{t('partPrice.noPrice')}</span>;
        }
        const isInboundFallback = price.source === 'inbound';
        return (
          <Popover
            trigger="click"
            open={pricePopoverOpen === record.part_id}
            onOpenChange={(open) => {
              if (open) {
                setQuickPriceValue(price.unit_price);
                setQuickCurrency(price.currency);
                setPricePopoverOpen(record.part_id);
              } else {
                setPricePopoverOpen(null);
              }
            }}
            content={
              <Space direction="vertical" size="small" style={{ width: 200 }}>
                <InputNumber
                  value={quickPriceValue}
                  onChange={(v) => setQuickPriceValue(v || 0)}
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value?.replace(/,/g, '') || 0)}
                />
                <Select
                  value={quickCurrency}
                  onChange={setQuickCurrency}
                  style={{ width: '100%' }}
                >
                  <Option value="₫">₫ (VND)</Option>
                  <Option value="$">$ (USD)</Option>
                  <Option value="￥">￥ (CNY)</Option>
                </Select>
                <Space>
                  <Button size="small" type="primary" onClick={() => handleQuickPriceSave(record.part_id)}>
                    {t('partPrice.save')}
                  </Button>
                  <Button size="small" onClick={() => setPricePopoverOpen(null)}>
                    {t('partPrice.cancel')}
                  </Button>
                </Space>
              </Space>
            }
          >
            <span style={{ cursor: 'pointer', color: isInboundFallback ? '#faad14' : '#1890ff' }}>
              {price.unit_price.toLocaleString()} {price.currency}
              {isInboundFallback && <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>({t('partPrice.inboundPrice')})</span>}
            </span>
          </Popover>
        );
      },
    },
    {
      title: t('parts.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: getStatusFilters(),
      onFilter: (value, record) => record.status === value,
      filterSearch: true,
      render: (status: string) => {
        let color = 'default';
        if (status === 'ACTIVE') color = 'green';
        if (status === 'NEW') color = 'blue';
        if (status === 'INACTIVE') color = 'red';
        if (status === 'DISCONTINUED') color = 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: t('inventory.actions'),
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, record) => {
        const isActive = record.status === 'NEW' || record.status === 'ACTIVE';
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetailModal(record)}
            >
              {t('common.view')}
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
            >
              {t('common.edit')}
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => handleToggleStatus(record.part_id, record.status)}
            >
              {isActive ? t('parts.setInactive') : t('parts.setActive')}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.part_id)}
            >
              {t('common.delete')}
            </Button>
          </Space>
        );
      },
    },
  ];

  // Excel 내보내기
  const handleExportExcel = () => {
    exportToExcel(
      parts,
      [
        { header: t('parts.partCode'), key: 'part_code', width: 15 },
        { header: t('parts.partName'), key: 'part_name', width: 25 },
        { header: t('parts.vietnameseName'), key: 'vietnamese_name', width: 25 },
        { header: t('parts.category'), key: 'category', width: 15 },
        { header: t('parts.unit'), key: 'unit', width: 10 },
        { header: t('parts.minStock'), key: 'min_stock', width: 12 },
        { header: t('parts.status'), key: 'status', width: 12 },
      ],
      t('parts.title')
    );
    messageApi.success(t('common.exportExcel'));
  };

  if (error) {
    return (
      <Alert
        message={t('common.error')}
        description={translateError(error)}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      {contextHolder}
      <Space style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('parts.title')}
        </Title>
        <Space>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setPriceImportModalOpen(true)}
            disabled={isObserverMode}
          >
            {t('bulkImport.template.partPrices') || '단가 가져오기'}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            {t('parts.addPart')}
          </Button>
        </Space>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('parts.totalParts')}
                value={stats?.totalParts || 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('parts.activeParts')}
                value={stats?.activeParts || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('parts.categories')}
                value={stats?.categories || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('parts.inactiveParts')}
                value={stats?.inactiveParts || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
            <Input
              placeholder={t('common.search')}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
            >
              {t('common.exportExcel')}
            </Button>
          </Space>

          <ResizableTable
            columns={columns}
            dataSource={parts}
            rowKey="part_id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${t('common.total')} ${total} ${t('common.items')}`
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </Spin>

      <Modal
        title={editingItem ? t('parts.editPart') : t('parts.addPart')}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          name="partForm"
        >
          <Form.Item
            name="part_code"
            label={t('parts.partCode')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('parts.partCodePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="part_name"
            label={t('parts.partName')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="vietnamese_name"
            label={t('parts.vietnameseName')}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="korean_name"
            label={t('parts.koreanName')}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('parts.category')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select
              placeholder={t('common.selectCategory')}
              showSearch
              optionFilterProp="children"
            >
              {getAllCategories().map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="spec"
            label={t('parts.spec')}
          >
            <Input placeholder={t('parts.specPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="unit"
            label={t('parts.unit')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select
              placeholder={t('common.selectUnit')}
              showSearch
              optionFilterProp="children"
            >
              {getAllUnits().map(unit => (
                <Option key={unit} value={unit}>{unit}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="min_stock"
            label={t('parts.minStock')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* 새 부품 추가 시에만 현재 재고 입력 필드 표시 */}
          {!editingItem && (
            <Form.Item
              name="initial_quantity"
              label={t('parts.initialQuantity')}
              initialValue={0}
              tooltip={t('parts.initialQuantityTooltip')}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Form.Item
            name="status"
            label={t('parts.status')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select>
              <Option value="NEW">NEW</Option>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
              <Option value="DISCONTINUED">DISCONTINUED</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={t('parts.description')}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 부품 상세보기 모달 */}
      <Modal
        title={t('parts.viewDetail')}
        open={isDetailModalOpen}
        onCancel={closeDetailModal}
        footer={[
          <Button key="close" onClick={closeDetailModal}>
            {t('common.close')}
          </Button>
        ]}
        width={900}
      >
        <Spin spinning={detailLoading}>
          {detailPart && (
            <>
              {/* 부품 기본 정보 */}
              <Descriptions
                title={t('parts.basicInfo')}
                bordered
                column={{ xs: 1, sm: 2, md: 2 }}
                size="small"
              >
                <Descriptions.Item label={t('parts.partCode')}>
                  {detailPart.part_code}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.status')}>
                  <Tag color={
                    detailPart.status === 'ACTIVE' ? 'green' :
                    detailPart.status === 'NEW' ? 'blue' :
                    detailPart.status === 'INACTIVE' ? 'red' : 'orange'
                  }>
                    {detailPart.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.partName')}>
                  {detailPart.part_name}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.vietnameseName')}>
                  {detailPart.vietnamese_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.koreanName')}>
                  {detailPart.korean_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.category')}>
                  {detailPart.category}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.spec')}>
                  {detailPart.spec || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.unit')}>
                  {detailPart.unit}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.minStock')}>
                  {detailPart.min_stock}
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.description')} span={2}>
                  {detailPart.description || '-'}
                </Descriptions.Item>
              </Descriptions>

              {/* 재고 현황 */}
              <Divider />
              <Descriptions
                title={t('parts.inventoryStatus')}
                bordered
                column={{ xs: 1, sm: 2, md: 3 }}
                size="small"
              >
                <Descriptions.Item label={t('inventory.currentQuantity')}>
                  <span style={{
                    color: detailInventory && detailInventory.current_quantity < detailPart.min_stock ? '#ff4d4f' : '#52c41a',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {detailInventory?.current_quantity ?? 0}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('parts.minStock')}>
                  {detailPart.min_stock}
                </Descriptions.Item>
                <Descriptions.Item label={t('inventory.location')}>
                  {detailInventory?.location || 'main'}
                </Descriptions.Item>
              </Descriptions>

              {/* 단가 관리 */}
              <Divider />
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                <Title level={5} style={{ margin: 0 }}>{t('partPrice.title')}</Title>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={showAddPriceModal}>
                  {t('partPrice.addPrice')}
                </Button>
              </Space>

              {/* 현재 단가 표시 */}
              {latestPrices[detailPart.part_id] && (
                <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f6ffed' }}>
                  <Space>
                    <DollarOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {latestPrices[detailPart.part_id].unit_price.toLocaleString()} {latestPrices[detailPart.part_id].currency}
                    </span>
                    <Tag color="green">{t('partPrice.latestPrice')}</Tag>
                  </Space>
                </Card>
              )}

              {/* 단가 이력 테이블 */}
              <Table
                dataSource={pricesByPart[detailPart.part_id] || []}
                rowKey="price_id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: t('partPrice.effectiveDate'),
                    dataIndex: 'effective_from',
                    key: 'effective_from',
                    width: 110,
                  },
                  {
                    title: t('partPrice.unitPrice'),
                    dataIndex: 'unit_price',
                    key: 'unit_price',
                    width: 120,
                    align: 'right',
                    render: (value: number, record: PartPrice) =>
                      `${value.toLocaleString()} ${record.currency}`,
                  },
                  {
                    title: t('partPrice.supplier'),
                    dataIndex: 'supplier_name',
                    key: 'supplier_name',
                    width: 130,
                    render: (value: string) => value || '-',
                  },
                  {
                    title: t('inventory.actions'),
                    key: 'actions',
                    width: 120,
                    render: (_: unknown, record: PartPrice) => (
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => showEditPriceModal(record)}
                        />
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeletePrice(record.price_id, record.part_id)}
                        />
                      </Space>
                    ),
                  },
                ]}
                locale={{ emptyText: t('common.noData') }}
              />

              {/* 최근 입고 내역 */}
              <Divider />
              <Title level={5}>{t('parts.recentInbound')}</Title>
              <Table
                dataSource={detailInbounds}
                rowKey="inbound_id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: t('inbound.date'),
                    dataIndex: 'inbound_date',
                    key: 'inbound_date',
                    width: 100,
                  },
                  {
                    title: t('inbound.reference'),
                    dataIndex: 'reference_number',
                    key: 'reference_number',
                    width: 150,
                  },
                  {
                    title: t('inbound.supplier'),
                    dataIndex: 'supplier_name',
                    key: 'supplier_name',
                    width: 150,
                  },
                  {
                    title: t('inbound.quantity'),
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 80,
                    align: 'right',
                  },
                  {
                    title: t('inbound.unitPrice'),
                    dataIndex: 'unit_price',
                    key: 'unit_price',
                    width: 100,
                    align: 'right',
                    render: (value: number, record: Inbound) =>
                      value ? `${value.toLocaleString()} ${record.currency || 'VND'}` : '-',
                  },
                  {
                    title: t('inbound.totalPrice'),
                    dataIndex: 'total_price',
                    key: 'total_price',
                    width: 120,
                    align: 'right',
                    render: (value: number, record: Inbound) =>
                      value ? `${value.toLocaleString()} ${record.currency || 'VND'}` : '-',
                  },
                ]}
                locale={{ emptyText: t('common.noData') }}
              />

              {/* 최근 출고 내역 */}
              <Divider />
              <Title level={5}>{t('parts.recentOutbound')}</Title>
              <Table
                dataSource={detailOutbounds}
                rowKey="outbound_id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: t('outbound.date'),
                    dataIndex: 'outbound_date',
                    key: 'outbound_date',
                    width: 100,
                  },
                  {
                    title: t('outbound.reference'),
                    dataIndex: 'reference_number',
                    key: 'reference_number',
                    width: 150,
                  },
                  {
                    title: t('outbound.quantity'),
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 80,
                    align: 'right',
                  },
                  {
                    title: t('outbound.department'),
                    dataIndex: 'department',
                    key: 'department',
                    width: 120,
                  },
                  {
                    title: t('outbound.requester'),
                    dataIndex: 'requester',
                    key: 'requester',
                    width: 100,
                  },
                  {
                    title: t('outbound.reason'),
                    dataIndex: 'reason',
                    key: 'reason',
                    ellipsis: true,
                  },
                ]}
                locale={{ emptyText: t('common.noData') }}
              />
            </>
          )}
        </Spin>
      </Modal>
      {/* 단가 추가/수정 모달 */}
      <Modal
        title={editingPrice ? t('partPrice.editPrice') : t('partPrice.addPrice')}
        open={isPriceModalOpen}
        onOk={handlePriceModalOk}
        onCancel={() => { setIsPriceModalOpen(false); priceForm.resetFields(); }}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={500}
      >
        <Form form={priceForm} layout="vertical">
          <Form.Item
            name="unit_price"
            label={t('partPrice.unitPrice')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => Number(value?.replace(/,/g, '') || 0)} />
          </Form.Item>
          <Form.Item
            name="currency"
            label={t('partPrice.currency')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select>
              <Option value="₫">₫ (VND)</Option>
              <Option value="$">$ (USD)</Option>
              <Option value="￥">￥ (CNY)</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="effective_from"
            label={t('partPrice.effectiveDate')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier_id" label={t('partPrice.supplier')}>
            <Select allowClear placeholder={t('partPrice.supplier')}>
              {(suppliers || []).map((s: Supplier) => (
                <Option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 단가 일괄 가져오기 모달 */}
      <BulkImportModal
        open={priceImportModalOpen}
        onClose={() => setPriceImportModalOpen(false)}
        importType="partPrices"
        onSuccess={() => {
          fetchLatestPrices();
          setPriceImportModalOpen(false);
        }}
      />
    </div>
  );
};

export default Parts;
