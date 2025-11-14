import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Modal, Form, message, Select, Spin, Alert, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSuppliersStore } from '../store';
import type { Supplier } from '../types/database.types';
import { exportToExcel } from '../utils/excelExport';
import { ResizableTable } from '../components/ResizableTable';

const { Title } = Typography;
const { Option } = Select;

/**
 * Suppliers (공급업체) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Suppliers = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Zustand 스토어에서 실제 데이터 가져오기
  const { suppliers, isLoading, error, fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, searchSuppliers } = useSuppliersStore();

  // 동적 필터 옵션 생성
  const getCountryFilters = () => {
    const countries = [...new Set(suppliers.map(item => item.country).filter(Boolean))];
    return countries.map(country => ({ text: country, value: country }));
  };

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색 처리 - searchText 변경 시에만 실행
  useEffect(() => {
    if (searchText) {
      searchSuppliers(searchText);
    } else {
      fetchSuppliers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const showAddModal = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const showEditModal = (item: Supplier) => {
    setEditingItem(item);
    form.setFieldsValue({
      supplier_code: item.supplier_code,
      supplier_name: item.supplier_name,
      contact_person: item.contact_person,
      email: item.email,
      phone: item.phone,
      address: item.address,
      country: item.country,
      website: item.website,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (supplierId: string) => {
    Modal.confirm({
      title: t('suppliers.deleteConfirm'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteSupplier(supplierId);
          messageApi.success(t('suppliers.supplierDeleted'));
        } catch {
          messageApi.error(t('suppliers.deleteError'));
        }
      },
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingItem) {
        // 기존 공급업체 수정 - 실제 Supabase에 업데이트
        await updateSupplier(editingItem.supplier_id, {
          ...values,
          updated_by: 'current_user', // TODO: 실제 사용자 정보로 교체
        });
        messageApi.success(t('suppliers.supplierUpdated'));
      } else {
        // 새 공급업체 추가 - 실제 Supabase에 추가
        await createSupplier({
          ...values,
          created_by: 'current_user', // TODO: 실제 사용자 정보로 교체
          updated_by: 'current_user',
        });
        messageApi.success(t('suppliers.supplierAdded'));
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

  const columns: ColumnsType<Supplier> = [
    {
      title: t('suppliers.code'),
      dataIndex: 'supplier_code',
      key: 'supplier_code',
      sorter: (a, b) => a.supplier_code.localeCompare(b.supplier_code),
      width: 120,
    },
    {
      title: t('suppliers.name'),
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      sorter: (a, b) => a.supplier_name.localeCompare(b.supplier_name),
    },
    {
      title: t('suppliers.contact'),
      dataIndex: 'contact_person',
      key: 'contact_person',
      sorter: (a, b) => (a.contact_person || '').localeCompare(b.contact_person || ''),
    },
    {
      title: t('suppliers.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      sorter: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
    },
    {
      title: t('suppliers.email'),
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: t('suppliers.country'),
      dataIndex: 'country',
      key: 'country',
      width: 100,
      sorter: (a, b) => (a.country || '').localeCompare(b.country || ''),
      filters: getCountryFilters(),
      onFilter: (value, record) => record.country === value,
      filterSearch: true,
    },
    {
      title: t('suppliers.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: 'NEW', value: 'NEW' },
        { text: 'ACTIVE', value: 'ACTIVE' },
        { text: 'INACTIVE', value: 'INACTIVE' },
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
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.supplier_id)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  // Excel 내보내기
  const handleExportExcel = () => {
    exportToExcel(
      suppliers,
      [
        { header: t('suppliers.code'), key: 'supplier_code', width: 15 },
        { header: t('suppliers.name'), key: 'supplier_name', width: 25 },
        { header: t('suppliers.contact'), key: 'contact_person', width: 20 },
        { header: t('suppliers.phone'), key: 'phone', width: 18 },
        { header: t('suppliers.email'), key: 'email', width: 25 },
        { header: t('suppliers.country'), key: 'country', width: 15 },
        { header: t('suppliers.address'), key: 'address', width: 30 },
        { header: t('suppliers.status'), key: 'status', width: 12 },
      ],
      t('suppliers.title')
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
      <Title level={2} style={{ marginBottom: 24 }}>
        {t('suppliers.title')}
      </Title>

      <Spin spinning={isLoading}>
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
              <span>{t('common.total')}: {suppliers.length} {t('common.items')}</span>
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
              >
                {t('common.exportExcel')}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
                {t('suppliers.addSupplier')}
              </Button>
            </Space>
          </Space>

          <ResizableTable
            columns={columns}
            dataSource={suppliers}
            rowKey="supplier_id"
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
        title={editingItem ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
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
          name="supplierForm"
        >
          <Form.Item
            name="supplier_code"
            label={t('suppliers.code')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('suppliers.codePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="supplier_name"
            label={t('suppliers.name')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="contact_person"
            label={t('suppliers.contact')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label={t('suppliers.phone')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('suppliers.email')}
            rules={[{ type: 'email', message: t('common.invalidEmail') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="country"
            label={t('suppliers.country')}
          >
            <Input placeholder={t('suppliers.countryPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="website"
            label={t('suppliers.website')}
          >
            <Input placeholder={t('suppliers.websitePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="status"
            label={t('suppliers.status')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select placeholder={t('common.selectStatus')}>
              <Option value="NEW">NEW</Option>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="address"
            label={t('suppliers.address')}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Suppliers;
