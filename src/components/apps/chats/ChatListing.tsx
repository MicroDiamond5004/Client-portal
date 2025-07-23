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
import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-react';
import user1 from 'src/assets/images/profile/user-1.jpg';
import { ChatContext } from 'src/context/ChatContext';
import { useSearchParams } from 'react-router';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectContragent } from 'src/store/selectors/authSelector';
import { selectOrder, selectPassports } from 'src/store/selectors/ticketsSelectors';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import api from 'src/store/api';
import { fetchUserOrders } from 'src/store/middleware/thunks';
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks';

import { Theme, useMediaQuery } from '@mui/system';
import { selectChatData, selectChatSearch, selectSelectedchat } from 'src/store/selectors/messagesSelectors.ts';
import { updateChatSearch, updateSelectedChat } from 'src/store/slices/messageSlice.ts';

export const stripHtmlAndDecode = (html: string): string => {
  // Удаляем теги
  const noTags = html?.replace(/<[^>]*>/g, '') ?? '';

  // Создаём временной элемент, чтобы браузер декодировал сущности
  const textarea = document.createElement('textarea');
  textarea.innerHTML = noTags;
  return textarea.value;
};

const ChatListing = ({onClose}: {onClose?: () => void}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const contragent = useAppSelector(selectContragent);
  const order = useAppSelector(selectOrder);
  const passports = useAppSelector(selectPassports);

  const dispatch = useAppDispatch(); 

  const chatData = useAppSelector(selectChatData)
  const selectedChat = useAppSelector(selectSelectedchat);
  const setSelectedChat = (value: any) => dispatch(updateSelectedChat(value));

  const activeChatId = selectedChat?.id;
  const chatSearch = useAppSelector(selectChatSearch) ?? '';
  const setChatSearch = (value: any) => dispatch(updateChatSearch(value));

  const filteredChats = chatData?.filter((chat) => {
    const nameMatch = chat.name?.toLowerCase().includes(chatSearch.toLowerCase());
    const orderMatch = String(chat.name).includes(chatSearch);
    const fioMatch = order.result.result.find((task: ELMATicket) => task.__id === chat.taskId)?.fio2.some((fio: string) => passports[fio]?.[0]?.toLocaleLowerCase()?.includes(chatSearch.toLocaleLowerCase()));
    return nameMatch || orderMatch || fioMatch;
  }).sort((a, b) => Number(b.name) -Number(a.name));


  const handleChatSelect = (chat: ChatsType) => {
    setSelectedChat({ ...chat, isChanged: false }); // теперь это наш "manual" setSelectedChat
    localStorage.setItem("lastSelectedChatId", String(chat.id));

    onClose?.();

    const updateChange = async () => {
      await api.post("/updateChange", {
        type: "message",
        id: chat.taskId,
      });

      dispatch(fetchMessages(chat.taskId));
    };

    updateChange();
  };



  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChatSearch(event.target.value);
  };



  return chatData ? (
    <div>
      <Box display={'flex'} alignItems="center" gap="10px" p={3}>
        {/* <Badge
          variant="dot"
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          overlap="circular"
          color="success"
        >
          <Avatar alt="Remy Sharp" src={user1} sx={{ width: 54, height: 54 }} />
        </Badge> */}
        <Box>
          <Typography variant="body1" fontWeight={600}>
            {contragent ?? 'Константин Козлов'}
          </Typography>
          <Typography variant="body2">Контрагент</Typography>
        </Box>
      </Box>
      <Box px={3} py={1}>
        <TextField
          id="outlined-search"
          placeholder="Поиск по заказам"
          size="small"
          type="text"
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {chatSearch ? (
                  <IconX
                    size={16}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setChatSearch('')}
                  />
                ) : (
                  <IconSearch size={16} />
                )}
              </InputAdornment>
            ),
          }}
          fullWidth
          onChange={handleSearchChange}
          value={chatSearch}
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
                  alignItems: 'center',
                  textAlign: 'center',
                }}
                className={chat.isChanged && chat.id !== activeChatId ? 'gradient-background' : ''}
                selected={String(activeChatId) === chat.name}
              >
                <ListItemAvatar>
                <Typography variant="subtitle2" fontWeight={800} fontSize={17} mb={0.5} textAlign='center'>
                      {chat.name}
                    </Typography>
                </ListItemAvatar>
                {chat.isChanged && chat.id !== activeChatId && <Typography variant="subtitle2" fontWeight={600} fontSize={17} mb={0.5} color='#fff' textAlign='center'>Новое сообщение!</Typography>}
                {/* <ListItemText
                  secondary={getDetails(chat)?.length > 0 ? getDetails(chat) : 'Еще нет сообщений'}
                  secondaryTypographyProps={{
                    noWrap: true,
                  }}
                  sx={{ my: 0 }}
                /> */}
                {/* <Box sx={{ flexShrink: '0' }} mt={0.5}>
                  <Typography variant="body2">
  
                  </Typography>
                </Box> */}
              </ListItemButton>
            ))
          ) : (
            <Box m={2}>
              {chatData.length === 0 ?
              <Alert severity="info" variant="filled" sx={{ color: 'white' }}>
                Сообщения загружаются...
              </Alert> :<Alert severity="warning" variant="filled" sx={{ color: 'white' }}>
                Сообщения не найдены
              </Alert>}
            </Box>
          )}
        </Scrollbar>
      </List>
    </div>) : <></>
};

export default React.memo(ChatListing);
