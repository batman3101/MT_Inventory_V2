import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Tag, Spin, Alert, Row, Col, Statistic } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { supabase } from '../lib/supabase';
import { ResizableTable } from '../components/ResizableTable';
import dayjs from 'dayjs';

const { Title } = Typography;

interface User {
  user_id: string;
  username: string;
  email: string;
  role: string;
  department_id: string | null;
  status: string;
  created_at: string;
  last_login: string | null;
}

/**
 * Users (사용자 관리) 페이지
 *
 * ⚠️ 실제 Supabase 데이터를 사용합니다. Mock 데이터 없음!
 */
const Users = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
  });

  // 실제 Supabase에서 사용자 데이터 로드
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
      });
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: t('users.username'),
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: t('users.email'),
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: t('users.role'),
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const roleColors: Record<string, string> = {
          ADMIN: 'red',
          MANAGER: 'blue',
          USER: 'green',
          VIEWER: 'default',
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
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? t('users.active') : t('users.inactive')}
        </Tag>
      ),
    },
    {
      title: t('users.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: t('users.lastLogin'),
      dataIndex: 'last_login',
      key: 'last_login',
      width: 150,
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  // 검색 필터링
  const filteredUsers = users.filter(user => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
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
      <Space style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('users.title')}
        </Title>
      </Space>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title={t('users.totalUsers')}
                value={stats.totalUsers}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title={t('users.activeUsers')}
                value={stats.activeUsers}
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
            scroll={{ x: 1200 }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Users;
