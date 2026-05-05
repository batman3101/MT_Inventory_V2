import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, Grid, Drawer, Button, theme } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import { ObserverModeIndicator } from '../ObserverModeIndicator';

const { Content, Header } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = !screens.md;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && <Sidebar />}
      <Layout>
        {isMobile && (
          <Header
            style={{
              background: token.colorBgContainer,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              aria-label="메뉴 열기"
            />
          </Header>
        )}
        <Content
          role="main"
          aria-label={t('common.mainContent')}
          style={{
            padding: 24,
            background: token.colorBgLayout,
            overflow: 'auto',
          }}
        >
          <ObserverModeIndicator />
          {children}
        </Content>
      </Layout>
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={256}
        styles={{ body: { padding: 0 } }}
        title={null}
        closable={false}
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </Drawer>
    </Layout>
  );
};

export default MainLayout;
