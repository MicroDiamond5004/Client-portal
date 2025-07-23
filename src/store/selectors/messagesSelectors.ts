import { RootState } from "..";

export const selectMessages = (state: RootState) => state.messages.messages;
export const selectMessagesStatus = (state: RootState) => state.messages.status;
export const selectUnreadedChats = (state: RootState) => state.messages.unreadedChats;
export const selectMockMessages = (state: RootState) => state.messages.unreadedChats;
export const selectChatData = (state: RootState) => state.messages.chatData;
export const selectSelectedchat = (state: RootState) => state.messages.selectedChat;
export const selectChatSearch = (state: RootState) => state.messages.chatSearch;
