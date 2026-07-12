import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import AppShell from './app/components/layout/AppShell';
import LoginPage, { loginLoader } from './app/pages/LoginPage';
import DashboardPage from './app/pages/DashboardPage';
import InventoryPage from './app/pages/InventoryPage';
import ItemDetailPage from './app/pages/ItemDetailPage';
import AuditsPage from './app/pages/AuditsPage';
import LowStockPage from './app/pages/LowStockPage';
import ReportsPage from './app/pages/ReportsPage';
import UsersPage from './app/pages/UsersPage';
import SettingsIndex from './app/pages/settings/SettingsIndex';
import WarehousesSettings from './app/pages/settings/WarehousesSettings';
import CategoriesSettings from './app/pages/settings/CategoriesSettings';
import PersonnelSettings from './app/pages/settings/PersonnelSettings';
import SystemSettingsPage from './app/pages/settings/SystemSettingsPage';
import UsersSettings from './app/pages/settings/UsersSettings';
import { requireAuth, requireRole } from './app/routes';
import { queryClient } from './app/lib/query-client';
import './styles/index.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    loader: loginLoader,
  },
  {
    element: <AppShell />,
    loader: requireAuth,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'items/:id', element: <ItemDetailPage /> },
      { path: 'audits', element: <AuditsPage /> },
      { path: 'low-stock', element: <LowStockPage /> },
      { path: 'reports', element: <ReportsPage /> },
      {
        path: 'settings',
        element: <SettingsIndex />,
      },
      { path: 'settings/warehouses', element: <WarehousesSettings /> },
      { path: 'settings/categories', element: <CategoriesSettings /> },
      { path: 'settings/personnel', element: <PersonnelSettings /> },
      { path: 'settings/system', element: <SystemSettingsPage /> },
      { path: 'settings/users', element: <UsersSettings />, loader: requireRole('admin') },
      { path: 'users', element: <UsersPage />, loader: requireRole('admin') },
    ],
  },
]);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);