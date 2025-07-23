import React, { useEffect, useRef, useState, FormEvent } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Divider,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';

import CustomCheckbox from 'src/components/forms/theme-elements/CustomCheckbox';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { fetchAuthToken } from 'src/store/middleware/thunks/tokenThunks';
import { selectToken, selecttClientEmail, selectClientId } from 'src/store/selectors/authSelector';
import { unwrapResult } from '@reduxjs/toolkit';
import { loginType } from 'src/types/auth/auth';
import axios from 'axios';
import { setClient } from 'src/store/slices/authSlice';
import api from 'src/store/api';

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const token = useAppSelector(selectToken);
  const currentEmail = useAppSelector(selecttClientEmail);
  const currentClientId = useAppSelector(selectClientId);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [invite, setInvite] = useState<string | null>(null);
  const [isCodeSend, setIsCodeSend] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isEqual, setIsEqual] = useState<boolean>(true);
  const [emailCode, setEmailCode] = useState<string>('');
  const [inviteSign, setInviteSign] = useState<string | null>('');

  const middleNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const secondPasswordRef = useRef<HTMLInputElement>(null);
  const confirmCodeRef = useRef<HTMLInputElement>(null);
  const approvePasswordRef = useRef<HTMLInputElement>(null);

  const [fio, setFio] = useState<{
    "firstname": string,
    "lastname": string,
    "middlename": string} | null>(null);


  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }

  const onChangeMainPassword = (evt: any) => {
    if ((evt.target?.value?.length || 0) < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      setIsEqual(false);
    } else if (approvePasswordRef.current?.value?.length === 0) {
      setError('Введите пароль еще раз!');
      setIsEqual(false);
    } else {
      setError(null);
      setIsEqual(true);
    } 
  }

  useEffect(() => {
    if (isEqual) {
      setTimeout(() => setError(null), 2000);
    }
    const user = searchParams.get('invite');

    const fetchUser = async () => {
      const response = await fetch(`/api/getUserEmail/${user}`);
      const data = await response.json();

      if (data?.email) {
        setInvite(data.email);
        setFio(data.fullname);
      }
    }

    fetchUser();
  }, []);

  // Восстановление сохранённых данных
  useEffect(() => {
    const savedLogin = localStorage.getItem('savedLogin');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedLogin && usernameRef.current) usernameRef.current.value = savedLogin;
    if (savedPassword && passwordRef.current) passwordRef.current.value = savedPassword;
    if (savedLogin && savedPassword) setRememberMe(true);
  }, []);

  // Редирект при наличии токена
  useEffect(() => {
    const updateAndNavigate = async () => {
      if (token || localStorage.getItem('auth_token')) {
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        const NotificationAPIExists = typeof window.Notification !== 'undefined';
        const permissionGranted =
          NotificationAPIExists && Notification.permission === 'granted';

        if (!isIOS && NotificationAPIExists && permissionGranted) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            const subscription = await registration.pushManager.getSubscription();

            if (subscription?.endpoint) {
              await api.post('/change-subscription', {
                endpoint: subscription.endpoint,
                newUserId: currentClientId,
                newEmail: currentEmail,
              });
              // console.log('✅ iOS подписка обновлена');
            }
          } catch (err) {
            console.error('❌ Ошибка при обновлении подписки на iOS:', err);
          }
        }

        navigate('/');
      }
    };

    updateAndNavigate();
  }, [token]);



  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const triggerError = (message: string) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    const user = searchParams.get('invite');

    e.preventDefault();
    const login = usernameRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    if (isApproved) {
      try {
        const response = await axios.post(`/api/${user}/finish`, {
          "emailConfirmCode": emailCode,
          "fullname": {
            "firstname": fio?.firstname,
            "lastname": fio?.lastname,
            "middlename": fio?.middlename
          }, 
          "inviteSign": inviteSign ? inviteSign : '',
          "needToken": true,
          "password": secondPasswordRef.current?.value
        });

        const actionResult = await dispatch(fetchAuthToken({ login: invite ?? '', password: secondPasswordRef.current?.value ?? ''}));
        const { token } = unwrapResult(actionResult);

        const fetchUserData = async () => {
          const response = await api.get('/getUserData');
          dispatch(setClient(response.data));
        }
      
        fetchUserData();
  
        console.log(actionResult);

        if (response.status !== 201) {
          setError("Неверный код подтверждения");
        } else {
          setIsApproved(true);
        }
      } catch (err) {
        setError("Неверный код подтверждения");
      }
    }
    else if (isCodeSend) {
      const code = confirmCodeRef.current?.value ?? '';
      try {
        const response = await axios.post(`/api/${user}/checkCode`, {
          emailConfirmCode: code
        });

        if (response.status !== 201) {
          setError("Неверный код подтверждения");
        } else {
          const data = response.data;

          console.log(data);
      
          setError(null);
          setEmailCode(data.emailConfirmCode);
          setIsApproved(true);
        }
      } catch (err) {
        setError("Неверный код подтверждения");
      }

    } else if (invite && !isCodeSend) {
      const response = await axios.post(`/api/${user}/sendCode`, {
        email: invite
      });

      setInviteSign(searchParams.get('sign') ?? null)

      if (response.status === 201) {
        setIsCodeSend(true);
      }
    } else {
      if (rememberMe) {
        localStorage.setItem('savedLogin', login);
        localStorage.setItem('savedPassword', password);
      } else {
        localStorage.removeItem('savedLogin');
        localStorage.removeItem('savedPassword');
      }
  
      try {
        const actionResult = await dispatch(fetchAuthToken({ login, password }));
        const { token } = unwrapResult(actionResult);

        console.log(token, 'ffffffff');
  
        console.log(actionResult);
  
        if (!token) {
          triggerError('Неверный логин или пароль');
        }

        const fetchUserData = async () => {
          const response = await api.get('/getUserData');
          dispatch(setClient(response.data));
        }
      
        fetchUserData();
      } catch (err: any) {
          triggerError(err);
      }
    }
  };

  const onChangePassword = (evt: any) => {
    console.log(evt.target.value);
    if (evt.target.value !== secondPasswordRef.current?.value) {
      setError('Пароли должны совпадать!');
    } else {
      setError(null);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, -6, 6, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        {(invite || title) && (
          <Typography variant="h3" fontWeight={700} mb={1}>
            {title ?? 'Приглашение на портал'}
          </Typography>
        )}

        {subtext}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {invite ? isApproved ? <>
          <Box>
            <CustomFormLabel htmlFor="lastName">Фамилия*</CustomFormLabel>
            <CustomTextField
              id="lastName"
              fullWidth
              inputRef={lastNameRef}
              variant="outlined"
              value={fio?.lastname}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="name">Имя*</CustomFormLabel>
            <CustomTextField
              id="name"
              fullWidth
              inputRef={nameRef}
              variant="outlined"
              value={fio?.firstname}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="name">Отчество</CustomFormLabel>
            <CustomTextField
              id="middleName"
              fullWidth
              inputRef={middleNameRef}
              variant="outlined"
              value={fio?.middlename}
            />
          </Box>
          <Box mt={5}>
            <CustomFormLabel htmlFor="password">Пароль*</CustomFormLabel>
            <CustomTextField
              id="password"
              fullWidth
              inputRef={secondPasswordRef}
              variant="outlined"
              onChange={onChangeMainPassword}
            />
          </Box>
          <Box mt={5}>
            <CustomFormLabel htmlFor="reapeatPassword">Повторите пароль*</CustomFormLabel>
            <CustomTextField
              id="reapeatPassword"
              inputRef={approvePasswordRef}
              fullWidth
              variant="outlined"
              onChange={onChangePassword}
              required
            />
          </Box>
          <Button sx={{marginTop: '1rem'}}
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={error ? true : false}
          >
            Войти в систему
          </Button>
        </> : <>
          <Box>
            <CustomFormLabel htmlFor="username">Электронная почта*</CustomFormLabel>
            <CustomTextField
              id="username"
              fullWidth
              autoComplete="username"
              inputRef={usernameRef}
              variant="outlined"
              value={invite}
              disabled={isCodeSend}
            />
          </Box>

          {isCodeSend && <>
            <Box>
            <CustomFormLabel htmlFor="confirmeCode">Код подтверждения</CustomFormLabel>
            <CustomTextField
              id="confirmeCode"
              type="text"
              fullWidth
              inputRef={confirmCodeRef}
              variant="outlined"
              placeholder="Введите код подтверждения"
            />
          </Box>
          </>} 

          <Button sx={{marginTop: '1rem'}}
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
             {isCodeSend ? 'Подтвердить' : 'Отправить проверочный код'} 
          </Button>
        </> : <><Stack spacing={2}>
          <Box>
            <CustomFormLabel htmlFor="username">Логин</CustomFormLabel>
            <CustomTextField
              id="username"
              fullWidth
              autoComplete="username"
              inputRef={usernameRef}
              variant="outlined"
            />
          </Box>

          <Box>
            <CustomFormLabel htmlFor="password">Пароль</CustomFormLabel>
            <CustomTextField
              id="password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              autoComplete="current-password"
              inputRef={passwordRef}
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePasswordVisibility} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center" my={1}>
            <FormGroup>
              <FormControlLabel
                control={
                  <CustomCheckbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                }
                label="Запомнить это устройство"
              />
            </FormGroup>
            <Typography
              component={Link}
              to="/auth/forgot-password"
              fontWeight={500}
              sx={{ textDecoration: 'none', color: 'primary.main' }}
            >
              Забыли пароль?
            </Typography>
          </Stack>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Войти
          </Button>

          {subtitle && <Divider>{subtitle}</Divider>}
        </Stack></>}
      </motion.div>
    </form>
  );
};

export default AuthLogin;
