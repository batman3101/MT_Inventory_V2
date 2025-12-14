import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Menu, Button, message } from 'antd';
import {
  DashboardOutlined,
  InboxOutlined,
  AppstoreOutlined,
  LoginOutlined,
  LogoutOutlined,
  TeamOutlined,
  PoweroffOutlined,
  UserOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import LanguageSwitcher from '../LanguageSwitcher';
import { useAuthStore } from '../../store';
import AlmusLogo from '../../../assets/images/ALMUS_SYMBOL.png';
import WorkerImage from '../../../assets/images/worker2.png';

const { Sider } = Layout;

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuthStore();
  const [messageApi, contextHolder] = message.useMessage();

  const handleLogout = async () => {
    try {
      await signOut();
      messageApi.success(t('auth.logout'));
      navigate('/login');
    } catch {
      messageApi.error(t('auth.loginError'));
    }
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('nav.dashboard'),
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: t('nav.inventory'),
    },
    {
      key: '/parts',
      icon: <AppstoreOutlined />,
      label: t('nav.parts'),
    },
    {
      key: '/inbound',
      icon: <LoginOutlined />,
      label: t('nav.inbound'),
    },
    {
      key: '/outbound',
      icon: <LogoutOutlined />,
      label: t('nav.outbound'),
    },
    {
      key: '/suppliers',
      icon: <TeamOutlined />,
      label: t('nav.suppliers'),
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: t('nav.users'),
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: t('nav.analytics'),
    },
  ];

  return (
    <Sider
      theme="dark"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 'bold',
          color: '#fff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '12px',
        }}
      >
        <img src={AlmusLogo} alt="ALMUS" style={{ height: 40, width: 'auto' }} />
        {t('app.title')}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ marginTop: 16 }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div 
          style={{ 
            marginBottom: 16, 
            display: 'flex', 
            justifyContent: 'center',
            maxHeight: '120px',
            overflow: 'hidden',
          }}
        >
          <img 
            src={WorkerImage} 
            alt="Worker" 
            className="sidebar-worker-image"
            style={{ 
              width: '80%', 
              maxWidth: '100%',
              height: 'auto', 
              maxHeight: '120px',
              objectFit: 'contain',
              borderRadius: 8 
            }} 
          />
        </div>
        {user && (
          <div style={{ marginBottom: 12, color: '#fff', fontSize: 12, textAlign: 'center' }}>
            {user.email}
          </div>
        )}
        <Button
          type="primary"
          danger
          icon={<PoweroffOutlined />}
          onClick={handleLogout}
          block
          style={{ marginBottom: 12 }}
        >
          {t('auth.logout')}
        </Button>
        <LanguageSwitcher />
      </div>
      {contextHolder}
    </Sider>
  );
};

export default Sidebar;
