// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Drawer, Theme, useMediaQuery } from '@mui/material';
import ChatListing from './ChatListing';

interface chatType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: () => void;
}

const drawerWidth = 200;

const ChatSidebar = ({ isMobileSidebarOpen, onSidebarClose }: chatType) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  return (
    <Drawer
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant={lgUp ? 'permanent' : 'temporary'}
      sx={{
        width: lgUp ? drawerWidth : 300,
        flexShrink: 0,
        zIndex: lgUp ? 0 : 1,
        [`& .MuiDrawer-paper`]: { position: 'relative' },
      }}
    >
      <ChatListing onClose={() => lgUp ? null : onSidebarClose()}  />
    </Drawer>
  );
};

export default ChatSidebar;
