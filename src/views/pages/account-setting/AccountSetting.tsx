// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as React from 'react';
import PageContainer from 'src/components/container/PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import { Grid, Tabs, Tab, Box, CardContent, Divider } from '@mui/material';
import { Theme, useMediaQuery } from '@mui/system';

// components
import AccountTab from '../../../components/pages/account-setting/AccountTab';
import { IconArticle, IconBell, IconLock, IconUserCircle } from '@tabler/icons-react';
import BlankCard from '../../../components/shared/BlankCard';
import NotificationTab from '../../../components/pages/account-setting/NotificationTab';
import BillsTab from '../../../components/pages/account-setting/BillsTab';
import SecurityTab from '../../../components/pages/account-setting/SecurityTab';
import { useAppSelector } from 'src/store/hooks';
import { selectContragent, selecttClientFio } from 'src/store/selectors/authSelector';

const BCrumb = [
  {
    to: '/',
    title: 'Главная',
  },
  {
    title: 'Настройки аккаунта',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AccountSetting = () => {
  const [value, setValue] = React.useState(0);
  const isMobile = !useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <PageContainer title="Настройки аккаунта" description="Настройки аккаунта">
      {!isMobile && <Breadcrumb title="Настройки аккаунта" />}
          <BlankCard>
            {/* <Box sx={{ maxWidth: { xs: 320, sm: 480 } }}>
              <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="account settings tabs"
              >
                <Tab
                  icon={<IconUserCircle size="22" />}
                  iconPosition="start"
                  label="Аккаунт"
                  {...a11yProps(0)}
                />
                <Tab
                  icon={<IconBell size="22" />}
                  iconPosition="start"
                  label="Уведомления"
                  {...a11yProps(1)}
                />
                <Tab
                  icon={<IconArticle size="22" />}
                  iconPosition="start"
                  label="Счета"
                  {...a11yProps(2)}
                />
                <Tab
                  icon={<IconLock size="22" />}
                  iconPosition="start"
                  label="Безопасность"
                  {...a11yProps(3)}
                />
              </Tabs>
            </Box> */}
            <Divider />
            <CardContent>
              <TabPanel value={value} index={0}>
                <AccountTab />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <NotificationTab />
              </TabPanel>
              <TabPanel value={value} index={2}>
                <BillsTab />
              </TabPanel>
              <TabPanel value={value} index={3}>
                <SecurityTab />
              </TabPanel>
            </CardContent>
          </BlankCard>
    </PageContainer>
  );
};


export default AccountSetting;
