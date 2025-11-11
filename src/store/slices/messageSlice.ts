import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchMessages, sendMessage } from "../middleware/thunks/messageThunks";
import { logoutAll } from '../middleware/thunks';
import { ELMAChat } from "src/types/apps/chat";
import { SLiceNames } from "../names/names";
import { indexOf, isEqual } from "lodash";
import { RootState } from 'src/store';
import { ELMATicket } from 'src/data/types.ts';
import { ElmaChat, ElmaMessage } from 'src/mocks/chats/chat.type';

interface MessageState {
    prevChats: any;
    status: "idle" | "loading" | "succeeded" | "failed";
    unreadedChatsNumber: number;
    chats?: ElmaChat[];
    selectedChat?: any;
    chatSearch?: string;
  }

// function waitForTickets(getState: () => RootState, timeout = 3000): Promise<void> {
//   return new Promise((resolve, reject) => {
//     const start = Date.now();

//     const check = () => {
//       const state = getState();
//       if (state.tickets?.tickets?.length > 0) return resolve();

//       if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for tickets'));

//       setTimeout(check, 100);
//     };

//     check();
//   });
// }

// const updateMessageFunction = (newMessages: any, tickets: ELMATicket[]) => {
//   const allChatData = Object.entries(newMessages).map(([ticketNumber, rawMessages]) => {
//     const allFiles: any[] = [];

//     const preparedMessages = (rawMessages ?? []).map((m: any) => {
//       m.files?.forEach((f: any) => allFiles.push(f));
//       m.comments?.forEach((c: any) => c.files?.forEach((f: any) => allFiles.push(f)));

//       return {
//         id: m.__id,
//         msg: m.body ?? '',
//         createdAt: m.__createdAt,
//         senderId: m.author,
//         comments: m.comments,
//         files: m.files || [],
//       };

//     }).filter((el: any) => !(el.author?.includes('00000000-0000-0000-0000-000000000000')));

//     preparedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

//     const taskId = tickets?.find((el) => el.nomer_zakaza === ticketNumber)?.__id;

//     const isChanged = rawMessages?.some(
//       (el) => el.isChanged || el.comments?.some((com) => com.isChanged)
//     );

//     return {
//       name: ticketNumber,
//       id: ticketNumber,
//       messages: preparedMessages,
//       taskId,
//       files: allFiles,
//       isChanged,
//     };
//   });

//   const unreadedChats = Object.values(newMessages)?.filter((messages: any) => messages?.some((el) => !(el?.author?.includes('00000000-0000-0000-0000-000000000000')) && el.isChanged))?.length;

//   return {allChatData, unreadedChats};
// }

export const updateAllMessages = createAsyncThunk(
  'messages/updateAllMessages',
  async (chats: any[], { getState }) => {

    // {
    //   name: order.nomer_zakaza,
    //   id: order.nomer_zakaza,
    //   messages: preparedMessages,
    //   taskId: order.__id,
    //   files: filesFromChat,
    //   authors, 
    //   isChanged,
    // }

    // FRONTEND

    // {
    //   name: ticketNumber,
    //   id: ticketNumber,
    //   messages: preparedMessages,
    //   taskId,
    //   files: allFiles,
    //   isChanged,
    // };

    const unreadChats = chats.filter((chat) => chat.isChanged).length;

    return {chats, unreadChats};
  }
);



// chatData,
//   setChatData,
//   selectedChat,
//   setSelectedChat,
//   sendMessage,

  const initialState: MessageState = {
    chats: [],
    prevChats: [],
    status: "loading",
    unreadedChatsNumber: 0
  };
  
  const messagesSlice = createSlice({
    name: SLiceNames.MESSAGES,
    initialState,
    reducers: {
      updateChatSearch(state, action: PayloadAction<string>) {
        state.chatSearch = action.payload;
      },
      updateSelectedChat: (state, action: PayloadAction<any>) => {
        state.selectedChat = action.payload;
      },
      addNewMessage(state, action: PayloadAction<any>) {
        const { message, authors } = action.payload;
        const { authorId, body, comments, targetId, createdAt, __id } = message;

        let flag = true;

        for (const chat of state.chats ?? []) {
          if (chat?.messages?.find((el) => el.id === __id)) {
            flag = false;
            break;
          }
        }

        if (flag) {
          const chat = state.chats?.find((el) => el.taskId === targetId);
          if (chat) {
            chat.messages = [
              ...chat.messages,
              {
                id: __id,
                msg: body,
                createdAt: createdAt ?? new Date().toISOString(),
                senderId: authorId,
                comments: comments ?? [],
              },
            ];
            chat.authors = authors;
          }
        }
      },
      updateUnreadChats(state, action: PayloadAction<number>) {
        state.unreadedChatsNumber = action.payload;
      }
    },
      extraReducers: (builder: any) => {
      builder
        .addCase(updateAllMessages.fulfilled, (state: MessageState, action: any) => {
          console.log('ОБНОВИЛ ЧАТ');
          state.prevChats = state.chats;
          state.chats = action.payload.chats;
          state.unreadedChatsNumber = action.payload.unreadChats;
          state.status = "succeeded";
        })
        .addCase(logoutAll.fulfilled, (state: MessageState) => {
          state.chats = [];
          state.prevChats = [];
          state.unreadedChatsNumber = 0;
          state.selectedChat = {};
        })
        .addCase(fetchMessages.rejected, (state: MessageState) => {
          state.status = "succeeded";
        })
        .addCase(sendMessage.pending, (state: MessageState, action: any) => {
          const { id, text, userId } = action.meta.arg;
          const tempId = `temp_${action.meta.requestId}`;

          console.log(action.meta.arg);

          console.log(tempId);

          const tempMessage = {
            id: tempId,
            msg: text,
            createdAt: new Date().toISOString(),
            senderId: userId,
            comments: [],
          };

          // Update both chats and selectedChat immutably
          state.chats = state.chats?.map((chat) =>
            chat.taskId === id
              ? { ...chat, messages: [tempMessage, ...chat.messages] }
              : chat
          );

          const currentChat = state.chats?.find((el) => el.taskId === id);

          if (state.selectedChat?.taskId === id) {
            state.selectedChat = {
              ...currentChat,
              messages: [tempMessage, ...state.selectedChat.messages],
            };
          }
        })

        .addCase(sendMessage.fulfilled, (state: MessageState, action: any) => {
          const newMessage = action.payload;
          const tempId = newMessage.tempId;
          const chatId = newMessage.target.id; // или другое поле, которое однозначно идентифицирует чат

          const updateMessages = (messages: ElmaMessage[]) => {
            const hasTemp = messages.some((m) => m.id === tempId);
            return hasTemp
              ? messages.map((m) => (m.id === tempId ? { ...newMessage, id: newMessage.__id } : m))
              : [{ ...newMessage, id: newMessage.__id }, ...messages];
          };

          // Обновляем state.chats
          state.chats = state.chats?.map((chat) =>
            chat.id === chatId
              ? { ...chat, messages: updateMessages(chat.messages) }
              : chat
          );

          // Обновляем state.selectedChat, если это тот же чат
          if (state.selectedChat?.id === chatId) {
            state.selectedChat = {
              ...state.selectedChat,
              messages: updateMessages(state.selectedChat.messages),
            };
          }
        })
        .addCase(sendMessage.rejected, (state: MessageState, action: any) => {
          const { requestId, arg } = action.meta;
          const tempId = `temp_${requestId}`;

          state.chats = state.chats?.map((chat) =>
            chat.id === arg.id
              ? {
                  ...chat,
                  messages: chat.messages.filter((m) => m.id !== tempId),
                }
              : chat
          );

          if (state.selectedChat?.id === arg.id) {
            state.selectedChat = {
              ...state.selectedChat,
              messages: state.selectedChat.messages.filter((m: any) => m.id !== tempId),
            };
          }
        });

    }
  });

  export const { updateUnreadChats, updateChatSearch,  updateSelectedChat, addNewMessage } = messagesSlice.actions;
  export default messagesSlice.reducer;