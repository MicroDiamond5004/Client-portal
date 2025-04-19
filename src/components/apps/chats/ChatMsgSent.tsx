import React, { useContext } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";

import {
  IconPaperclip,
  IconPhoto,
  IconSend,
} from "@tabler/icons-react";
import { ChatContext } from "src/context/ChatContext";
import { sendPushFromClient } from "src/utils/pushManager";
import { ChatMessage, ChatsType } from "src/types/apps/chat";
import { ELMATicket } from "src/mocks/tickets/ticket.type";
import { messages } from "src/layouts/full/vertical/header/data";
import { sendElmaMessage } from "src/api/ELMA-api/messages";

type ChatMsgSentProps = {
  currentChat: ChatsType | null,
  updateChat: ((chat: ChatsType | null) => void),
}

const sendMessage = async (chatId: string, message: string, orderNumber: string) => {
    console.log(chatId, message);
    try {
        // const data = await fetchELMA('app/work_orders/OrdersNew/list', {
        //     method: 'POST',
        //     body: {
        //         "active": true,
        //         "fields": {
        //         "*": true
        //         },
        //         "from": 280,
        //         "size": 2
        //       }  
        //   });

        const data = await sendElmaMessage(chatId, message, orderNumber);

        console.log(data, chatId, message, 'ОТПРАВИЛ!');
          
        // let { data } = await mutate(postFetcher('/api/sendMessage', { chatId, message }));
        // let chat = data.find((chat: any) => chat. === chatId)
        // setSelectedChat(chat);
    } catch (error) {
    }
};

const ChatMsgSent = (props: ChatMsgSentProps | null = null) => {
  let currentChat: ChatsType | null = null;
  let updateChat: (chat: ChatsType | null) => void;

  if (props) {
    currentChat = props.currentChat;
    updateChat = props.updateChat;
  }

  const [msg, setMsg] = React.useState<any>("");

  const { selectedChat } = useContext(ChatContext);


  const handleChatMsgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value);
  };


  const onChatMsgSubmit = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const chat = selectedChat || currentChat;
    if (!msg.trim() || !chat) return;
    sendMessage(chat.taskId, msg.trim() as any, selectedChat?.name || currentChat?.name || '');
    setMsg("");
  };  

  console.log(msg);

  return (
    <Box p={2}>
      {/* ------------------------------------------- */}
      {/* sent chat */}
      {/* ------------------------------------------- */}
      <Box
        style={{ display: "flex", gap: "10px", alignItems: "center" }}
      >
        {/* ------------------------------------------- */}
        {/* Emoji picker */}
        {/* ------------------------------------------- */}

        <InputBase
          id="msg-sent"
          fullWidth
          value={msg}
          placeholder="Type a Message"
          size="small"
          type="text"
          inputProps={{ "aria-label": "Type a Message" }}
          onChange={handleChatMsgChange.bind(null)}
        />
        <IconButton
          aria-label="delete"
          onClick={() => {
            sendPushFromClient(msg, `Заказ - ${currentChat?.name || selectedChat?.name}`);
            sendMessage(selectedChat?.taskId || currentChat?.taskId || "", msg as any, selectedChat?.name || currentChat?.name || '');
            setMsg("");
            console.log(sendMessage);
            if (currentChat) {
              const updatedMessages = currentChat.messages;
              updatedMessages.push({...updatedMessages[updatedMessages.length - 1], id: String(Math.random), createdAt: new Date(), msg})
              const updatedChat = {...currentChat, messages: updatedMessages}
              updateChat(updatedChat);
            }
          }}
          disabled={!msg}
          color="primary"
        >
          <IconSend stroke={1.5} size="20" />
        </IconButton>
        <IconButton aria-label="delete">
          <IconPhoto stroke={1.5} size="20" />
        </IconButton>
        <IconButton aria-label="delete">
          <IconPaperclip stroke={1.5} size="20" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatMsgSent;
