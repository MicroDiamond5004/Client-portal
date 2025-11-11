import { RootState } from "..";

export const selectMessagesStatus = (state: RootState) => state.messages.status;
export const selectUnreadedChats = (state: RootState) => state.messages.unreadedChatsNumber;
export const selectChats = (state: RootState) => state.messages.chats;
export const selectSelectedchat = (state: RootState) => state.messages.selectedChat;
export const selectChatSearch = (state: RootState) => state.messages.chatSearch;
