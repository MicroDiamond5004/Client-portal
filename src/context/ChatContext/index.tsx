'use client'
import { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import React from "react";
import useSWR from 'swr';
import { ChatsType, MessageType } from '../../types/apps/chat';
import { getFetcher, postFetcher } from 'src/api/globalFetcher';
import getAllTicketsData from 'src/mocks/tickets/get-tickets';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { useSearchParams } from 'react-router';


// Define context props interface
export interface ChatContextProps {
    chatData: ChatsType[];
    chatContent: any[];
    chatSearch: string;
    selectedChat: ChatsType | null;
    loading: boolean;
    error: string;
    activeChatId: number | null;
    setChatContent: Dispatch<SetStateAction<any[]>>;
    setChatSearch: Dispatch<SetStateAction<string>>;
    setSelectedChat: Dispatch<SetStateAction<ChatsType | null>>;
    setActiveChatId: Dispatch<SetStateAction<number | null>>;
    sendMessage: (chatId: number | string, message: MessageType) => void;
    setLoading: Dispatch<SetStateAction<boolean>>;
    setError: Dispatch<SetStateAction<string>>;
}

// Create the context
export const ChatContext = createContext<ChatContextProps>({
    chatData: [],
    chatContent: [],
    chatSearch: '',
    selectedChat: null,
    loading: true,
    error: '',
    activeChatId: null,
    setChatContent: () => { },
    setChatSearch: () => { },
    setSelectedChat: () => { },
    setActiveChatId: () => { },
    sendMessage: () => { },
    setLoading: () => { },
    setError: () => { },
});

// Create the provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [chatData, setChatData] = useState<ChatsType[]>([]);
    const [chatContent, setChatContent] = useState<any[]>([]);
    const [chatSearch, setChatSearch] = useState<string>('');
    const [selectedChat, setSelectedChat] = useState<ChatsType | null>(null);
    const [activeChatId, setActiveChatId] = useState<number | null>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const { data: ChatsData, isLoading: isChatsLoading, error: Chatserror, mutate } = useSWR('/api/data/chat/ChatData', getFetcher);
    const { result: secondData } = getAllTicketsData();

    const [searchParams, setSearchParams] = useSearchParams();
    // Fetch chat data from the API
    useEffect(() => {
        console.log(ChatsData, secondData, 'PFITTTT');
        if (ChatsData && secondData) {
            setLoading(isChatsLoading);
            const chatsData = ChatsData.data;

            const currentData = secondData.result.map((ticket) => {
                return {...chatsData[Math.floor(Math.random() * 1000) % 10], name: ticket.nomer_zakaza, id: Number(ticket.nomer_zakaza)}
            });

            const urlId = searchParams.get("item");
            const currentId = chatData.find((chat) => chat.id === Number(urlId)) ? urlId : chatData[0]?.id ?? 0;
            console.log(currentId);

            if (activeChatId !== Number(currentId) && chatData) {
                setActiveChatId(Number(currentId));
                const currentChat = chatData.find((chat) => chat.id === Number(currentId)) ?? currentData[0]
                if (currentChat) {
                    setSearchParams({ item: currentChat.id })
                }
                setSelectedChat(currentChat);
            }

            setChatData(currentData);
        } else if (Chatserror) {
            setError(Chatserror)
            setLoading(isChatsLoading);
            console.log("Failed to fetch the data")
        }
        else {
            setLoading(isChatsLoading);
        }
    }, [ChatsData, Chatserror, isChatsLoading, chatData.length]);

    // Function to send a message to a chat identified by `chatId` using an API call.
    const sendMessage = async (chatId: number | string, message: MessageType) => {
        try {
            let { data } = await mutate(postFetcher('/api/sendMessage', { chatId, message }));
            let chat = data.find((chat: any) => chat.id === chatId)
            setSelectedChat(chat);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const value: ChatContextProps = {
        chatData,
        chatContent,
        chatSearch,
        selectedChat,
        loading,
        error,
        activeChatId,
        setChatContent,
        setChatSearch,
        setSelectedChat,
        setActiveChatId,
        sendMessage,
        setError,
        setLoading,
    };
    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};


