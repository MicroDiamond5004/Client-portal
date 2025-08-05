import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import { Box, styled, SxProps } from '@mui/material';

const SimpleBarStyle = styled(SimpleBar)(() => ({
  maxHeight: '100%',
}));

interface PropsType {
  children: React.ReactElement | React.ReactNode;
  sx?: SxProps;
}

const Scrollbar = forwardRef<HTMLDivElement, PropsType>(({ children, sx, ...other }, ref) => {
  const simpleBarRef = useRef<SimpleBar | null>(null);

  useImperativeHandle(ref, () => {
    const scrollEl = simpleBarRef.current?.getScrollElement?.();
    return scrollEl as HTMLDivElement;
  });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  if (isMobile) {
    return (
      <Box ref={ref} sx={{ overflowY: 'auto', height: '100%', ...sx }}>
        {children}
      </Box>
    );
  }

  return (
    <SimpleBarStyle
      ref={simpleBarRef}
      sx={sx}
      {...other}
    >
      {children}
    </SimpleBarStyle>
  );
});

export default Scrollbar;
