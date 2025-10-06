import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack, Typography } from '@mui/material';

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

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));

  const TopbarHeight = config.topbarHeight;

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

          {/* --- Правый блок --- */}
          <Stack spacing={1} direction="row" alignItems="center">
            <Profile />
          </Stack>
        </ToolbarStyled>
      </AppBarStyled> : <></>;
};

export default Header;
