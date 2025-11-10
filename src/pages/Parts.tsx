import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Modal, Form, message, Select, InputNumber, Spin, Tag, Alert, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePartsStore } from '../store';
import type { Part } from '../types/database.types';
import { exportToExcel } from '../utils/excelExport';
import { ResizableTable } from '../components/ResizableTable';

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

  // Zustand 스토어에서 실제 데이터 가져오기
  const { parts, isLoading, error, stats, fetchParts, fetchPartsStats, createPart, updatePart, deletePart, searchParts } = usePartsStore();

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchParts();
    fetchPartsStats();
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
        await updatePart(editingItem.part_id, {
          ...values,
          updated_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        });
        messageApi.success(t('parts.partUpdated'));
      } else {
        // 새 부품 추가 - 실제 Supabase에 추가
        await createPart({
          ...values,
          created_by: 'current_user', // TODO: 실제 사용자 정보로 교체
          updated_by: 'current_user',
        });
        messageApi.success(t('parts.partAdded'));
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
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
    },
    {
      title: t('parts.category'),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: [
        { text: 'SPINDLE', value: 'SPINDLE' },
        { text: 'MOTOR', value: 'MOTOR' },
        { text: 'BEARING', value: 'BEARING' },
        { text: 'TOOL', value: 'TOOL' },
        { text: 'ELECTRIC', value: 'ELECTRIC' },
        { text: 'OTHER', value: 'OTHER' },
      ],
      onFilter: (value, record) => record.category === value,
    },
    {
      title: t('parts.unit'),
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      filters: [
        { text: 'EA', value: 'EA' },
        { text: 'SET', value: 'SET' },
        { text: 'M', value: 'M' },
        { text: 'KG', value: 'KG' },
        { text: 'L', value: 'L' },
      ],
      onFilter: (value, record) => record.unit === value,
    },
    {
      title: t('parts.minStock'),
      dataIndex: 'min_stock',
      key: 'min_stock',
      width: 100,
      align: 'right',
    },
    {
      title: t('parts.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'NEW', value: 'NEW' },
        { text: 'ACTIVE', value: 'ACTIVE' },
        { text: 'INACTIVE', value: 'INACTIVE' },
        { text: 'DISCONTINUED', value: 'DISCONTINUED' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        let color = 'default';
        if (status === 'ACTIVE') color = 'green';
        if (status === 'NEW') color = 'blue';
        if (status === 'INACTIVE') color = 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: t('inventory.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)}>
            {t('common.edit')}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.part_id)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
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
          {t('parts.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          {t('parts.addPart')}
        </Button>
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
            <Select placeholder={t('common.selectCategory')}>
              <Option value="SPINDLE">SPINDLE</Option>
              <Option value="MOTOR">MOTOR</Option>
              <Option value="BEARING">BEARING</Option>
              <Option value="TOOL">TOOL</Option>
              <Option value="ELECTRIC">ELECTRIC</Option>
              <Option value="OTHER">OTHER</Option>
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
            <Select placeholder={t('common.selectUnit')}>
              <Option value="EA">EA</Option>
              <Option value="SET">SET</Option>
              <Option value="M">M</Option>
              <Option value="KG">KG</Option>
              <Option value="L">L</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="min_stock"
            label={t('parts.minStock')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

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
    </div>
  );
};

export default Parts;
