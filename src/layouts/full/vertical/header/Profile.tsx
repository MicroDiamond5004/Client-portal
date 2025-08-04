// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Box,
  Menu,
  Avatar,
  Typography,
  Divider,
  Button,
  IconButton,
  Stack
} from '@mui/material';
import * as dropdownData from './data';

import { IconMail } from '@tabler/icons-react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import ProfileImg from 'src/assets/images/profile/user-1.jpg';
import unlimitedImg from 'src/assets/images/backgrounds/unlimited-bg.png';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { logout } from 'src/store/slices/authSlice';
import { selecttClientFio } from 'src/store/selectors/authSelector';

const Profile = () => {
  const [anchorEl2, setAnchorEl2] = useState(null);
  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth/login');
  };

  const fio = useAppSelector(selecttClientFio);

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="show 11 new notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === 'object' && {
            color: 'primary.main',
          }),
        }}
        onClick={handleClick2}
      >
        <AccountCircleIcon
          sx={{
            width: 35,
            height: 35,
          }}
        />
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
            p: 4,
          },
        }}
      >
        <Typography variant="h5">Профиль</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <AccountCircleIcon sx={{ width: 95, height: 95 }} />
          <Box>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
              {fio?.lastName} {fio?.firstName} {fio?.middleName}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              Клиент
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              display="flex"
              alignItems="center"
              gap={1}
            >
              {/* <IconMail width={15} height={15} />
              info@modernize.com */}
            </Typography>
          </Box>
        </Stack>
        {/*<Divider />*/}
        {/* {dropdownData.profile.map((profile) => (
          <Box key={profile.title}>
            <Box sx={{ py: 2, px: 0 }} className="hover-text-primary">
              <Link to={profile.href}>
                <Stack direction="row" spacing={2}>
                  <Box
                    width="45px"
                    height="45px"
                    bgcolor="primary.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Avatar
                      src={profile.icon}
                      alt={profile.icon}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="textPrimary"
                      className="text-hover"
                      noWrap
                      sx={{
                        width: '240px',
                      }}
                    >
                      {profile.title}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      variant="subtitle2"
                      sx={{
                        width: '240px',
                      }}
                      noWrap
                    >
                      {profile.subtitle}
                    </Typography>
                  </Box>
                </Stack>
              </Link>
            </Box>
          </Box>
        ))}*/}
        <Box mt={2}>
          {/* <Box bgcolor="primary.light" p={3} mb={3} overflow="hidden" position="relative">
            <Box display="flex" justifyContent="space-between">
              <Box>
                <Typography variant="h5" mb={2}>
                  Unlimited <br />
                  Access
                </Typography>
                <Button variant="contained" color="primary">
                  Upgrade
                </Button>
              </Box>
              <img src={unlimitedImg} alt="unlimited" className="signup-bg"></img>
            </Box>
          </Box>  */}
          <Button onClick={handleLogout} variant="outlined" color="primary" fullWidth>
            Выйти
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
