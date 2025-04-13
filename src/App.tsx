import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider, useLocation, useNavigate } from 'react-router';
import router from './routes/Router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext, useEffect } from 'react';
import PushManagerComponent from './utils/pushSubscribe';


function App() {

  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);
  
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);   

  return (
    <ThemeProvider theme={theme}>
      <PushManagerComponent />
      <RTL direction={activeDir}>
        <CssBaseline />
        <RouterProvider router={router} />
      </RTL>
    </ThemeProvider>
  );
}

export default App;
