import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { RootState } from 'src/store';
import { selectSelectedchat, selectChatData } from 'src/store/selectors/messagesSelectors.ts';
import { updateSelectedChat } from 'src/store/slices/messageSlice.ts';
import { useMediaQuery } from '@mui/material';

export const useSyncSelectedChat = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatData = useSelector(selectChatData);
  const selectedChat = useSelector(selectSelectedchat);
  const didInit = useRef(false);

  const isMobile = useMediaQuery('(max-width:600px)');

  // Инициализация selectedChat
  useEffect(() => {
    if (!chatData || chatData.length === 0 || didInit.current) return;

    const urlId = searchParams.get('item');
    const storedChatId = localStorage.getItem('lastSelectedChatId');

    const chatFromUrl = chatData.find((c: any) => c.id === urlId);
    const chatFromStorage = chatData.find((c: any) => c.id === storedChatId);
    const fallbackChat = chatData[0];

    const selected = chatFromUrl ?? chatFromStorage ?? fallbackChat;

    if (selected && window.location.pathname === '/apps/chats') {
      dispatch(updateSelectedChat(selected));
      setSearchParams({ item: selected.id });
      localStorage.setItem('lastSelectedChatId', selected.id);
      didInit.current = true;
    }
  }, [chatData]);

  // useEffect(() => {
  //   console.log('now', window.location.pathname);
  //   console.log('prev', prevPath)
  // }, [window.location.pathname]);

  // Следим за изменением selectedChat → обновляем URL и localStorage
  useEffect(() => {
    if (!selectedChat) return;
    const currentParam = searchParams.get('item');
    if (currentParam !== selectedChat.id && window.location.pathname === '/apps/chats') {
      setSearchParams({ item: selectedChat.id });
      localStorage.setItem('lastSelectedChatId', selectedChat.id);
    }
  }, [selectedChat]);
};
