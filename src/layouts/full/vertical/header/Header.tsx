import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';

import config from 'src/context/config'
import { useContext } from "react";

import { IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import Notifications from './Notification';
import Profile from './Profile';
import Search from './Search';
import Language from './Language';
import Navigation from './Navigation';
import MobileRightSidebar from './MobileRightSidebar';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { updateOrdersType } from 'src/store/slices/ticketsSlice';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks';
import { selectOrdersType } from 'src/store/selectors/ticketsSelectors';
import { selectIsMultiuser } from 'src/store/selectors/authSelector';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));

  const TopbarHeight = config.topbarHeight;

    const dispatch = useAppDispatch();
    const orderView = useAppSelector(selectOrdersType);
    const setOrderView = (value: 'my' | 'all') => dispatch(updateOrdersType(value)); 

    const isMultiplyUsers = useAppSelector(selectIsMultiuser);
  
    const handleChange = (
      _: React.MouseEvent<HTMLElement>,
      newView: "my" | "all" | null
    ) => {
      if (newView){
        setOrderView(newView)
        dispatch(fetchUserOrders());
        dispatch(fetchMessages('123'));
      };
    };

  // drawer
  const { activeMode, setActiveMode, setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar } = useContext(CustomizerContext);


  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  let Title: string | null = null;

  switch (window.location.pathname) {
    case '/apps/orders':
      Title = 'Заказы';
      break;
    case '/pages/account-settings':
      Title = 'Настройки аккаунта';
      break;
    case '/apps/chats':
      Title = 'Чаты';
      break;
    case '/apps/calendar':
      Title = 'Календарь';
      break;
  }

  return !lgUp ?
      <AppBarStyled position="sticky" color="default">
        <ToolbarStyled>
          {/* ------------------------------------------- */}
          {/* Toggle Button Sidebar */}
          {/* ------------------------------------------- */}
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={() => {
              // Toggle sidebar on both mobile and desktop based on screen size
              if (lgUp) {
                // For large screens, toggle between full-sidebar and mini-sidebar
                isCollapse === "full-sidebar" ? setIsCollapse("mini-sidebar") : setIsCollapse("full-sidebar");
              } else {
                // For smaller screens, toggle mobile sidebar
                setIsMobileSidebar(!isMobileSidebar);
              }
            }}
          >
            <IconMenu2 size="20" />
          </IconButton>

          {/* ------------------------------------------- */}
          {/* Search Dropdown */}
          {/* ------------------------------------------- */}
          {/* <Search /> */}
          {lgUp ? (
            <>
              <Navigation />
            </>
          ) : null}



          {/* --- Центр (Заголовок) --- */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {Title && <Typography
              variant="body1"
              sx={{
                px: 2,
                py: 1,
                backgroundColor: 'primary.light',
                color: 'textSecondary',
                borderRadius: 1,
                marginLeft: 3
              }}
            >
              {Title}

            </Typography>}
          </Box>

          {isMultiplyUsers && (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mx: 1,
    }}
  >
    <ToggleButtonGroup
      value={orderView}
      exclusive
      onChange={handleChange}
      sx={{
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.08)',
        borderRadius: '50px',
        padding: '4px',
        minHeight: 34,
        '& .MuiToggleButton-root': {
          border: 'none',
          borderRadius: '30px',
          textTransform: 'none',
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '4px 12px',
          transition: 'all 0.25s ease',
          color: (theme) =>
            theme.palette.mode === 'dark'
              ? theme.palette.grey[300]
              : theme.palette.text.secondary,
          '&.Mui-selected': {
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark'
                ? theme.palette.primary.dark
                : theme.palette.primary.main,
            color: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          },
          '&:hover': {
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(0,0,0,0.1)',
          },
        },
      }}
    >
      <ToggleButton value="my">Мои</ToggleButton>
      <ToggleButton value="all">Все</ToggleButton>
    </ToggleButtonGroup>
  </Box>
)}


          {/* --- Правый блок --- */}
          <Stack spacing={1} direction="row" alignItems="center">
            <Profile />
          </Stack>
        </ToolbarStyled>
      </AppBarStyled> : <></>;
};

export default Header;
