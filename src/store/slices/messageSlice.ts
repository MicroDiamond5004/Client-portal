import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchMessages, sendMessage } from "../middleware/thunks/messageThunks";
import { logoutAll } from '../middleware/thunks';
import { ELMAChat } from "src/types/apps/chat";
import { SLiceNames } from "../names/names";
import { indexOf, isEqual } from "lodash";
import { RootState } from 'src/store';

interface MessageState {
    messages: any;
    prevMessages: any;
    status: "idle" | "loading" | "succeeded" | "failed";
    unreadedChats: number;
    mockMessages?: any;
    chatData?: any;
    selectedChat?: any;
    chatSearch?: string;
  }

function waitForTickets(getState: () => RootState, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const state = getState();
      if (state.tickets?.tickets?.length > 0) return resolve();

      if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for tickets'));

      setTimeout(check, 100);
    };

    check();
  });
}

export const updateAllMessages = createAsyncThunk(
  'messages/updateAllMessages',
  async (newMessages: any, { getState }) => {
    await waitForTickets(getState);
    const state = getState() as RootState;

    const tickets = state.tickets.tickets; // <- данные из другого слайса

    const allChatData = Object.entries(newMessages).map(([ticketNumber, rawMessages]) => {
      const allFiles: any[] = [];

      const preparedMessages = (rawMessages ?? []).map((m: any) => {
        m.files?.forEach((f: any) => allFiles.push(f));
        m.comments?.forEach((c: any) => c.files?.forEach((f: any) => allFiles.push(f)));

        return {
          id: m.__id,
          msg: m.body ?? '',
          createdAt: m.__createdAt,
          senderId: m.author,
          comments: m.comments,
          files: m.files || [],
        };
      }).filter((el: any) => !(el.author?.includes('00000000-0000-0000-0000-000000000000')));

      preparedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const taskId = tickets?.find((el) => el.nomer_zakaza === ticketNumber)?.__id;

      const isChanged = rawMessages?.some(
        (el) => el.isChanged || el.comments?.some((com) => com.isChanged)
      );

      return {
        name: ticketNumber,
        id: ticketNumber,
        messages: preparedMessages,
        taskId,
        files: allFiles,
        isChanged,
      };
    });

    const unreadedChats = Object.values(newMessages)?.filter((messages: any) => messages?.some((el) => !(el?.author?.includes('00000000-0000-0000-0000-000000000000')) && el.isChanged))?.length;

    return {
      newMessages,
      allChatData,
      unreadedChats
    };
  }
);


export const fetchTickets = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const tickets = state.tickets.tickets;

    return tickets;
  }
);

// chatData,
//   setChatData,
//   selectedChat,
//   setSelectedChat,
//   sendMessage,

  const initialState: MessageState = {
    messages: {},
    prevMessages: {},
    status: "idle",
    unreadedChats: 0,
    mockMessages: []
  };
  
  const messagesSlice = createSlice({
    name: SLiceNames.MESSAGES,
    initialState,
    reducers: {
      updateChatSearch(state, action: PayloadAction<string>) {
        state.chatSearch = action.payload;
      },
      updateSelectedChat: (state, action: PayloadAction<any>) => {
        state.selectedChat = {...action.payload, messages: action.payload.messages.filter((el) => !(el?.senderId?.includes('00000000-0000-0000-0000-000000000000')))};
      },
      addNewMessage(state, action: PayloadAction<ELMAChat>) {
        state.prevMessages = state.messages;
        state.messages.push(action.payload);
      },
      updateUnreadChats(state, action: PayloadAction<number>) {
        state.unreadedChats = action.payload;
      },
      addMockMessage(state, action: PayloadAction<ELMAChat>) {
        state.mockMessages = [...state.mockMessages, action.payload];
      }
    },
      extraReducers: (builder: any) => {
      builder
        .addCase(updateAllMessages.fulfilled, (state, action) => {
          state.prevMessages = state.messages;
          state.messages = action.payload.newMessages;
          state.chatData = action.payload.allChatData;
          state.unreadedChats = action.payload.unreadedChats;
        })
        .addCase(logoutAll.fulfilled, (state: MessageState) => {
          state.messages = {};
          state.prevMessages = {};
          state.unreadedChats = 0;
          state.chatData = {};
          state.selectedChat = null;
        })
        .addCase(fetchMessages.rejected, (state: MessageState) => {
          state.status = "failed";
        })
        .addCase(sendMessage.fulfilled, (state: MessageState, action: PayloadAction<ELMAChat>) => {
          state.messages.push(action.payload);
        });
    }
  });

  export const { addNewMessage, updateUnreadChats, addMockMessage, updateChatSearch,  updateSelectedChat } = messagesSlice.actions;
  export default messagesSlice.reducer;