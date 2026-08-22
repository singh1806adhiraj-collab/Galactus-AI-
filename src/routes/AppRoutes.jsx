/* Galactus AI - Route Configuration */
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../layouts/Layout';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import ProvidersPage from '../pages/ProvidersPage';
import UsagePage from '../pages/UsagePage';
import CombosPage from '../pages/CombosPage';
import SettingsPage from '../pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'providers',
        element: <ProvidersPage />,
      },
      {
        path: 'usage',
        element: <UsagePage />,
      },
      {
        path: 'combos',
        element: <CombosPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

export default router;