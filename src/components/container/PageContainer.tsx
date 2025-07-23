// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Theme, useMediaQuery } from '@mui/system';
import { Box } from '@mui/material';
import { Helmet } from 'react-helmet';

type Props = {
  description?: string;
  children: any | any[]
  title?: string;
};

const PageContainer = ({ title, description, children }: Props) => {
  const isMobile = !useMediaQuery ((theme: Theme) => theme.breakpoints.up("lg"));
  const isChat = window.location.pathname.includes('/chat');

  return (
    <Box>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      {children}
    </Box>
  );
}

export default PageContainer;
