import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Row, Col, Statistic, Modal, Form, message, DatePicker, Select, Spin, Alert, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);
import { useOutboundStore, usePartsStore, useDepartmentsStore } from '../store';
import type { Outbound } from '../types/database.types';
import { exportToExcel } from '../utils/excelExport';
import { ResizableTable } from '../components/ResizableTable';
import { generateOutboundReferenceNumber } from '../services/outbound.service';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * Outbound (출고) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Outbound = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Outbound | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Zustand 스토어에서 실제 데이터 가져오기
  const { outbounds, isLoading, error, stats, fetchOutbounds, fetchOutboundStats, createOutbound, updateOutbound, deleteOutbound } = useOutboundStore();
  const { parts, fetchParts } = usePartsStore();
  const { departments, fetchDepartments } = useDepartmentsStore();

  // 동적 필터 옵션 생성
  const getDepartmentFilters = () => {
    const deptNames = [...new Set(outbounds.map(item => item.department_name).filter(Boolean))];
    return deptNames.map(name => ({ text: name, value: name }));
  };

  const getPartCodeFilters = () => {
    const partCodes = [...new Set(outbounds.map(item => item.part_code).filter(Boolean))];
    return partCodes.map(code => ({ text: code, value: code }));
  };

  const getReasonFilters = () => {
    const reasons = [...new Set(outbounds.map(item => item.reason).filter(Boolean))];
    return reasons.map(reason => ({ text: reason, value: reason }));
  };

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchOutbounds();
    fetchOutboundStats();
    fetchParts();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAddModal = async () => {
    setEditingItem(null);
    form.resetFields();
    // 오늘 날짜로 참조번호 자동 생성
    const today = dayjs();
    const refNumber = await generateOutboundReferenceNumber(today.format('YYYY-MM-DD'));
    setReferenceNumber(refNumber);
    form.setFieldsValue({
      outbound_date: today,
    });
    setIsModalOpen(true);
  };

  const showEditModal = (item: Outbound) => {
    setEditingItem(item);
    setReferenceNumber(item.reference_number || '');
    form.setFieldsValue({
      part_id: item.part_id,
      department_id: item.department_id,
      quantity: item.quantity,
      outbound_date: item.outbound_date ? dayjs(item.outbound_date) : undefined,
      requester: item.requester,
      department: item.department,
      reason: item.reason,
      equipment: item.equipment,
      notes: item.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (outboundId: string) => {
    Modal.confirm({
      title: t('outbound.deleteConfirm'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteOutbound(outboundId);
          messageApi.success(t('outbound.outboundDeleted'));
        } catch {
          messageApi.error(t('outbound.deleteError'));
        }
      },
    });
  };

  // 출고 날짜 변경 시 참조번호 재생성
  const handleDateChange = async (date: Dayjs | null) => {
    if (date && !editingItem) {
      const refNumber = await generateOutboundReferenceNumber(date.format('YYYY-MM-DD'));
      setReferenceNumber(refNumber);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        outbound_date: values.outbound_date.format('YYYY-MM-DD'),
        reference_number: referenceNumber,
      };

      if (editingItem) {
        // 기존 출고 수정 - 실제 Supabase에 업데이트
        await updateOutbound(editingItem.outbound_id, formattedValues);
        messageApi.success(t('outbound.outboundUpdated'));
      } else {
        // 새 출고 추가 - 실제 Supabase에 추가
        await createOutbound({
          ...formattedValues,
          created_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        });
        messageApi.success(t('outbound.outboundAdded'));
      }

      setIsModalOpen(false);
      form.resetFields();
      setReferenceNumber('');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setReferenceNumber('');
  };

  const columns: ColumnsType<Outbound> = [
    {
      title: t('outbound.reference'),
      dataIndex: 'reference_number',
      key: 'reference_number',
      width: 140,
      sorter: (a, b) => (a.reference_number || '').localeCompare(b.reference_number || ''),
    },
    {
      title: t('outbound.outboundDate'),
      dataIndex: 'outbound_date',
      key: 'outbound_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.outbound_date).diff(dayjs(b.outbound_date)),
    },
    {
      title: t('outbound.department'),
      dataIndex: 'department_name',
      key: 'department_name',
      width: 150,
      sorter: (a, b) => (a.department_name || '').localeCompare(b.department_name || ''),
      filters: getDepartmentFilters(),
      onFilter: (value, record) => record.department_name === value,
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
      title: t('outbound.partName'),
      dataIndex: 'part_name',
      key: 'part_name',
      sorter: (a, b) => (a.part_name || '').localeCompare(b.part_name || ''),
    },
    {
      title: t('outbound.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (quantity: number, record: Outbound) => `${quantity.toLocaleString()} ${record.part_unit || ''}`,
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: t('outbound.requester'),
      dataIndex: 'requester',
      key: 'requester',
      width: 120,
      sorter: (a, b) => (a.requester || '').localeCompare(b.requester || ''),
    },
    {
      title: t('outbound.reason'),
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      sorter: (a, b) => (a.reason || '').localeCompare(b.reason || ''),
      filters: getReasonFilters(),
      onFilter: (value, record) => record.reason === value,
      filterSearch: true,
    },
    {
      title: t('outbound.equipment'),
      dataIndex: 'equipment',
      key: 'equipment',
      width: 120,
      sorter: (a, b) => (a.equipment || '').localeCompare(b.equipment || ''),
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
          <Button type="link" size="small" danger onClick={() => handleDelete(record.outbound_id)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  // 검색 및 날짜 필터링
  const filteredList = outbounds.filter(item => {
    // 검색 필터
    if (searchText) {
      const search = searchText.toLowerCase();
      const matchesSearch =
        item.reference_number?.toLowerCase().includes(search) ||
        item.department_name?.toLowerCase().includes(search) ||
        item.part_code?.toLowerCase().includes(search) ||
        item.part_name?.toLowerCase().includes(search) ||
        item.requester?.toLowerCase().includes(search) ||
        item.reason?.toLowerCase().includes(search) ||
        item.equipment?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // 날짜 필터
    if (dateRange[0] && dateRange[1]) {
      const itemDate = dayjs(item.outbound_date);
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
        { header: t('outbound.reference'), key: 'reference_number', width: 18 },
        { header: t('outbound.outboundDate'), key: 'outbound_date', width: 15 },
        { header: t('outbound.department'), key: 'department_name', width: 20 },
        { header: t('parts.partCode'), key: 'part_code', width: 15 },
        { header: t('outbound.partName'), key: 'part_name', width: 25 },
        { header: t('outbound.quantity'), key: 'quantity', width: 12 },
        { header: t('outbound.requester'), key: 'requester', width: 15 },
        { header: t('outbound.reason'), key: 'reason', width: 20 },
        { header: t('outbound.equipment'), key: 'equipment', width: 15 },
      ],
      t('outbound.title')
    );
    messageApi.success(t('common.exportExcel'));
  };

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
      {contextHolder}
      <Space style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('outbound.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          {t('outbound.newOutbound')}
        </Button>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('outbound.totalQuantity')}
                value={stats?.totalQuantity || 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('outbound.totalCount')}
                value={stats?.totalCount || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('outbound.byDepartment')}
                value={Object.keys(stats?.byDepartment || {}).length}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('outbound.byReason')}
                value={Object.keys(stats?.byReason || {}).length}
                valueStyle={{ color: '#52c41a' }}
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
            rowKey="outbound_id"
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
        title={editingItem ? t('outbound.editOutbound') : t('outbound.newOutbound')}
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
          name="outboundForm"
        >
          <Form.Item
            label={t('outbound.reference')}
          >
            <Input value={referenceNumber} disabled style={{ color: '#000', fontWeight: 'bold' }} />
          </Form.Item>

          <Form.Item
            name="part_id"
            label={t('outbound.part')}
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
            name="department_id"
            label={t('outbound.department')}
          >
            <Select
              showSearch
              placeholder={t('common.selectDepartment')}
              optionFilterProp="children"
              allowClear
            >
              {departments.map(dept => (
                <Option key={dept.department_id} value={dept.department_id}>
                  {dept.department_code} - {dept.department_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="outbound_date"
            label={t('outbound.outboundDate')}
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
            label={t('outbound.quantity')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="requester"
            label={t('outbound.requester')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('outbound.requesterPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="department"
            label={t('outbound.departmentName')}
          >
            <Input placeholder={t('outbound.departmentNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="reason"
            label={t('outbound.reason')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('outbound.reasonPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="equipment"
            label={t('outbound.equipment')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('outbound.equipmentPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="notes"
            label={t('outbound.notes')}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Outbound;
