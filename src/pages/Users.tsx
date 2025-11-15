import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Tag, Spin, Alert, Row, Col, Statistic, Modal, Form, Select, message } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ResizableTable } from '../components/ResizableTable';
import dayjs from 'dayjs';
import { useUsersStore } from '../store';
import type { User } from '../types/database.types';

const { Title } = Typography;
const { Option } = Select;

/**
 * Users (사용자 관리) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Users = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Zustand 스토어에서 실제 데이터 가져오기
  const { users, isLoading, error, stats, fetchUsers, fetchUsersStats, createUser, updateUser, updateUserStatus, deleteUser, activateAllUsers } = useUsersStore();

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    fetchUsers();
    fetchUsersStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAddModal = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const showEditModal = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      phone_number: user.phone_number,
      position: user.position,
      is_active: user.is_active,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus(userId, !currentStatus);
      messageApi.success(!currentStatus ? '사용자가 활성화되었습니다' : '사용자가 비활성화되었습니다');
    } catch {
      messageApi.error('사용자 상태 변경 중 오류가 발생했습니다');
    }
  };

  const handleDelete = (userId: string, username: string) => {
    Modal.confirm({
      title: t('users.deleteConfirm'),
      content: `사용자 "${username}"를 삭제하시겠습니까?`,
      okText: t('common.yes'),
      cancelText: t('common.no'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteUser(userId);
          messageApi.success(t('users.userDeleted'));
        } catch {
          messageApi.error(t('users.deleteError'));
        }
      },
    });
  };

  const handleActivateAll = () => {
    Modal.confirm({
      title: '모든 사용자 활성화',
      content: '모든 사용자를 활성화하시겠습니까?',
      okText: t('common.yes'),
      cancelText: t('common.no'),
      onOk: async () => {
        try {
          await activateAllUsers();
          messageApi.success('모든 사용자가 활성화되었습니다');
        } catch {
          messageApi.error('사용자 활성화 중 오류가 발생했습니다');
        }
      },
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        // 기존 사용자 수정
        await updateUser(editingUser.user_id, values);
        messageApi.success(t('users.userUpdated'));
      } else {
        // 새 사용자 추가
        await createUser({
          ...values,
          department: values.department_id || null,
          user_settings: {},
          profile_image_url: null,
          last_password_change: null,
          login_attempt_count: 0,
          account_expiry_date: null,
          password_hash: 'temporary_hash', // TODO: 실제 패스워드 해싱 필요
        });
        messageApi.success(t('users.userAdded'));
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

  // 동적 필터 옵션 생성
  const getRoleFilters = () => {
    const roles = [...new Set(users.map(item => item.role).filter(Boolean))];
    return roles.map(role => ({
      text: t(`users.roles.${role.toLowerCase()}`) || role,
      value: role
    }));
  };

  const getStatusFilters = () => {
    return [
      { text: t('users.active'), value: true },
      { text: t('users.inactive'), value: false },
    ];
  };

  const columns: ColumnsType<User> = [
    {
      title: t('users.username'),
      dataIndex: 'username',
      key: 'username',
      width: 150,
      sorter: (a, b) => (a.username || '').localeCompare(b.username || ''),
    },
    {
      title: '성명',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 150,
      sorter: (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
    },
    {
      title: t('users.email'),
      dataIndex: 'email',
      key: 'email',
      width: 200,
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: t('users.role'),
      dataIndex: 'role',
      key: 'role',
      width: 120,
      sorter: (a, b) => (a.role || '').localeCompare(b.role || ''),
      filters: getRoleFilters(),
      onFilter: (value, record) => record.role === value,
      render: (role: string) => {
        const roleColors: Record<string, string> = {
          system_admin: 'red',
          admin: 'red',
          manager: 'blue',
          user: 'green',
          viewer: 'default',
        };
        return (
          <Tag color={roleColors[role] || 'default'}>
            {t(`users.roles.${role.toLowerCase()}`) || role}
          </Tag>
        );
      },
    },
    {
      title: t('users.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      sorter: (a, b) => Number(a.is_active) - Number(b.is_active),
      filters: getStatusFilters(),
      onFilter: (value, record) => record.is_active === value,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? t('users.active') : t('users.inactive')}
        </Tag>
      ),
    },
    {
      title: '직책',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (position: string | null) => position || '-',
    },
    {
      title: t('users.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a, b) => dayjs(a.created_at).diff(dayjs(b.created_at)),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: t('inventory.actions'),
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => showEditModal(record)}>
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleStatus(record.user_id, record.is_active)}
          >
            {record.is_active ? '비활성화' : '활성화'}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record.user_id, record.username)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  // 검색 필터링
  const filteredUsers = users.filter(user => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

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
          {t('users.title')}
        </Title>
        <Space>
          <Button onClick={handleActivateAll}>
            모든 사용자 활성화
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            {t('users.addUser')}
          </Button>
        </Space>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title={t('users.totalUsers')}
                value={stats?.totalUsers || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title={t('users.activeUsers')}
                value={stats?.activeUsers || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<UserOutlined />}
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
            <span>{t('common.total')}: {filteredUsers.length} {t('common.items')}</span>
          </Space>

          <ResizableTable
            columns={columns}
            dataSource={filteredUsers}
            rowKey="user_id"
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
        title={editingUser ? t('users.editUser') : t('users.addUser')}
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
          name="userForm"
        >
          <Form.Item
            name="username"
            label={t('users.username')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder="사용자명" />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="성명"
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder="전체 이름" />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('users.email')}
            rules={[
              { required: true, message: t('common.required') },
              { type: 'email', message: t('common.invalidEmail') }
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="role"
            label={t('users.role')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select placeholder="역할 선택">
              <Option value="system_admin">{t('users.roles.system_admin') || 'System Admin'}</Option>
              <Option value="admin">{t('users.roles.admin') || 'Admin'}</Option>
              <Option value="manager">{t('users.roles.manager') || 'Manager'}</Option>
              <Option value="user">{t('users.roles.user') || 'User'}</Option>
              <Option value="viewer">{t('users.roles.viewer') || 'Viewer'}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="phone_number"
            label="전화번호"
          >
            <Input placeholder="+84 123 456 789" />
          </Form.Item>

          <Form.Item
            name="position"
            label="직책"
          >
            <Input placeholder="예: 팀장, 매니저" />
          </Form.Item>

          <Form.Item
            name="department_id"
            label="부서 ID"
          >
            <Input placeholder="부서 UUID (선택사항)" />
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="is_active"
              label={t('users.status')}
              valuePropName="checked"
            >
              <Select>
                <Option value={true}>{t('users.active')}</Option>
                <Option value={false}>{t('users.inactive')}</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
