/* Galactus AI - Route Configuration */
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../layouts/Layout';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import HomePage from '../pages/HomePage';
import ProvidersPage from '../pages/ProvidersPage';
import UsagePage from '../pages/UsagePage';
import CombosPage from '../pages/CombosPage';
import SettingsPage from '../pages/SettingsPage';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
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