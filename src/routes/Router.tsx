import { Navigate, useLocation, useRoutes } from 'react-router-dom';
import { ChatProvider } from 'src/context/ChatContext';
import { useAppSelector } from 'src/store/hooks';
import { selectToken } from 'src/store/selectors/authSelector';

/* ***Layouts**** */
import FullLayout from '../layouts/full/FullLayout';
import BlankLayout from '../layouts/blank/BlankLayout';

/* ****Apps***** */
import Chats from '../views/apps/chat/Chat';
// import Tickets from '../views/apps/tickets/Tickets';
import Calendar from '../views/apps/calendar/BigCalendar';
import AccountSetting from '../views/pages/account-setting/AccountSetting';

/* authentication */
import Login2 from '../views/authentication/auth2/Login2';
import Register from '../views/authentication/auth1/Register';
import Register2 from '../views/authentication/auth2/Register2';
import ForgotPassword from '../views/authentication/auth1/ForgotPassword';
import ForgotPassword2 from '../views/authentication/auth2/ForgotPassword2';
import TwoSteps from '../views/authentication/auth1/TwoSteps';
import TwoSteps2 from '../views/authentication/auth2/TwoSteps2';
import Error from '../views/authentication/Error';
import Maintenance from '../views/authentication/Maintenance';
import Tickets from 'src/views/apps/tickets/Tickets.tsx';
import { ReactElement } from 'react';

type RequireAuthType = {
  isAuthenticated: boolean;
  children: ReactElement;
};

const RequireAuth = ({ isAuthenticated, children }: RequireAuthType) => {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  return children;
};


const AppRoutes = () => {
  const token = localStorage.getItem('auth_token') || useAppSelector(selectToken);

  const routes = [
    {
      path: '/',
      element: (
        <RequireAuth isAuthenticated={!!token}>
          <FullLayout />
        </RequireAuth>
      ),
      children: [
        { path: '/', element: <Navigate to="/apps/orders" replace /> },
        {
          path: 'apps/chats',
          element: (
              <Chats />
          ),
        },
        {
          path: 'apps/orders',
          element: (
            <Tickets />
          ),
        },
        { path: 'apps/calendar', element: <Calendar /> },
        { path: 'pages/account-settings', element: <AccountSetting /> },
        { path: '*', element: <Navigate to="/auth/404" replace /> },
      ],
    },
    {
      path: '/',
      element: <BlankLayout />,
      children: [
        { path: 'auth/404', element: <Error /> },
        { path: 'auth/login', element: <Login2 /> },
        { path: 'auth/login2', element: <Login2 /> },
        // { path: 'auth/register', element: <Register /> },
        // { path: 'auth/register2', element: <Register2 /> },
        // { path: 'auth/forgot-password', element: <ForgotPassword /> },
        // { path: 'auth/forgot-password2', element: <ForgotPassword2 /> },
        // { path: 'auth/two-steps', element: <TwoSteps /> },
        // { path: 'auth/two-steps2', element: <TwoSteps2 /> },
        // { path: 'auth/maintenance', element: <Maintenance /> },
        { path: '*', element: <Navigate to="/auth/404" replace /> },
      ],
    },
  ];

  return useRoutes(routes);
};

export default AppRoutes;
