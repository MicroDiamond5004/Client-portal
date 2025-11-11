import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
  useRef,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import { getContragent } from 'src/store/middleware/thunks/contragentThunks';
import { fetchMessages, sendMessage as sendMessageThunk } from 'src/store/middleware/thunks/messageThunks';
import { selectToken, selectClientId } from 'src/store/selectors/authSelector';
import { selectChats } from 'src/store/selectors/messagesSelectors';
import { ElmaMessage } from 'src/mocks/chats/chat.type';
import { useSelector } from 'react-redux';

export interface ChatContextProps {
  chatData: any[];
  setChatData: Dispatch<SetStateAction<any[]>>;
  selectedChat: any | null;
  setSelectedChat: Dispatch<SetStateAction<any | null>>;
  sendMessage: (chatId: string, message: string, orderNumber: string) => void;
}

export const ChatContext = createContext<ChatContextProps>({
  chatData: [],
  setChatData: () => {},
  selectedChat: null,
  setSelectedChat: () => {},
  sendMessage: () => {},
});

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatData, setChatData] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const dispatch = useAppDispatch();

  const token = useAppSelector(selectToken);
  const clientId = useAppSelector(selectClientId);
  const chats = useAppSelector(selectChats);

  const userId = useSelector(selectClientId) ?? '';

  const [searchParams, setSearchParams] = useSearchParams();

  const didInitFromStorage = useRef(false);
  const prevChatDataRef = useRef<any[]>([]);

  useEffect(() => {
    dispatch(fetchUserOrders());
    dispatch(getContragent());
    if (clientId) {
      dispatch(fetchMessages(clientId));
    }
  }, [dispatch, token, clientId]);

  useEffect(() => {
    const allChatData = chats;

    // Собираем новые сообщения и комментарии для внутренней логики (без пушей)
    const newMessages: { message: any; chatId: string }[] = [];
    const newComments: { messageId: string; comment: any; chatId: string }[] = [];

    allChatData?.forEach((chat) => {
      const prevChat = prevChatDataRef.current.find((c) => c.id === chat.id);
      if (!prevChat) return; // новый чат, пропускаем

      chat.messages.forEach((message) => {
        const prevMessage = prevChat.messages.find((m: ElmaMessage) => m.id === message.id);

        if (!prevMessage) {
          // новое сообщение
          newMessages.push({ message, chatId: chat.id });
        } else {
          // новые комментарии
          message.comments.forEach((comment) => {
            const exists = prevMessage.comments.find((c: any) => c.id === comment.__id);
            if (!exists) {
              newComments.push({ messageId: message.id, comment, chatId: chat.id });
            }
          });
        }
      });
    });

    // Обновляем prevChatDataRef и состояние чатов
    prevChatDataRef.current = allChatData ?? [];
    setChatData(allChatData ?? []);
  }, [chats]);

  // Синхронизация selectedChat и URL + localStorage
  useEffect(() => {
    if (chatData.length === 0) return;

    if (didInitFromStorage.current) {
      const urlId = searchParams.get('item');
      if (urlId === selectedChat?.id && window.location.pathname === '/apps/chats') {
        return;
      }
      if (urlId) {
        const chatFromUrl = chatData.find((chat) => chat.id === urlId);
        if (chatFromUrl) {
          setSelectedChat(chatFromUrl);
          localStorage.setItem('lastSelectedChatId', urlId);
        }
      }
      return;
    }

    const urlId = searchParams.get('item');
    const storedChatId = localStorage.getItem('lastSelectedChatId');

    const chatFromUrl = chatData.find((chat) => chat.id === urlId);
    const chatFromStorage = chatData.find((chat) => chat.id === storedChatId);

    const selected = chatFromUrl ?? chatFromStorage ?? chatData[0];
    if (selected && window.location.pathname === '/apps/chats') {
      setSelectedChat(selected);
      setSearchParams({ item: selected.id });
      localStorage.setItem('lastSelectedChatId', selected.id);
      didInitFromStorage.current = true;
    }
  }, [chatData, searchParams, selectedChat, setSearchParams]);

  // Обновляем URL при смене selectedChat
  useEffect(() => {
    if (!selectedChat) return;
    const currentParam = searchParams.get('item');
    if (currentParam !== selectedChat.id && window.location.pathname === '/apps/chats') {
      setSearchParams({ item: selectedChat.id });
      localStorage.setItem('lastSelectedChatId', selectedChat.id);
    }
  }, [selectedChat, searchParams, setSearchParams]);

  const sendMessage = async (chatId: string, message: string, orderNumber: string) => {
    await dispatch(sendMessageThunk({ id: chatId, text: message, orderNumber, files: [], url: '', userId }));
  };
2

  return (
    <ChatContext.Provider
      value={{
        chatData,
        setChatData,
        selectedChat,
        setSelectedChat,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
