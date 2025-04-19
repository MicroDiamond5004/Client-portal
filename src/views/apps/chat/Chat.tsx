// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useEffect, useState } from 'react';
import { Divider, Box } from '@mui/material';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import ChatSidebar from 'src/components/apps/chats/ChatSidebar';
import ChatContent from 'src/components/apps/chats/ChatContent';
import ChatMsgSent from 'src/components/apps/chats/ChatMsgSent';
import AppCard from 'src/components/shared/AppCard';
import { ChatContext, ChatProvider } from 'src/context/ChatContext';
import { ChatMessage, ChatsType } from 'src/types/apps/chat';

const Chats = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { selectedChat, setSelectedChat } = useContext(ChatContext);
  
  const BCrumb = [
    {
      to: '/',
      title: 'Home',
    },
    {
      title: 'Chat',
    },
  ];


  return (
      <PageContainer title="Chat ui" description="this is Chat page">
        <Breadcrumb title="Chat app" items={BCrumb} />
        <AppCard>
          {/* ------------------------------------------- */}
          {/* Left part */}
          {/* ------------------------------------------- */}

          <ChatSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          {/* ------------------------------------------- */}
          {/* Right part */}
          {/* ------------------------------------------- */}

          <Box flexGrow={1}>
            <ChatContent selectedChat={selectedChat} />
            <Divider />
            <ChatMsgSent currentChat={selectedChat} updateChat={(chat) => setSelectedChat(chat)} />
          </Box>
        </AppCard>
      </PageContainer>
  );
};

export default Chats;
