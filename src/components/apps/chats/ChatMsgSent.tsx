import React, { useContext, useEffect, useRef, useState } from 'react';
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";

import { IconPaperclip, IconPhoto, IconSend } from "@tabler/icons-react";
import { ChatContext } from "src/context/ChatContext";
import { sendPushFromClient } from "src/utils/pushManager";
import { ChatMessage, ChatsType } from "src/types/apps/chat";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  fetchMessages,
  sendComment,
  sendMessage as sendElmaMessage,
} from 'src/store/middleware/thunks/messageThunks';

import { selectClientName } from "src/store/selectors/authSelector";
import '../chats/chat.css';
import { stripHtml } from "src/utils/stripHTML";
import { selectTickets } from "src/store/selectors/ticketsSelectors";
import { selectSelectedchat } from 'src/store/selectors/messagesSelectors.ts';

type ChatMsgSentProps = {
  currentChat: ChatsType | null;
  updateChat: (chat: ChatsType | null) => void;
  replyToMsg?: any | null;
  cancelReply?: () => void;
  setReplyHeight?: (value: number) => void;
};

const ChatMsgSent = ({
  currentChat,
  updateChat,
  replyToMsg,
  cancelReply,
  setReplyHeight,
}: ChatMsgSentProps) => {
  const dispatch = useAppDispatch();
  const clientName = useAppSelector(selectClientName);
  const tickets = useAppSelector(selectTickets);
  const selectedChat = useAppSelector(selectSelectedchat)

  const replyRef = useRef<HTMLElement>(null);
  const filesRef = useRef<HTMLElement>(null);


  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (setReplyHeight && (replyRef.current || filesRef.current)) {
      setReplyHeight((replyRef?.current?.offsetHeight ?? 0) + (filesRef?.current?.offsetHeight ?? 0));
    }
  }, [replyRef.current?.offsetHeight, filesRef.current]);

  // console.log(tickets);

  const handleChatMsgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleSendMessage = async (commentMessage: ChatMessage | null = null) => {
    if (!msg.trim() && files.length === 0) return;

    const chatId = selectedChat?.taskId || currentChat?.taskId || tickets.find((t) => t.nomer_zakaza === selectedChat?.name).__id || '';
    const orderNumber = selectedChat?.name || currentChat?.name || "";

    if (commentMessage) {
      // console.log(commentMessage); 
      // Отправка комментария к сообщению
      dispatch(fetchMessages(chatId));
      cancelReply?.();
      dispatch(sendComment({ id: commentMessage.messageId ?? commentMessage.id, text: msg, files }));
      setFiles([]);
      // sendPushFromClient(msg, `Заказ - ${currentChat?.name}`);
      setMsg("");
      return;
    }

    // console.log(files);cancelReply?.();
    const url = tickets.find((el: any) => el.nomer_zakaza === orderNumber)?.ssylka_na_kartochku ?? '';
    const match = url.match(/\bhttps?:\/\/[^\s\]]+/);
    const cleanUrl = match ? match[0] : null;

    dispatch(sendElmaMessage({ id: chatId, text: msg, orderNumber, files, url: cleanUrl }));
    setFiles([]);
    // sendPushFromClient(msg, `Заказ - ${orderNumber}`);
    setMsg("");
    
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(replyToMsg);
    }
  };

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(URL.createObjectURL(file)));
    };
  }, [files]);

  const replyedText = replyToMsg ? stripHtml(replyToMsg?.msg?.trim()
    ? replyToMsg.msg
    : replyToMsg.body ? replyToMsg.body : replyToMsg.files?.length
    ? `📎 ${replyToMsg.files[0].__name || replyToMsg.files[0].name}`
    : "[Пустое сообщение]") : '';

  useEffect(() => {
    if (replyRef && replyToMsg?.length === 0) {
      replyRef.current?.blur();
    }
  }, [replyToMsg]);

  useEffect(() => {
    if (filesRef && files?.length === 0) {
      filesRef.current?.blur();
    }
  }, [replyToMsg]);

  return (
    <Box p={2}>
      {/* Блок ответа на сообщение */}
      {replyToMsg && (
        <Box
          ref={replyRef}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          bgcolor="grey.100"
          px={2}
          py={1}
          mb={1}
          borderLeft="4px solid #1976d2"
          borderRadius={1}
        >
          <Box flexGrow={1} pr={2}>
            <Typography fontSize={12} color="text.secondary">
              Ответ на сообщение
            </Typography>
            <Typography fontSize={14}>
              {replyedText.length > 100 ? `${replyedText.slice(0, 100)}...` : replyedText}
            </Typography>
          </Box>
          <IconButton onClick={cancelReply} size="small">
            ✕
          </IconButton>
        </Box>
      )}

      {/* Selected Files Review */}
      {files.length > 0 && (
        <Box display="flex" ref={filesRef} flexWrap="wrap" gap={1} mb={1}>
          {files.map((file, index) => (
            <Box key={index} position="relative">
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  width={80}
                  height={80}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                />
              ) : (
                <Box
                  width={80}
                  height={80}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="grey.200"
                  borderRadius={4}
                >
                  <Typography variant="caption" align="center">
                    {file.name}
                  </Typography>
                </Box>
              )}
              <IconButton
                size="small"
                onClick={() => handleRemoveFile(index)}
                style={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  backgroundColor: "white",
                }}
              >
                ✕
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Поле ввода и кнопки */}
      <Box display="flex" gap="10px" alignItems="center">
        <InputBase
          id="msg-sent"
          fullWidth
          value={msg}
          placeholder="Ваше сообщение"
          size="small"
          type="text"
          inputProps={{ "aria-label": "Ваше сообщение" }}
          onChange={handleChatMsgChange}
          onKeyDown={handleKeyPress}
        />

        {/* Файловый инпут */}
        <Box position="relative" display="inline-block">
          <IconButton aria-label="attach" size="large" type="button">
            <IconPaperclip stroke={1.5} size="20" />
          </IconButton>
          <input
            accept="image/*,application/pdf"
            type="file"
            multiple
            onChange={handleFileChange}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </Box>

        {/* Кнопка отправки */}
        <IconButton
          aria-label="send"
          onClick={() => handleSendMessage(replyToMsg)}
          disabled={!msg.trim() && files.length === 0}
          color={(!msg.trim() && files.length === 0) ? 'default' : 'primary'}
        >
          <IconSend stroke={1.5} size="20" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatMsgSent;
