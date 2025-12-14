import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Row, Col, Statistic, Modal, Form, message, DatePicker, Select, Spin, Alert, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);
import { useInboundStore, usePartsStore, useSuppliersStore } from '../store';
import type { Inbound } from '../types/database.types';
import { exportToExcel } from '../utils/excelExport';
import { translateError } from '../utils/errorTranslation';
import { ResizableTable } from '../components/ResizableTable';
import { generateInboundReferenceNumber } from '../services/inbound.service';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * Inbound (입고) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Inbound = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inbound | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Zustand 스토어에서 실제 데이터 가져오기
  const { inbounds, isLoading, error, stats, fetchInbounds, fetchInboundStats, createInbound, updateInbound, deleteInbound } = useInboundStore();
  const { parts, fetchParts } = usePartsStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();

  // 동적 필터 옵션 생성
  const getSupplierFilters = () => {
    const supplierNames = [...new Set(inbounds.map(item => item.supplier_name).filter(Boolean))];
    return supplierNames.map(name => ({ text: name, value: name }));
  };

  const getPartCodeFilters = () => {
    const partCodes = [...new Set(inbounds.map(item => item.part_code).filter(Boolean))];
    return partCodes.map(code => ({ text: code, value: code }));
  };

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchInbounds();
    fetchInboundStats();
    fetchParts();
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAddModal = async () => {
    setEditingItem(null);
    form.resetFields();
    // 오늘 날짜로 참조번호 자동 생성
    const today = dayjs();
    const refNumber = await generateInboundReferenceNumber(today.format('YYYY-MM-DD'));
    setReferenceNumber(refNumber);
    form.setFieldsValue({
      inbound_date: today,
    });
    setIsModalOpen(true);
  };

  const showEditModal = (item: Inbound) => {
    setEditingItem(item);
    setReferenceNumber(item.reference_number || '');
    form.setFieldsValue({
      part_id: item.part_id,
      supplier_id: item.supplier_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      inbound_date: item.inbound_date ? dayjs(item.inbound_date) : undefined,
      currency: item.currency || '₫',
      notes: item.notes,
    });
    setIsModalOpen(true);
  };

  // 입고 날짜 변경 시 참조번호 재생성
  const handleDateChange = async (date: Dayjs | null) => {
    if (date && !editingItem) {
      const refNumber = await generateInboundReferenceNumber(date.format('YYYY-MM-DD'));
      setReferenceNumber(refNumber);
    }
  };

  const handleDelete = (inboundId: string) => {
    Modal.confirm({
      title: t('inbound.deleteConfirm'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteInbound(inboundId);
          messageApi.success(t('inbound.inboundDeleted'));
        } catch {
          messageApi.error(t('inbound.deleteError'));
        }
      },
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        inbound_date: values.inbound_date.format('YYYY-MM-DD'),
        total_price: values.quantity * values.unit_price,
        reference_number: referenceNumber,
      };

      if (editingItem) {
        // 기존 입고 수정 - 실제 Supabase에 업데이트
        await updateInbound(editingItem.inbound_id, formattedValues);
        messageApi.success(t('inbound.inboundUpdated'));
      } else {
        // 새 입고 추가 - 실제 Supabase에 추가
        await createInbound({
          ...formattedValues,
          created_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        });
        messageApi.success(t('inbound.inboundAdded'));
      }

      setIsModalOpen(false);
      form.resetFields();
      setReferenceNumber('');
    } catch (error) {
      messageApi.error(translateError(error instanceof Error ? error.message : t('common.error')));
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setReferenceNumber('');
  };

  const columns: ColumnsType<Inbound> = [
    {
      title: t('inbound.reference'),
      dataIndex: 'reference_number',
      key: 'reference_number',
      width: 140,
      sorter: (a, b) => (a.reference_number || '').localeCompare(b.reference_number || ''),
    },
    {
      title: t('inbound.receiveDate'),
      dataIndex: 'inbound_date',
      key: 'inbound_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.inbound_date).diff(dayjs(b.inbound_date)),
    },
    {
      title: t('inbound.supplier'),
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      sorter: (a, b) => (a.supplier_name || '').localeCompare(b.supplier_name || ''),
      filters: getSupplierFilters(),
      onFilter: (value, record) => record.supplier_name === value,
      filterSearch: true,
    },
    {
      title: t('parts.partCode'),
      dataIndex: 'part_code',
      key: 'part_code',
      width: 120,
      sorter: (a, b) => (a.part_code || '').localeCompare(b.part_code || ''),
      filters: getPartCodeFilters(),
      onFilter: (value, record) => record.part_code === value,
      filterSearch: true,
    },
    {
      title: t('inbound.partName'),
      dataIndex: 'part_name',
      key: 'part_name',
      sorter: (a, b) => (a.part_name || '').localeCompare(b.part_name || ''),
    },
    {
      title: t('inbound.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (quantity: number, record: Inbound) => `${quantity.toLocaleString()} ${record.part_unit || ''}`,
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: t('inbound.unitPrice'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right',
      sorter: (a, b) => (a.unit_price || 0) - (b.unit_price || 0),
      render: (price: number, record: Inbound) => price ? `${price.toLocaleString()} ${record.currency || '₫'}` : '-',
    },
    {
      title: t('inbound.totalPrice'),
      dataIndex: 'total_price',
      key: 'total_price',
      width: 140,
      align: 'right',
      sorter: (a, b) => (a.total_price || 0) - (b.total_price || 0),
      render: (price: number, record: Inbound) => price ? `${price.toLocaleString()} ${record.currency || '₫'}` : '-',
    },
    {
      title: t('inventory.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => showEditModal(record)}>
            {t('common.edit')}
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.inbound_id)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  // 검색 및 날짜 필터링
  const filteredList = inbounds.filter(item => {
    // 검색 필터
    if (searchText) {
      const search = searchText.toLowerCase();
      const matchesSearch =
        item.reference_number?.toLowerCase().includes(search) ||
        item.supplier_name?.toLowerCase().includes(search) ||
        item.part_code?.toLowerCase().includes(search) ||
        item.part_name?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // 날짜 필터
    if (dateRange[0] && dateRange[1]) {
      const itemDate = dayjs(item.inbound_date);
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      if (!itemDate.isBetween(startDate, endDate, null, '[]')) {
        return false;
      }
    }

    return true;
  });

  // Excel 내보내기
  const handleExportExcel = () => {
    exportToExcel(
      filteredList,
      [
        { header: t('inbound.reference'), key: 'reference_number', width: 18 },
        { header: t('inbound.date'), key: 'inbound_date', width: 15 },
        { header: t('inbound.supplier'), key: 'supplier_name', width: 20 },
        { header: t('parts.partCode'), key: 'part_code', width: 15 },
        { header: t('inbound.partName'), key: 'part_name', width: 25 },
        { header: t('inbound.quantity'), key: 'quantity', width: 12 },
        { header: t('inbound.unitPrice'), key: 'unit_price', width: 15 },
        { header: t('inbound.totalPrice'), key: 'total_price', width: 15 },
        { header: t('inbound.currency'), key: 'currency', width: 10 },
      ],
      t('inbound.title')
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
          {t('inbound.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          {t('inbound.newInbound')}
        </Button>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={t('inbound.totalQuantity')}
                value={stats?.totalQuantity || 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={t('inbound.totalCount')}
                value={stats?.totalCount || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={t('inbound.totalValue')}
                value={stats?.totalValue || 0}
                precision={0}
                valueStyle={{ color: '#52c41a' }}
                suffix="₫"
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space direction="vertical" style={{ marginBottom: 16, width: '100%' }} size="middle">
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <Input
                  placeholder={t('common.search')}
                  prefix={<SearchOutlined />}
                  style={{ width: 300 }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                  format="YYYY-MM-DD"
                  placeholder={[t('common.startDate'), t('common.endDate')]}
                  style={{ width: 260 }}
                  allowClear
                />
                <Button
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setSearchText('');
                    setDateRange([null, null]);
                  }}
                >
                  {t('common.resetFilter')}
                </Button>
              </Space>
              <Space>
                <span>{t('common.total')}: {filteredList.length} {t('common.items')}</span>
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  onClick={handleExportExcel}
                >
                  {t('common.exportExcel')}
                </Button>
              </Space>
            </Space>
          </Space>

          <ResizableTable
            columns={columns}
            dataSource={filteredList}
            rowKey="inbound_id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${t('common.total')} ${total} ${t('common.items')}`
            }}
            scroll={{ x: 1400 }}
          />
        </Card>
      </Spin>

      <Modal
        title={editingItem ? t('inbound.editInbound') : t('inbound.newInbound')}
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
          name="inboundForm"
        >
          <Form.Item
            label={t('inbound.reference')}
          >
            <Input value={referenceNumber} disabled style={{ color: '#000', fontWeight: 'bold' }} />
          </Form.Item>

          <Form.Item
            name="part_id"
            label={t('inbound.part')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select
              showSearch
              placeholder={t('common.selectPart')}
              optionFilterProp="children"
            >
              {parts.map(part => (
                <Option key={part.part_id} value={part.part_id}>
                  {part.part_code} - {part.part_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="supplier_id"
            label={t('inbound.supplier')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select
              showSearch
              placeholder={t('common.selectSupplier')}
              optionFilterProp="children"
            >
              {suppliers.map(supplier => (
                <Option key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.supplier_code} - {supplier.supplier_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="inbound_date"
            label={t('inbound.receiveDate')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              onChange={handleDateChange}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label={t('inbound.quantity')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="unit_price"
            label={t('inbound.unitPrice')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} addonAfter="₫" />
          </Form.Item>

          <Form.Item
            name="currency"
            label={t('inbound.currency')}
            initialValue="₫"
          >
            <Select>
              <Option value="₫">VND (₫)</Option>
              <Option value="$">USD ($)</Option>
              <Option value="￥">CNY (￥)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label={t('inbound.notes')}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inbound;
