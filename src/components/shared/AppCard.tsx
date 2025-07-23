// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext } from 'react';

import { Card } from '@mui/material';

import { CustomizerContext } from 'src/context/CustomizerContext';
import { Theme, useMediaQuery } from '@mui/system';

type Props = {
  children: any | any[]
};

const AppCard = ({ children }: Props) => {

  const { isCardShadow } = useContext(CustomizerContext);
  const isMobile = !useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));
  const isChat = window.location.pathname.includes('/chat');

  return (
    <Card
      sx={{
        display: 'flex',
        p: 0,
        overflow: isMobile && isChat ? 'hidden !important' : 'auto',
        height: isMobile && isChat ? 'auto' : 'auto'
      }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default AppCard;
