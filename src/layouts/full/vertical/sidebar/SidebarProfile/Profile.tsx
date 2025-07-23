import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';

import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconLogout, IconPower} from '@tabler/icons-react';
import PersonIcon from '@mui/icons-material/Person';

import { Link, useNavigate } from 'react-router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext } from 'react';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { logout } from 'src/store/slices/authSlice';
import { selecttClientFio } from 'src/store/selectors/authSelector';
import { logoutAll } from 'src/store/middleware/thunks.ts';

export const Profile = () => {
  const { isSidebarHover, isCollapse } = useContext(CustomizerContext);
  const fio = useAppSelector(selecttClientFio);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse == 'mini-sidebar' && !isSidebarHover : '';
  
  const handleLogout = () => {
    dispatch(logoutAll({
      login: localStorage.getItem('savedLogin') ?? '',
      password: localStorage.getItem('savedPassword') ?? ''}));
    dispatch(logout());
    navigate('/auth/login');
  };

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <PersonIcon />

          <Box>
            <Typography variant="h6">{fio?.lastName.trim()} {fio?.firstName.trim()} {fio?.middleName.trim()}</Typography>

          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Выйти" placement="top">
              <IconButton
                color="primary"
                onClick={handleLogout}
                aria-label="logout"
                size="small"
              >
                <IconLogout size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
