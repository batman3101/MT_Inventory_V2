import { createBrowserRouter, Outlet } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../pages/Dashboard';
import Inventory from '../pages/Inventory';
import Parts from '../pages/Parts';
import Inbound from '../pages/Inbound';
import Outbound from '../pages/Outbound';
import Suppliers from '../pages/Suppliers';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout><Outlet /></MainLayout>,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/inventory', element: <Inventory /> },
      { path: '/parts', element: <Parts /> },
      { path: '/inbound', element: <Inbound /> },
      { path: '/outbound', element: <Outbound /> },
      { path: '/suppliers', element: <Suppliers /> },
    ],
  },
]);

export default router;
