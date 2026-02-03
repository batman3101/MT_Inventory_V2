import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import { ObserverModeIndicator } from '../ObserverModeIndicator';

const { Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Content
          style={{
            padding: 24,
            background: '#f0f2f5',
            overflow: 'auto',
          }}
        >
          <ObserverModeIndicator />
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
