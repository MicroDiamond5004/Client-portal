// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useContext, useState } from 'react';
import {
  Avatar,
  List,
  ListItemText,
  ListItemAvatar,
  TextField,
  Box,
  Alert,
  Badge,
  ListItemButton,
  Typography,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';

import Scrollbar from '../../custom-scroll/Scrollbar';

import { ChatsType } from 'src/types/apps/chat';
import { last } from 'lodash';
import { formatDistanceToNowStrict } from 'date-fns';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import user1 from 'src/assets/images/profile/user-1.jpg';
import { ChatContext } from 'src/context/ChatContext';
import { useSearchParams } from 'react-router';

export const stripHtmlAndDecode = (html: string): string => {
  // Удаляем теги
  const noTags = html.replace(/<[^>]*>/g, '');

  // Создаём временной элемент, чтобы браузер декодировал сущности
  const textarea = document.createElement('textarea');
  textarea.innerHTML = noTags;
  return textarea.value;
};

const ChatListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    chatData,
    chatSearch,
    setChatSearch,
    setSelectedChat,
    setActiveChatId,
    activeChatId,
  } = useContext(ChatContext);
  

  const filteredChats = chatData.filter((chat) =>
    chat.name.toLowerCase().includes(chatSearch.toLowerCase()) || []
  );
  
  const getDetails = (conversation: ChatsType) => {
    let displayText = '';
  
    const lastMessage = conversation.messages[conversation.messages.length - 1];
  
    if (lastMessage) {
      const sender = lastMessage.senderId === conversation.id ? 'You: ' : '';
      const rawMessage = lastMessage.type === 'image' ? 'Sent a photo' : lastMessage.msg;
      const message = stripHtmlAndDecode(rawMessage);
      displayText = `${sender}${message}`;
    }
  
    return displayText;
  };
  
  

  const lastActivity = (chat: ChatsType) => last(chat.messages)?.createdAt;

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChatSelect = (chat: ChatsType) => {
    setSearchParams({ item: chat.name });
    const chatId =
      typeof chat.id === "string" ? parseInt(chat.id, 10) : chat.id;
    setSelectedChat(chat);
    setActiveChatId(chatId);  
  };



  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChatSearch(event.target.value);
  };



  return chatData ? (
    <div>
      <Box display={'flex'} alignItems="center" gap="10px" p={3}>
        <Badge
          variant="dot"
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          overlap="circular"
          color="success"
        >
          <Avatar alt="Remy Sharp" src={user1} sx={{ width: 54, height: 54 }} />
        </Badge>
        <Box>
          <Typography variant="body1" fontWeight={600}>
            Константин Козлов
          </Typography>
          <Typography variant="body2">Контрагент</Typography>
        </Box>
      </Box>
      <Box px={3} py={1}>
        <TextField
          id="outlined-search"
          placeholder="Search contacts"
          size="small"
          type="search"
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={'16'} />
              </InputAdornment>
            ),
          }}
          fullWidth
          onChange={handleSearchChange}
        />
      </Box>
      <List sx={{ px: 0 }}>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh' }, maxHeight: '600px' }}>
          {filteredChats && filteredChats.length ? (
            filteredChats.map((chat) => (
              <ListItemButton
                key={chat.name + chat.id}
                onClick={() => handleChatSelect(chat)}
                sx={{
                  mb: 0.5,
                  py: 2,
                  px: 3,
                  alignItems: 'start',
                }}
                selected={activeChatId === chat.id}
              >
                <ListItemAvatar>
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                      {chat.name}
                    </Typography>
                </ListItemAvatar>
                <ListItemText
                  secondary={getDetails(chat)?.length > 0 ? getDetails(chat) : 'Еще нет сообщений'}
                  secondaryTypographyProps={{
                    noWrap: true,
                  }}
                  sx={{ my: 0 }}
                />
                <Box sx={{ flexShrink: '0' }} mt={0.5}>
                  <Typography variant="body2">
                    {/* {new Date()} */}
                  </Typography>
                </Box>
              </ListItemButton>
            ))
          ) : (
            <Box m={2}>
              <Alert severity="error" variant="filled" sx={{ color: 'white' }}>
                No Contacts Found!
              </Alert>
            </Box>
          )}
        </Scrollbar>
      </List>
    </div>) : <></>
};

export default React.memo(ChatListing);
