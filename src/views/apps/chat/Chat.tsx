// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useEffect, useState } from 'react';
import { Divider, Box, Button } from '@mui/material';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import ChatSidebar from 'src/components/apps/chats/ChatSidebar';
import ChatContent from 'src/components/apps/chats/ChatContent';
import ChatMsgSent from 'src/components/apps/chats/ChatMsgSent';
import AppCard from 'src/components/shared/AppCard';
import { ChatContext, ChatProvider } from 'src/context/ChatContext';
import { ChatMessage, ChatsType } from 'src/types/apps/chat';
import { Theme, useMediaQuery } from '@mui/system';
import { IconArrowLeft, IconMessage } from '@tabler/icons-react';
import { selectSelectedchat } from 'src/store/selectors/messagesSelectors.ts';
import { useAppDispatch, useAppSelector } from 'src/store/hooks.ts';
import { updateSelectedChat } from 'src/store/slices/messageSlice.ts';
import { useSyncSelectedChat } from 'src/hooks/useSyncSelectedChat.ts';

const Chats = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const selectedChat = useAppSelector(selectSelectedchat);

  useSyncSelectedChat();

  const dispatch = useAppDispatch();

  const setSelectedChat = (value: any) => dispatch(updateSelectedChat(value));
  const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);

  const isMobile = !useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));

  const [isShowMsg, setIsShowMsg] = useState(!!selectedChat);

  const BCrumb = [
    {
      to: '/',
      title: 'Главная',
    },
    {
      title: 'Чаты',
    },
  ];



  return (
    <PageContainer
      title={selectedChat ? `Чат по заказу ${selectedChat.name}` : `Чаты по заказам`}
      description="Чаты по заказам"
    >
      {!isMobile && <Breadcrumb title="Чаты по заказам" />}
      <AppCard>
        {/* Sidebar всегда рендерим */}
        <ChatSidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={() => setMobileSidebarOpen(false)}
        />

        {isMobile ? (
          /* ==========================
             МОБИЛЬНАЯ ВЁРСТКА
          =========================== */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: { xs: '100vh', md: '80vh' }, // мобильные и десктоп
              overflow: 'hidden',
              position: 'relative',
              width: '95vw',
              p: 0,
            }}
            overflow={'hidden'}
          >
            {/* HEADER FIXED */}
            <Box
              sx={{
                flexShrink: 0,
                position: 'fixed',
                top: 64,
                width: '100%',
                zIndex: 10,
                backgroundColor: 'background.paper',
              }}>
              <ChatContent
                openMobileChats={(open) => setMobileSidebarOpen(open)}
                onReply={(message: ChatMessage) => setReplyToMsg(message)}
                replyToMsg={replyToMsg}
                cancelReply={() => setReplyToMsg(null)}
                needSidebar={true}
                setIsOpenMsg={(value) => setIsShowMsg(value)}
              />
            </Box>

            {/* spacer под fixed header */}
            {/*<Box sx={{ height: '64px', flexShrink: 0 }} />*/}

            {/*/!* MESSAGES SCROLL *!/*/}
            {/*<Box*/}
            {/*  sx={{*/}
            {/*    flexGrow: 1,*/}
            {/*    overflowY: 'auto',*/}
            {/*    WebkitOverflowScrolling: 'touch',*/}
            {/*    paddingBottom: '80px',*/}
            {/*  }}*/}
            {/*>*/}
            {/* */}
            {/*</Box>*/}

            {/* INPUT fixed внизу */}
            <Box
              sx={{
                flexShrink: 0,
                position: 'fixed',
                bottom: 0,
                width: '100%',
                zIndex: 11,
                backgroundColor: 'background.paper',
              }}
              display={!isShowMsg && isMobile ? 'none' : 'block'}
            >
              <ChatMsgSent
                currentChat={selectedChat}
                updateChat={(chat) => setSelectedChat(chat)}
                replyToMsg={replyToMsg}
                cancelReply={() => setReplyToMsg(null)}
              />
            </Box>
          </Box>
        ) : (
          /* ==========================
             ДЕСКТОПНАЯ ВЁРСТКА (как было)
          =========================== */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: { xs: '100vh', md: 'calc(90vh)' }, // мобильные и десктоп
              overflow: 'hidden',
            }}
          >
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <ChatContent
              openMobileChats={(open) => setMobileSidebarOpen(open)}
              onReply={(message: ChatMessage) => setReplyToMsg(message)}
              replyToMsg={replyToMsg}
              cancelReply={() => setReplyToMsg(null)}
              needSidebar={true}
              />
            </Box>

            <Divider />

            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                backgroundColor: 'background.paper',
              }}
            >
              <ChatMsgSent
              currentChat={selectedChat}
              updateChat={(chat) => setSelectedChat(chat)}
              replyToMsg={replyToMsg}
              cancelReply={() => setReplyToMsg(null)}
            />
            </Box>
          </Box>
        )}
      </AppCard>
    </PageContainer>
  );
};

export default Chats;