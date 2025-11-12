import React, { useContext, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Typography,
  Divider,
  Avatar,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Box,
  Stack,
  Badge,
  useMediaQuery,
  Theme,
  Button,
  ImageListItem,
  ImageList, Link, TextField, InputAdornment, ListItemButton, Alert, List,
} from '@mui/material';
import {
  IconArrowBarToDown,
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconMenu2,
  IconMessage,
  IconMessageReply,
  IconPhone, IconSearch,
  IconShare,
  IconVideo,
} from '@tabler/icons-react';
import { formatDistanceToNowStrict } from 'date-fns';
import ChatInsideSidebar from './ChatInsideSidebar';
import { ChatContext } from "src/context/ChatContext";
import { ChatMessage, ChatsType } from 'src/types/apps/chat';
import formatToRussianDate, { formatToRussianDateSmart } from 'src/help-functions/format-to-date';
import SimpleBar from 'simplebar-react';
import { isEqual, uniqueId } from 'lodash';
import { ReplyAll, ReplyAllRounded, ReplyAllSharp } from '@mui/icons-material';
import api from 'src/store/api';
import { messages } from 'src/layouts/full/vertical/header/data';
import { users } from 'src/api/userprofile/UsersData';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectClientId, selectContragent } from 'src/store/selectors/authSelector';
import { getColorByLetter } from 'src/utils/getColorByLetter';
import { showFilePreview } from 'src/store/slices/filePreviewSlice';
import { useNavigate, useSearchParams } from 'react-router';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Fab } from '@mui/material';
import Drawer from '@mui/material/Drawer';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import Scrollbar from 'src/components/custom-scroll/Scrollbar.tsx';
import { ELMATicket } from 'src/mocks/tickets/ticket.type.ts';
import { selectOrder, selectPassports } from 'src/store/selectors/ticketsSelectors.ts';
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks.ts';
import ForumIcon from "@mui/icons-material/Forum";
import {
  selectChats,
  selectChatSearch,
  selectMessagesStatus,
  selectSelectedchat,
} from 'src/store/selectors/messagesSelectors.ts';
import { updateChatSearch, updateSelectedChat } from 'src/store/slices/messageSlice.ts';
import { selectPath, selectPrevPath } from 'src/store/selectors/appSelector.ts';
import { ElmaChat } from 'src/mocks/chats/chat.type';



const ChatContent = ({ onReply, replyToMsg, cancelReply, needSidebar: open, replyedHeight, openMobileChats, headerOnly, contentOnly, setIsOpenMsg }:
                     { onReply: (message: any) => void,
                       replyToMsg: any | null,
                       cancelReply: () => void,
                       needSidebar: boolean,
                       headerOnly?: boolean,
                       contentOnly?: boolean,
                       openMobileChats?: (open: boolean) => void
                       setIsOpenMsg?: (value: boolean) => void;
                       replyedHeight?: number;
                     }) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));

  const navigate = useNavigate();

  const contragent = useAppSelector(selectContragent);
  const order = useAppSelector(selectOrder);
  const passports = useAppSelector(selectPassports);

  const messageStatus = useAppSelector(selectMessagesStatus);

  const dispatch = useAppDispatch();

  const chats = useAppSelector(selectChats)
  const selectedChat = useAppSelector(selectSelectedchat);
  const setSelectedChat = (value: any) => dispatch(updateSelectedChat(value));


  const activeChatId = selectedChat?.id;
  const chatSearch = useAppSelector(selectChatSearch) ?? '';
  const setChatSearch = (value: any) => dispatch(updateChatSearch(value));


  const filteredChats = chats?.filter((chat: any) => {
    const nameMatch = chat.name?.toLowerCase().includes(chatSearch?.toLowerCase());
    const orderMatch = String(chat.name).includes(chatSearch);
    const fioMatch = order.result.result.find((task: ELMATicket) => task.__id === chat.taskId)?.fio2?.some((fio: string) => passports[fio]?.[0]?.toLocaleLowerCase()?.includes(chatSearch.toLocaleLowerCase()));
    return nameMatch || orderMatch || fioMatch;
  }).sort((a, b) => {
    // Сначала сортировка по isChanged: true выше false
    if (a.isChanged !== b.isChanged) {
      return a.isChanged ? -1 : 1;
    }
    // Если isChanged одинаковы — сортировка по name по убыванию
    return Number(b.name) - Number(a.name);
  });


  const prevChat = useRef(selectedChat);

  const [searchParams, setSearchParams] = useSearchParams();

  const [usersLoading, setUsersLoading] = useState(false);

  const mainBoxRef = useRef<HTMLElement>(null);
  const inBoxRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [mobileChatsMenuOpen, setMobileChatsMenuOpen] = useState(!selectedChat);

  const [currentChat, setCurrentChat] = useState<string>()

  const [files, setFiles] = useState<any[]>([]);
  const managers: Record<string, string> = selectedChat?.authors;

  const chatListScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0); // хранение позиции


  const clientId = useAppSelector(selectClientId);

  const [selectedFile, setSelectedFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  const curPath = useAppSelector(selectPath);
  const prevPath = useAppSelector(selectPrevPath);

  useEffect(() => {
    if (lgUp || ((typeof prevPath !== 'string') ? prevPath?.pathname === '/apps/chats' && curPath.pathname === '/apps/chats' : false)) return;
    if ((typeof prevPath !== 'string') ? prevPath?.search?.includes('item') && prevPath?.pathname === '/apps/orders' && curPath?.pathname === '/apps/chats' :
    (curPath.pathname === '/apps/chats' && curPath.search?.includes('item'))) {
      console.log('ffffffffff');
      setMobileChatsMenuOpen(false);
      setIsOpenMsg?.(true)
    } else {
      console.log('ffffffffffuuck');
      setMobileChatsMenuOpen(true)
      setIsOpenMsg?.(false)
    }

    console.log(prevPath, curPath);
  }, [curPath]);

  useEffect(() => {
    if (curPath.pathname === '/apps/chats' && searchParams.get('item') !== selectedChat?.name) {
      setSearchParams({item: selectedChat?.name});
    }
  }, [searchParams, selectedChat]);

  useEffect(() => {
    const currentChat = chats?.find((el) => el.id == selectedChat?.id);
    if ((selectedChat && currentChat && !isEqual(selectedChat, currentChat)) || !selectedChat) {
      // console.log(currentChat);
      setSelectedChat(currentChat);
    }
  }, [chats]);

  useEffect(() => {
    if (!selectedChat || !selectedChat.messages || !selectedChat?.files) return;

    const fetchFiles = async () => {
      try {
        const allFiles: any[] = selectedChat?.files;

        if (allFiles?.length > 0) {
          const response = await api.post('/get-files', {
            fileIds: allFiles.map((file) => file.__id),
          });

          if (response.data.success) {
            const fetchedFiles: any[] = response.data.files;

            // ✅ лог
            console.log('Файлы с сервера:', fetchedFiles);

            if (fetchedFiles.length !== files.length) {
              setFiles(fetchedFiles);
            }
          } else {
            console.error('Ошибка на сервере:', response.data.error);
          }
        }

      } catch (error) {
        console.error('Ошибка загрузки файлов:', error);
      }
    };

    fetchFiles();
  }, [selectedChat?.id, selectedChat?.files]);

  useEffect(() => {
    if (currentChat !== selectedChat?.taskId) {
      setCurrentChat(selectedChat?.taskId);
    }
  }, [selectedChat?.id])

  useEffect(() => {
    cancelReply();
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, currentChat ? 500 : 3000);
  }, [currentChat]);


  const handleMessageClick = (message: any) => {
    if ((replyToMsg?.id || replyToMsg?.__id) === (message.id || message.__id)) {
      cancelReply();
    } else {
      onReply(message);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChatSearch(event.target.value);
  };

  const handleViewFile = async (url: any) => {
      window.open(url, '_blank');
      return;
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setIsAtBottom(isNearBottom);
    }
  };

  const handleChatSelect = (chat: ElmaChat) => {
    if (chatListScrollRef.current) {
      scrollPositionRef.current = chatListScrollRef.current.scrollTop;
    }

    setSelectedChat({ ...chat, isChanged: false });
    localStorage.setItem("lastSelectedChatId", String(chat.id));

    setMobileChatsMenuOpen(false);
    setIsOpenMsg?.(true);
    setChatSearch('');

    const updateChange = async () => {
      await api.post("/updateChange", {
        type: "message",
        id: chat.taskId,
      });

      dispatch(fetchMessages(chat.taskId));
    };

    updateChange();
  };


  // // // console.log(selectedChat?.id, selectedChat?.messages[selectedChat?.messages.length - 1], 'ffffffffffffffffffffffffffffffffffff');

  // // console.log(files);

  // Главная сортировка по датам
  const AllMainMessages: any = {};
  const AllMessages: any[] = [];

  selectedChat?.messages?.forEach((message: any) => {
    AllMessages.push({...message, comments: [], type: 'text', author: message.senderId,  senderId: message.senderId !== clientId ? selectedChat.id : message.senderId });
    AllMainMessages[message.id] = {...message, comments: []};
    message.comments?.forEach((comment: any, index: number) => {
      AllMessages.push({...comment, prevComment: index > 0 ? message.comments?.[index - 1] : null, messageId: message.id, senderId: comment.author === clientId ? '0' : selectedChat?.name});
    })
  })

  const sortedMessages = [...AllMessages]?.sort(
    (a: any, b: any) => new Date(a.__createdAt ?? a.createdAt).getTime() - new Date(b.__createdAt ?? b.createdAt).getTime()
  );

  // selectedChat.messages?.forEach((message) => {
  //   console.log(message, 'm');
  // })
  useEffect(() => {
    console.log(chatListScrollRef.current);
    if (mobileChatsMenuOpen && chatListScrollRef.current) {
      // Ставим небольшой timeout, чтобы Scrollbar успел отрендериться
      setTimeout(() => {
        chatListScrollRef.current!.scrollTop = scrollPositionRef.current;
      }, 100);
    }
  }, [mobileChatsMenuOpen]);


  useEffect(() => {
    if (isAtBottom && (!isEqual(prevChat.current, selectedChat) && !mobileChatsMenuOpen)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevChat.current = selectedChat;
    }
  }, [selectedChat]);

  const scrollToMessage = (messageId: any) => {
    if (!messageId) return;

    const target = document.getElementById(`${messageId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.parentElement?.parentElement?.parentElement?.parentElement?.classList.add("highlight-message");

      setTimeout(() => {
        target.parentElement?.parentElement?.parentElement?.parentElement?.classList.remove("highlight-message");
      }, 1500);
    }
  };


  const getMessages = (chat: any, index: number) => {
    const cleaned = (chat.msg ?? chat.body)?.trim() ?? '';

    if (chat?.prevComment?.author?.includes('00000000-0000-0000-0000-000000000000') || chat?.author?.includes('00000000-0000-0000-0000-000000000000')) {
      return null;
    }

    // Делаем безопасный текст
    let safeHtml = cleaned
    ? DOMPurify.sanitize(cleaned?.replace(/\r?\n/g, '<br/>'))
      : null;

    // Тоже самое делаем для комментариев
    // const commentsHTML = chat?.comments.map((comment: any) => DOMPurify.sanitize(comment.body));


    if (selectedChat && (chat.senderId === selectedChat?.name && !!chat.messageId)) {
      const replyedMessage = chat.prevComment ? {
        attachment: [],
        author: chat.prevComment.author,
        comments: [],
        createdAt: chat.prevComment.__createdAt,
        id: chat.prevComment.__id,
        msg: chat.prevComment?.body,
        senderId: chat.prevComment?.author === clientId ? '0' : selectedChat?.name,
        type: "text",
        messageId: chat.messageId,
      } : AllMainMessages[chat.messageId];

      safeHtml = DOMPurify.sanitize(cleaned?.replace(/\r?\n/g, '<br/>'));

      const commentHTML = DOMPurify.sanitize(cleaned);

      return(<Box display="flex" onClick={() => handleMessageClick?.(chat)}
      sx={{
        p: 1,
        borderRadius: 1,
        cursor: "pointer",
        bgcolor: chat?.__id === replyToMsg?.__id ? "primary.light" : "transparent",
        borderRight: chat?.__id === replyToMsg?.__id ? "4px solid #1976d2" : "none",
      }} key={uniqueId()}>
        <ListItemAvatar>
          <Avatar
                alt={managers[chat.author]}
                src={undefined}
                sx={{
                  width: lgUp ? 40 : 30,
                  height: lgUp ? 40 : 30,
                  bgcolor: getColorByLetter(managers[chat.author]?.charAt(0).toLocaleUpperCase()),
                  color: '#fff',
                  fontWeight: 600,
                  minWidth: '0px',
                }}
              >
                {managers[chat.author]?.charAt(0).toLocaleUpperCase()}
              </Avatar>
        </ListItemAvatar>
        <Box>
            <Typography
              variant="body2"
              color="grey.400"
              mb={1}
            >
              {managers[chat.author]},{" "}
              {formatToRussianDateSmart(
                new Date(chat.__createdAt)
              )}{" "}
            </Typography>
        <Box
      display="flex"
      flexDirection="column"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: "grey.100",
        maxWidth: "100%",
        mb: 2,
        position: "relative",
        border: "1px solid #e0e0e0",
      }}
    >
      <Box>
      {/* Пересланное сообщение */}
      {replyedMessage && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            scrollToMessage(replyedMessage.id);
          }}
          sx={{
            p: 1,
            backgroundColor: "#f0f0f0",
            borderLeft: "4px solid #4caf50",
            mb: 1,
            borderRadius: "6px",
          }}
        >
          <Typography className="break-word"
            variant="subtitle2"
            sx={{ color: "#4caf50", fontWeight: 600 }}
          >
            {replyedMessage.senderId !== '0' ? managers[replyedMessage.author] : 'Я'}
          </Typography>

          {replyedMessage.msg && (
            <Typography className="break-word"
              variant="body2"
              sx={{ color: "text.primary" }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(replyedMessage.msg),
              }}
            />
          )}

          {/* Файлы пересланного */}
          {replyedMessage.files && replyedMessage.files.length > 0 && (
            <Box mt={1}>
              {replyedMessage.files.map((file: any, index: number) => (
                <Button
                  key={uniqueId()}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: "block", fontSize: 13 }}
                  onClick={() => {
                    dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                    setSelectedFile({
                      url: files.find((el) => el.fileId === file.__id).url,
                      name: file.originalName,
                      type: '',
                  });
                  }
                }
                >
                  📎 {file.name}
                </Button>
              ))}
            </Box>
          )}

          {/* Изображения пересланного */}
          {replyedMessage.images && replyedMessage.images.length > 0 && (
            <ImageList cols={3} rowHeight={100} sx={{ mt: 1 }}>
              {replyedMessage.images.map((img: any, i: any  ) => (
                <ImageListItem key={uniqueId()}>
                  <img src={img} alt={`img-${i}`} loading="lazy" />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </Box>
      )}

      {/* Основное сообщение */}
      <Box id={chat.__id}>
        {/* Основной текст */}
        {chat.body && (
          <Typography className="break-word"
            variant="body1"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              mb: chat.files || chat.images ? 1 : 0,
            }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(chat.body),
            }}
          />
        )}

        {/* Файлы */}
        {chat.files && chat.files.length > 0 && (
          <Box mt={1}>
            {chat.files.map((file: any, index: number) => {
              const url = files?.find((file2) => file2.fileId === file?.__id)?.url;
              const extension = file.__name.split('.').at(-1)?.toLowerCase();
              if (['png', 'jpg', 'jpeg'].includes(extension)) {
                // // console.log(file);
                return (
                  url ? <Box sx={{ position: 'relative', marginRight: 4, mb: 2 }}>
                      <img
                      key={uniqueId()}
                      src={url ?? ''} // именно файл, не .url
                      alt="Uploaded image"
                      style={{ maxWidth: '200px', height: 'auto' }}
                      onClick={() => {
                        dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                        setSelectedFile({
                          url,
                          name: file.originalName,
                          type: 'img',
                        })
                      }
                    }

                    />
                    {/* <ReplyAllRounded
                      fontSize="medium"
                      sx={{
                        position: 'absolute',
                        right: '-30px',
                        top: '50%',
                        transform: 'translateY(-50%)', // <-- центрируем по вертикали
                        color: "primary.main"
                      }}
                    /> */}
                  </Box> : <p>Файл загружается...</p>
                );
                } else {
                  return(
                  url ? (
                  <Box sx={{ position: 'relative', marginRight: 4, mb: 2 }}>
                    <Button
                      key={uniqueId()}
                      variant="outlined"
                      startIcon={<IconDownload />}
                      onClick={() => {
                        dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                        setSelectedFile({
                          url: files.find((el) => el.fileId === file.__id).url,
                          name: file.originalName,
                          type: '',
                        })
                      }
                    }
                      sx={{ textTransform: 'none', mt: 1 }}
                    >
                      Скачать файл
                    </Button>
                    {/* <ReplyAllRounded
                    fontSize="medium"
                    sx={{
                      position: 'absolute',
                      right: '-30px',
                      top: '50%',
                      transform: 'translateY(-50%)', // <-- центрируем по вертикали
                      color: "primary.main"
                    }}
                    /> */}
                  </Box>
                  ) : (
                    <p>Файл загружается...</p>
                  )
                )}
            })}
          </Box>
        )}
      </Box>
    </Box>
    </Box>
    </Box>
      </Box>)
    }
    else if (selectedChat && (chat.senderId !== selectedChat?.name && !!chat.messageId)) {
      const replyedMessage = chat.prevComment ? {
        attachment: [],
        author: chat.prevComment.author,
        comments: [],
        createdAt: chat.prevComment.__createdAt,
        id: chat.prevComment.__id,
        msg: chat.prevComment.body,
        senderId: chat.prevComment?.author === clientId ? '0' : selectedChat?.name,
        type: "text",
        messageId: chat.messageId,
      } : AllMainMessages[chat.messageId];

      safeHtml = DOMPurify.sanitize(cleaned?.replace(/\r?\n/g, '<br/>'));

      const commentHTML = DOMPurify.sanitize(cleaned);

      return (
        <Box
          key={uniqueId()}
          display="flex"
          justifyContent="flex-end"
          onClick={() => handleMessageClick?.(chat)}
          sx={{
            p: 1,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: chat?.__id === replyToMsg?.__id ? "primary.light" : "transparent",
            borderRight: chat?.__id === replyToMsg?.__id ? "4px solid #1976d2" : "none",
          }}
        >
          <Box display="flex" flexDirection="row-reverse">
            <Box maxWidth="100%">
              <Typography className="break-word"
                variant="body2"
                color="grey.400"
                textAlign="right"
                mb={1}
              >
                {formatToRussianDateSmart(new Date(chat.__createdAt))}
              </Typography>

              <Box
                display="flex"
                flexDirection="column"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "grey.100",
                  maxWidth: "100%",
                  mb: 2,
                  position: "relative",
                  border: "1px solid #e0e0e0",
                }}
              >
                {/* Пересланное сообщение */}
                {replyedMessage && (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      scrollToMessage(replyedMessage.id);
                    }}
                    sx={{
                      p: 1,
                      backgroundColor: "#f0f0f0",
                      borderLeft: "4px solid #4caf50",
                      mb: 1,
                      borderRadius: "6px",
                    }}
                  >
                    <Typography className="break-word"
                      variant="subtitle2"
                      sx={{ color: "#4caf50", fontWeight: 600 }}
                    >
                      {replyedMessage.senderId !== '0' ? managers[replyedMessage.author] : 'Я'}
                    </Typography>

                    {replyedMessage.msg && (
                      <Typography className="break-word"
                        variant="body2"
                        sx={{ color: "text.primary" }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(replyedMessage.msg),
                        }}
                      />
                    )}

                    {replyedMessage.files?.length > 0 && (
                      <Box mt={1}>
                        {replyedMessage.files.map((file: any, index: number) => (
                          <Button
                            key={uniqueId()}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: "block", fontSize: 13 }}
                            onClick={() => {
                            dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                              setSelectedFile({
                                url: files.find((el) => el.fileId === file.__id).url,
                                name: file.originalName,
                                type: 'img',
                              })
                            }
                          }
                          >
                            📎 {file.name}
                          </Button>
                        ))}
                      </Box>
                    )}

                    {replyedMessage.images?.length > 0 && (
                      <ImageList cols={3} rowHeight={100} sx={{ mt: 1 }}>
                        {replyedMessage.images.map((img: any, i: number) => (
                          <ImageListItem key={uniqueId()}>
                            <img src={img} alt={`img-${i}`} loading="lazy" />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    )}
                  </Box>
                )}

                {/* Основное сообщение */}
                <Box id={chat.__id}>
                  {chat.body && (
                    <Typography className="break-word"
                      variant="body1"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        mb: chat.files || chat.images ? 1 : 0,
                        textAlign: "left",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(chat.body),
                      }}
                    />
                  )}

      {chat.files && chat.files.length > 0 && (
          <Box mt={1} key={uniqueId()}>
            {chat.files.map((file: any, index: number) => {
              const url = files?.find((file2) => file2.fileId === file?.__id)?.url;
              const extension = file.__name.split('.').at(-1)?.toLowerCase();
              if (['png', 'jpg', 'jpeg'].includes(extension)) {
                return (
                  url ? <Box sx={{ position: 'relative', marginRight: 4, mb: 2 }} key={uniqueId()}>
                      <img
                      key={uniqueId()}
                      src={url ?? ''} // именно файл, не .url
                      alt="Uploaded image"
                      style={{ maxWidth: '200px', height: 'auto' }}
                      onClick={() => {
                        dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                        setSelectedFile({
                          url: files.find((el) => el.fileId === file.__id).url,
                          name: file.originalName,
                          type: 'img',
                        })
                      }
                    }

                    />
                    {/* <ReplyAllRounded
                      fontSize="medium"
                      sx={{
                        position: 'absolute',
                        right: '-30px',
                        top: '50%',
                        transform: 'translateY(-50%)', // <-- центрируем по вертикали
                        color: "primary.main"
                      }}
                    /> */}
                  </Box> : <p key={uniqueId()}>Файл загружается...</p>
                );
                } else {
                  return(
                  url ? (
                  <Box sx={{ position: 'relative', marginRight: 4, mb: 2 }} key={uniqueId()}>
                    <Button
                      key={uniqueId()}
                      variant="outlined"
                      startIcon={<IconDownload />}
                      sx={{ textTransform: 'none', mt: 1 }}
                      onClick={() => {
                        dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                        setSelectedFile({
                          url: files.find((el) => el.fileId === file.__id).url,
                          name: file.originalName,
                          type: '',
                        })
                      }
                      }
                    >
                      Скачать файл
                    </Button>
                    {/* <ReplyAllRounded
                    fontSize="medium"
                    sx={{
                      position: 'absolute',
                      right: '-30px',
                      top: '50%',
                      transform: 'translateY(-50%)', // <-- центрируем по вертикали
                      color: "primary.main"
                    }}
                    /> */}
                  </Box>
                  ) : (
                    <p>Файл загружается...</p>
                  )
                )}
            })}
          </Box>
        )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      );
    }
    else if (selectedChat && (selectedChat.id === chat.senderId) && !chat.messageId) {

      return(
          <Box display="flex" onClick={() => handleMessageClick?.(chat)}
          sx={{
            p: 1,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: replyToMsg?.id === chat.id ? "primary.light" : "transparent",
            borderLeft: replyToMsg?.id === chat.id ? "4px solid #1976d2" : "none",
          }} key={uniqueId()}>
            <ListItemAvatar>
              <Avatar
                alt={managers[chat.author]}
                src={undefined}
                sx={{
                  width: lgUp ? 40 : 30,
                  height: lgUp ? 40 : 30,
                  bgcolor: getColorByLetter(managers[chat.author]?.charAt(0).toLocaleUpperCase()),
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {managers[chat.author]?.charAt(0).toLocaleUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <Box>
              <Box>
              {chat.createdAt ? (
                <Typography className="break-word"
                  variant="body2"
                  color="grey.400"
                  mb={1}
                >
                  {managers[chat.author]},{" "}
                  {formatToRussianDateSmart(
                    new Date(chat.createdAt)
                  )}{" "}
                </Typography>
              ) : null}
              {chat.type === "text" ? (
                <Box>
                {chat.msg && <Box
                  id={chat.id}
                  mb={2}
                  sx={{
                    p: 1,
                    backgroundColor: "grey.100",
                    mr: "auto",
                    maxWidth: lgUp ? "320px" : '65vw',
                  }}
                  dangerouslySetInnerHTML={{ __html: safeHtml ?? '<p></p>' }}
                />}
                {files.length > 0 && chat.files?.length > 0 && chat.files.map((file: any) => {
                  const url = files?.find((file2) => file2.fileId === file?.__id)?.url;
                  const extension = file.__name.split('.').at(-1)?.toLowerCase();
                  if (['png', 'jpg', 'jpeg'].includes(extension)) {
                    return url ? (
                      <img
                        key={uniqueId()}
                        src={url}
                        alt="Uploaded image"
                        style={{ maxWidth: '200px', height: 'auto', cursor: 'pointer' }}
                        onClick={() => {
                          dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                          setSelectedFile({
                            url,
                            name: file.originalName,
                            type: 'img',
                          })
                        }
                      }

                      />
                    ) : (
                      <p key={uniqueId()}>Файл загружается...</p>
                    );
                  } else {
                    return <p key={uniqueId()}>{file.fileId}</p>;
                  }
                })}
              </Box>

              ) : null}
            </Box>
          </Box>
          </Box>
      )
    }
    else if (selectedChat && (selectedChat.id !== chat.senderId) && !chat.messageId) {
      return(
        <Box key={uniqueId()}>
        {/* Если сообщение не от клиента и без комментария */}
          <Box
            mb={1}
            display="flex"
            alignItems="flex-end"
            flexDirection="row-reverse"
            onClick={() => handleMessageClick?.(chat)}
          sx={{
            p: 1,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: replyToMsg?.id === chat.id ? "primary.light" : "transparent",
            borderRight: replyToMsg?.id === chat.id ? "4px solid #1976d2" : "none",
          }}>

            <Box
              alignItems="flex-end"
              display="flex"
              flexDirection={"column"}
            >
              {chat.createdAt ? (
                <Typography className="break-word"
                  variant="body2"
                  color="grey.400"
                  mb={1}
                >
                  {formatToRussianDateSmart(
                    new Date(chat.createdAt)
                  )}{" "}
                </Typography>
              ) : null}
              {chat.type === "text" ? (
                <Box key={uniqueId()}>
                  <Box key={uniqueId()}>
                  {chat.msg && <Box
                    id={chat.id}
                    key={uniqueId()}
                    mb={1}
                    sx={{
                      p: 1,
                      backgroundColor: "primary.light",
                      ml: "auto",
                      maxWidth: lgUp ? "320px" : '65vw',
                    }}
                    dangerouslySetInnerHTML={{ __html: safeHtml ?? '<p></p>'}}
                  >
                  </Box>}
                  {files.length > 0 && chat.files?.length > 0 && chat.files.map((file: any) => {
                  const url = files?.find((file2) => file2.fileId === file?.__id)?.url;
                  const extension = file.__name.split('.').at(-1)?.toLowerCase();

                  if (['png', 'jpg', 'jpeg'].includes(extension)) {
                    return (
                      url ? <img
                        key={uniqueId()}
                        src={url ?? ''} // именно файл, не .url
                        alt="Uploaded image"
                        style={{ maxWidth: '200px', height: 'auto' }}
                        onClick={() => {
                          dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                          setSelectedFile({
                            url,
                            name: file.originalName,
                            type: 'img',
                          })
                        }
                      }

                      /> : <p key={uniqueId()}>Файл загружается...</p>
                    );
                  } else {
                    return(
                    url ? (
                      <>
                      <Typography key={uniqueId()} className="break-word">{file.originalName}</Typography>
                      <Button
                        key={uniqueId()}
                        variant="outlined"
                        startIcon={<IconDownload />}
                        onClick={() => {
                          dispatch(showFilePreview({
                      url: files.find((el) => el.fileId === file.__id).url ?? '',
                      name: file.originalName ?? '',
                      type: '',
                  } ));
                          setSelectedFile({
                            url: files.find((el) => el.fileId === file.__id).url,
                            name: file.originalName,
                            type: '',
                          })
                        }
                      }
                        sx={{ textTransform: 'none', mt: 1 }}
                      >
                        Скачать файл
                      </Button>
                    </>
                    ) : (
                      <p key={uniqueId()}>Файл загружается...</p>
                    )
                  )}
                })}
                </Box>
                </Box>
              ) : null}
            </Box>
          </Box>
      </Box>
      )
    } else {
      return(<p>Сообщение загружается...</p>)
    }
  }


  return selectedChat && (selectedChat.messages.length > 0 ? !usersLoading && Object.keys(managers ?? {}).length > 0 : true) && messageStatus === 'succeeded' ? (
    <Box overflow={'hidden'}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap' }} overflow={'hidden'} maxHeight={'100%'}>
        <Box width="100%" overflow={'hidden'}>
          {/* Header */}
          <Box overflow={'hidden'}>
            {open && (
              <Box display="flex" alignItems="center" p={'4px 20px 4px 0px'} >
                <Box sx={lgUp ? { display: { xs: 'block' }, mr: '10px' } :
                  {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    zIndex: 1100,
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    mr: '10px',
                  }} />
                <ListItem key={uniqueId()} dense disableGutters>
                  <Box sx={{display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  {!lgUp && (
                    <Box onClick={() => {
                      setIsOpenMsg?.(mobileChatsMenuOpen)
                      setMobileChatsMenuOpen((prevState) => !prevState)}} sx={{ ml: '4%', my: mobileChatsMenuOpen ? '11px' : '' }}>
                      <Box p={'5px 25px'} sx={{backgroundColor: '#26428B'}}>
                        <Typography variant='body1' color={'#fff'}>Чаты</Typography>
                      </Box>
                    </Box>
                  )}
                  {/*<ListItemAvatar>*/}
                  {/*  <Badge*/}
                  {/*    color={*/}
                  {/*      selectedChat.status === 'online'*/}
                  {/*        ? 'success'*/}
                  {/*        : selectedChat.status === 'busy'*/}
                  {/*          ? 'error'*/}
                  {/*          : selectedChat.status === 'away'*/}
                  {/*            ? 'warning'*/}
                  {/*            : 'secondary'*/}
                  {/*    }*/}
                  {/*    variant="dot"*/}
                  {/*    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}*/}
                  {/*    overlap="circular"*/}
                  {/*  >*/}
                  {/*    <Avatar*/}
                  {/*      alt={selectedChat?.name}*/}
                  {/*      src={selectedChat.thumb}*/}
                  {/*      sx={{ width: 40, height: 40 }}*/}
                  {/*    />*/}
                  {/*  </Badge>*/}
                  {/*</ListItemAvatar>*/}
                  {!lgUp && mobileChatsMenuOpen ? <Box px={3} py={1}>
                    <TextField
                      id="outlined-search-2"
                      placeholder="Поиск по заказам"
                      size="small"
                      type="search"
                      // variant="outlined"
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
                  </Box> : <ListItemText
                    primary={
                      <Typography className="break-word"
                                  component={Link}
                                  sx={{textDecoration: 'none', display: 'block !important', width: '100%', textAlign: lgUp ? 'undefined' : 'center' }}
                                  ml={lgUp ? "2vh" : '0'}
                                  pr={lgUp ? '0' : '15%'}
                                  fontSize={17}
                                  onClick={() =>
                                    navigate(`/apps/orders?item=${selectedChat?.name}`)
                                  }
                                  fontWeight={500}
                      >
                        Заказ №{selectedChat?.name}
                      </Typography>
                    }
                    secondary={selectedChat.status}
                  />}
                  {!lgUp && !mobileChatsMenuOpen && open && (
                    <Fab
                      color="primary"
                      size="small"
                      onClick={() => setMobileSidebarOpen((prevState) => !prevState)}
                      sx={{ mr: '2.5%' }}
                    >
                      <InfoIcon />
                    </Fab>
                  )}
                  </Box>
                </ListItem>
              </Box>
            )}
            {lgUp && <Divider />}
          </Box>

          {/* Main Content */}
          <Box sx={{ display: 'flex', borderRadius: 'none', width: 'auto', overflow: 'hidden', minHeight: lgUp ? open ? 'calc(var(--app-height) - 324px)' : 'auto' : `calc((var(--app-height) / 100 * 90) - ${replyedHeight ?? 0}px)`,  maxHeight: lgUp ? open ? 'calc(var(--app-height) - 324px)' : 'auto' : `calc((var(--app-height) / 100 * 90) - ${replyedHeight ?? 0}px)`}} ref={mainBoxRef}>
            {/* Messages */}
            <Box overflow={'hidden'} height={'inherit'} width={'100%'}>
              <Box
                ref={messagesContainerRef}
                sx={{
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  p: lgUp ? '0' : '5px 0px',
                  maxHeight: open ? lgUp ? '100%' : `calc((var(--app-height) / 100 * 93) - 100px)` : 'auto',
                  height: open ? lgUp ? 'auto' : `auto` : 'auto',
                  wwidth: lgUp
                    ? !open
                      ? `${(mainBoxRef.current?.clientWidth || 0) -
                        (inBoxRef.current?.clientWidth || 0)}px`
                  : window.innerWidth > 1200 ? '500px' : '31vw'
                  : open ? window.innerWidth - 20 : window.innerWidth - 55,
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': {
                  display: 'none',
                },
                }}
              >
                <Box p={lgUp ? 3 : '15px 10px'} className="chat-text" maxHeight={lgUp ? open ? '100%' : '50vh' : '100%'} ref={chatListScrollRef}>
                  {/* 👇 Мобильное меню чатов */}
                  {open && !lgUp && mobileChatsMenuOpen ? (
                    <>
                      <Scrollbar
                        sx={{ height: '100%' }}
                        ref={chatListScrollRef} // ✅ ref именно сюда
                      >
                        <Box p={1}>
                          <Typography variant="h5" mb={2}>
                            Выберите чат
                          </Typography>
                          {/*<Typography>Hello!</Typography>*/}
                        </Box>

                        <List sx={{ px: 0 }}>
                          <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh', sm: 'calc((var(--app-height) / 100 * 90) - 100px)' }, maxHeight: '100vh' }}>
                            {filteredChats && filteredChats.length ? (
                              filteredChats.map((chat) => (
                                <ListItemButton
                                  key={uniqueId()}
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
                                {messageStatus !== 'succeeded' ?
                                  <Alert severity="info" variant="filled" sx={{ color: 'white' }}>
                                    Сообщения загружаются...
                                  </Alert> :<Alert severity="warning" variant="filled" sx={{ color: 'white' }}>
                                    Сообщения не найдены
                                  </Alert>}
                              </Box>
                            )}
                          </Scrollbar>
                        </List>

                      </Scrollbar>
                    </>
                  ) : (
                    // 👇 Отображение сообщений
                    <>
                      {Object.keys(managers)?.length > 0 && selectedChat.messages.length > 0 ? (
                        (open
                            ? sortedMessages
                            : sortedMessages.slice(
                              sortedMessages.length > 4 ? sortedMessages.length - 4 : 0
                            )
                        )?.map(getMessages)
                      ) : selectedChat.messages.length > 0  ? <Typography color="textSecondary">Сообщения загружаются...</Typography> : (
                        <Typography color="textSecondary">Нет сообщений</Typography>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Right Sidebar - Desktop only */}
            {lgUp && open && (
              <Box display="flex" borderRadius={'none'} flexShrink="0px" ref={inBoxRef}>
                <ChatInsideSidebar isInSidebar chat={selectedChat} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* No Chat Selected */}
      {!selectedChat && (
        <Box display="flex" alignItems="center" p={2} pb={1} pt={1}>
          <Box sx={{ display: 'flex', mr: '10px' }}>
            <IconMenu2 stroke={1.5} />
          </Box>
          <Typography variant="h4">Выбрать чат</Typography>
        </Box>
      )}

      {/* Scroll to Bottom Button */}
      {!isAtBottom && (
        <Fab
          color="primary"
          size="small"
          onClick={() =>
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      )}


      {/* Drawer for mobile */}
      <Drawer
        anchor="right"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: '90%',
            maxWidth: 360,
            backgroundColor: 'transparent',
            boxShadow: 'none'
          },
        }}
      >
        <Box display="flex" justifyContent="flex-end" p={2} border={'none'}>
          <IconButton onClick={() => setMobileSidebarOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <ChatInsideSidebar isInSidebar chat={selectedChat ?? {}} />
      </Drawer>
    </Box>

  ) : <Box p={2}>
    <Typography width={'100%'} textAlign={'center'}>
    Сообщения загружаются...
  </Typography>
    </Box>
};



export default React.memo(ChatContent);

