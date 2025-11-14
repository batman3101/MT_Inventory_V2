import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Modal, Form, message, InputNumber, Spin, Tag, Alert, Row, Col, Statistic } from 'antd';
import { EditOutlined, SearchOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useInventoryStore } from '../store';
import type { InventoryWithPart } from '../types/database.types';
import { exportToExcel } from '../utils/excelExport';
import { ResizableTable } from '../components/ResizableTable';
import dayjs from 'dayjs';

const { Title } = Typography;

/**
 * Inventory (재고) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Inventory = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryWithPart | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Zustand 스토어에서 실제 데이터 가져오기
  const { inventory, isLoading, error, stats, fetchInventory, fetchInventoryStats, updateInventory } = useInventoryStore();

  // 동적 필터 옵션 생성
  const getCategoryFilters = () => {
    const categories = [...new Set(inventory.map(item => item.part?.category).filter(Boolean))];
    return categories.map(cat => ({ text: cat as string, value: cat as string }));
  };

  const getUnitFilters = () => {
    const units = [...new Set(inventory.map(item => item.part?.unit).filter(Boolean))];
    return units.map(unit => ({ text: unit as string, value: unit as string }));
  };

  const getLocationFilters = () => {
    const locations = [...new Set(inventory.map(item => item.location).filter(Boolean))];
    return locations.map(loc => ({ text: loc, value: loc }));
  };

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchInventory();
    fetchInventoryStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showEditModal = (item: InventoryWithPart) => {
    setEditingItem(item);
    form.setFieldsValue({
      current_quantity: item.current_quantity,
      location: item.location,
    });
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingItem) {
        // 재고 수정 - 실제 Supabase에 업데이트
        await updateInventory(editingItem.inventory_id, {
          current_quantity: values.current_quantity,
          location: values.location,
          updated_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        });
        messageApi.success(t('inventory.itemUpdated'));
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

  const columns: ColumnsType<InventoryWithPart> = [
    {
      title: t('parts.partCode'),
      dataIndex: ['part', 'part_code'],
      key: 'part_code',
      sorter: (a, b) => (a.part?.part_code || '').localeCompare(b.part?.part_code || ''),
      width: 120,
    },
    {
      title: t('parts.partName'),
      dataIndex: ['part', 'part_name'],
      key: 'part_name',
      sorter: (a, b) => (a.part?.part_name || '').localeCompare(b.part?.part_name || ''),
    },
    {
      title: t('parts.category'),
      dataIndex: ['part', 'category'],
      key: 'category',
      width: 120,
      sorter: (a, b) => (a.part?.category || '').localeCompare(b.part?.category || ''),
      filters: getCategoryFilters(),
      onFilter: (value, record) => record.part?.category === value,
      filterSearch: true,
    },
    {
      title: t('inventory.currentQuantity'),
      dataIndex: 'current_quantity',
      key: 'current_quantity',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.current_quantity - b.current_quantity,
      render: (quantity: number, record: InventoryWithPart) => {
        const isLowStock = record.part && quantity < record.part.min_stock;
        return (
          <span style={{ color: isLowStock ? '#ff4d4f' : 'inherit', fontWeight: isLowStock ? 'bold' : 'normal' }}>
            {quantity}
            {isLowStock && <WarningOutlined style={{ marginLeft: 8, color: '#ff4d4f' }} />}
          </span>
        );
      },
    },
    {
      title: t('parts.minStock'),
      dataIndex: ['part', 'min_stock'],
      key: 'min_stock',
      width: 100,
      align: 'right',
      sorter: (a, b) => (a.part?.min_stock || 0) - (b.part?.min_stock || 0),
    },
    {
      title: t('parts.unit'),
      dataIndex: ['part', 'unit'],
      key: 'unit',
      width: 80,
      sorter: (a, b) => (a.part?.unit || '').localeCompare(b.part?.unit || ''),
      filters: getUnitFilters(),
      onFilter: (value, record) => record.part?.unit === value,
      filterSearch: true,
    },
    {
      title: t('inventory.location'),
      dataIndex: 'location',
      key: 'location',
      width: 120,
      sorter: (a, b) => a.location.localeCompare(b.location),
      filters: getLocationFilters(),
      onFilter: (value, record) => record.location === value,
      filterSearch: true,
      render: (location: string) => <Tag color="blue">{location}</Tag>,
    },
    {
      title: t('inventory.lastUpdate'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => dayjs(a.updated_at).diff(dayjs(b.updated_at)),
    },
    {
      title: t('inventory.actions'),
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)}>
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  // 검색 필터링
  const filteredItems = inventory.filter(item => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      item.part?.part_code.toLowerCase().includes(search) ||
      item.part?.part_name.toLowerCase().includes(search) ||
      item.part?.vietnamese_name.toLowerCase().includes(search) ||
      item.location.toLowerCase().includes(search)
    );
  });

  // Excel 내보내기
  const handleExportExcel = () => {
    exportToExcel(
      filteredItems,
      [
        { header: t('parts.partCode'), key: 'part.part_code', width: 15 },
        { header: t('parts.partName'), key: 'part.part_name', width: 25 },
        { header: t('parts.category'), key: 'part.category', width: 15 },
        { header: t('inventory.currentQuantity'), key: 'current_quantity', width: 15 },
        { header: t('parts.minStock'), key: 'part.min_stock', width: 12 },
        { header: t('parts.unit'), key: 'part.unit', width: 10 },
        { header: t('inventory.location'), key: 'location', width: 12 },
        { header: t('inventory.lastUpdate'), key: 'updated_at', width: 20 },
      ],
      t('inventory.title')
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
          {t('inventory.title')}
        </Title>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('inventory.totalItems')}
                value={stats?.totalItems || 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('inventory.totalQuantity')}
                value={stats?.totalQuantity || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('inventory.lowStockItems')}
                value={stats?.lowStockCount || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('inventory.totalLocations')}
                value={stats?.locations.length || 0}
                valueStyle={{ color: '#52c41a' }}
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
            <Space>
              <span>{t('common.total')}: {filteredItems.length} {t('common.items')}</span>
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
              >
                {t('common.exportExcel')}
              </Button>
            </Space>
          </Space>

          <ResizableTable
            columns={columns}
            dataSource={filteredItems}
            rowKey="inventory_id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${t('common.total')} ${total} ${t('common.items')}`
            }}
            scroll={{ x: 1200 }}
            rowClassName={(record) => {
              const isLowStock = record.part && record.current_quantity < record.part.min_stock;
              return isLowStock ? 'low-stock-row' : '';
            }}
          />
        </Card>
      </Spin>

      <Modal
        title={t('inventory.editItem')}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form
          form={form}
          layout="vertical"
          name="inventoryForm"
        >
          {editingItem && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <div><strong>{t('parts.partCode')}:</strong> {editingItem.part?.part_code}</div>
              <div><strong>{t('parts.partName')}:</strong> {editingItem.part?.part_name}</div>
            </div>
          )}

          <Form.Item
            name="current_quantity"
            label={t('inventory.currentQuantity')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="location"
            label={t('inventory.location')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .low-stock-row {
          background-color: #fff1f0;
        }
      `}</style>
    </div>
  );
};

export default Inventory;
