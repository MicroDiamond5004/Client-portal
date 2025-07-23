// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { CardContent, Grid, Typography, MenuItem, Box, Avatar, Button, Stack } from '@mui/material';

// components
import BlankCard from '../../shared/BlankCard';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel';
import CustomSelect from '../../forms/theme-elements/CustomSelect';

// images
import user1 from 'src/assets/images/profile/user-1.jpg';
import { useAppSelector } from 'src/store/hooks';
import { selectContragent, selecttClientEmail, selecttClientFio, selecttClientPhone } from 'src/store/selectors/authSelector';

import { Visibility, VisibilityOff } from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';


interface locationType {
  value: string;
  label: string;
}

// locations
const locations: locationType[] = [
  {
    value: 'us',
    label: 'United States',
  },
  {
    value: 'uk',
    label: 'United Kingdom',
  },
  {
    value: 'india',
    label: 'India',
  },
  {
    value: 'russia',
    label: 'Russia',
  },
];

// currency
const currencies: locationType[] = [
  {
    value: 'us',
    label: 'US Dollar ($)',
  },
  {
    value: 'uk',
    label: 'United Kingdom (Pound)',
  },
  {
    value: 'india',
    label: 'India (INR)',
  },
  {
    value: 'russia',
    label: 'Russia (Ruble)',
  },
];

const AccountTab = () => {
  const [location, setLocation] = React.useState('india');

  const handleChange1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(event.target.value);
  };

  const [showPassword, setShowPassword] = React.useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };


  //   currency
  const [currency, setCurrency] = React.useState('india');

  const handleChange2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrency(event.target.value);
  };

  
  const fio = useAppSelector(selecttClientFio);
  const contragent = useAppSelector(selectContragent);
  const email = useAppSelector(selecttClientEmail);
  const phone = useAppSelector(selecttClientPhone);
  const password = localStorage.getItem('savedPassword');

  return (
    (<Grid container spacing={3}>
  <Grid item xs={12}>
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={1}>
          Настройки профиля
        </Typography>
        <Typography color="textSecondary" mb={3}>
          Вы можете поменять логин и пароль здесь
        </Typography>
        <form>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <CustomFormLabel htmlFor="text-name">Имя</CustomFormLabel>
              <CustomTextField
                id="text-name"
                value={`${fio?.lastName} ${fio?.firstName} ${fio?.middleName}`}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <CustomFormLabel htmlFor="text-store-name">Компания</CustomFormLabel>
              <CustomTextField
                id="text-store-name"
                value={contragent}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <CustomFormLabel htmlFor="text-phone">Телефон</CustomFormLabel>
              <CustomTextField
                id="text-phone"
                value={phone}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>

            <Grid item xs={12}>
              <CustomFormLabel htmlFor="text-email">Логин (Email)</CustomFormLabel>
              <CustomTextField
                id="text-email"
                value={email}
                variant="outlined"
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <CustomFormLabel htmlFor="text-password">Пароль</CustomFormLabel>
              <CustomTextField
                id="text-password"
                type={showPassword ? 'text' : 'password'}
                value={password ?? ''}
                variant="outlined"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </BlankCard>

    <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
      <Button size="large" variant="contained" color="primary">
        Сохранить
      </Button>
      <Button size="large" variant="text" color="error">
        Отменить
      </Button>
    </Stack>
  </Grid>
</Grid>
)
  );
};

export default AccountTab;
