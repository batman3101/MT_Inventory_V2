import { createBrowserRouter, Outlet } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Inventory from '../pages/Inventory';
import Parts from '../pages/Parts';
import InboundPage from '../pages/Inbound';
import OutboundPage from '../pages/Outbound';
import Suppliers from '../pages/Suppliers';
import Users from '../pages/Users';
import Analytics from '../pages/Analytics';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout>
          <Outlet />
        </MainLayout>
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/inventory', element: <Inventory /> },
      { path: '/parts', element: <Parts /> },
      { path: '/inbound', element: <InboundPage /> },
      { path: '/outbound', element: <OutboundPage /> },
      { path: '/suppliers', element: <Suppliers /> },
      { path: '/users', element: <Users /> },
      { path: '/analytics', element: <Analytics /> },
    ],
  },
]);

export default router;
