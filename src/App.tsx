import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext, useEffect } from 'react';
import AppRoutes from './routes/Router';
import api from './store/api';
import { setClient } from './store/slices/authSlice';
import { getContragent } from './store/middleware/thunks/contragentThunks';
import FilePreviewDialog from './components/apps/popUpFiles/FileDialog';
import PushManagerFloatingButton from './components/notifications/PushManagerFloatingButton';
import { connectWebSocket, getSocket, getCurrentUserId } from './websocket';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {selecttClientEmail, selectToken} from './store/selectors/authSelector';
import './text.css';
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks.ts';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks.ts';
import { setPath } from 'src/store/slices/appSlice.ts';
import useDynamicVh from 'src/hooks/useDinamivVH.ts';
import ErrorBoundary from './ErrorBoundary';


function App() {
  console.log('Vite React app started');

  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);
  const email = useAppSelector(selecttClientEmail);

  useEffect(() => {
    if (token) {
      const fetchUserData = async () => {

        const response = await api.get('/getUserData');

        await Promise.all([
          dispatch(setClient(response.data)),
          dispatch(getContragent()),
          dispatch(fetchUserOrders()),
        ]);

        dispatch(fetchMessages(response.data.userId));

        if (response.data.email && response.data.userId) {
          connectWebSocket(response.data.email, response.data.userId, dispatch); // <== передаём один раз
        }

      };

      fetchUserData();
    }
  }, [token]);

  useDynamicVh();

  useEffect(() => {
    const handleVisibilityChange = () => {
      const socket = getSocket();
      const userId = getCurrentUserId();

      if (document.visibilityState === 'visible' && socket?.readyState !== WebSocket.OPEN && email) {
        console.log('🔄 Вкладка снова активна. Переподключаем WebSocket...');
        connectWebSocket(email, userId, dispatch); // <== теперь без dispatch, он сохранён
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);


  const RouteTracker = () => {
    const location = useLocation();
    const dispatch = useAppDispatch();

    useEffect(() => {
      const item =
        location.state?.item ?? new URLSearchParams(location.search).get('item');

      dispatch(
        setPath({
          ...location,
          item,
        })
      );
    }, [location.key]);

    return null;
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
      <PushManagerFloatingButton/>
      <RTL direction={activeDir}>
        <CssBaseline />
        <BrowserRouter>
          <RouteTracker />
          <AppRoutes />
          <FilePreviewDialog />
        </BrowserRouter>
      </RTL>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

export default App;
