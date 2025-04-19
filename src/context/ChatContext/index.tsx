'use client'
import { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import React from "react";
import useSWR from 'swr';
import { ChatMessage, ChatsType, MessageType } from '../../types/apps/chat';
import { getFetcher, postFetcher } from 'src/api/globalFetcher';
import { ELMATicket, TicketsData } from 'src/mocks/tickets/ticket.type';
import { useSearchParams } from 'react-router';
import fetchELMA from 'src/api/ELMA-api/elma-api';
import { loginAndFetchMessages } from 'src/api/ELMA-api/login';
import { getElmaMessages, sendElmaMessage } from 'src/api/ELMA-api/messages';
import { messages } from 'src/layouts/full/vertical/header/data';
import { text } from 'stream/consumers';
import { compareAsc, isAfter } from 'date-fns';
import { sendPushFromClient } from 'src/utils/pushManager';
import { stripHtmlAndDecode } from 'src/components/apps/chats/ChatListing';
import { TicketType } from 'src/types/apps/ticket';
import { getUserOrders } from 'src/api/ELMA-api/tickets';


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
    sendMessage: (chatId: string, message: string, orderNumber: string) => void;
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

    const { data: ChatsData, isLoading: isChatsLoading, error: Chatserror } = useSWR('/api/data/chat/ChatData', getFetcher);
    const [secondData, setSeconData] = useState<TicketsData>()

    useEffect(() => {
        const fetchOrders = async () => {
          const userOrders = await getUserOrders();
          setSeconData(userOrders);
          setLoading(false);
        };
    
        fetchOrders();
      }, []);


    const [searchParams, setSearchParams] = useSearchParams();

    console.log(ChatsData);

    // Fetch chat data from the API
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        let prevMessagesMap: Record<string, number> = {}; // key: taskId, value: last message count
    
        const fetchData = async () => {
            setLoading(true);
    
            try {
                if (!ChatsData || !secondData) return;
    
                const chatsData = ChatsData.data;
    
                const fetchMessagesForTickets = async () => {
                    return Promise.all(
                        secondData.result.result.map(async (ticket: any) => {
                            let messages: ChatMessage[] = [];
    
                            if (ticket.__id) {
                                try {
                                    const fetchedMessages = await getElmaMessages(ticket.__id);
                                    const newMessages = fetchedMessages.newMessages;
                                    const filtered = fetchedMessages?.messages?.filter((m: any) => m.body) ?? [];
    
                                    messages = filtered.map((message: any) => ({
                                        attachment: [],
                                        createdAt: message.__createdAt,
                                        id: message.__id,
                                        msg: message.body,
                                        senderId: message.author === '543e820c-e836-45f0-b177-057a584463b7' ? '0' : ticket.nomer_zakaza,
                                        type: 'text'
                                    }));

                                    console.log(filtered);
    
                                    messages.sort((a, b) =>
                                        compareAsc(new Date(a.createdAt), new Date(b.createdAt || ''))
                                    );
    
                                    if (newMessages?.length > 0) {
                                         // Только новые
                                        console.log( newMessages,'dddddddddddddddddddddddddddddd')
                                        newMessages.forEach((msg: any) => {
                                            sendPushFromClient(stripHtmlAndDecode(msg.body), `Новое сообщение в заказе ${ticket.nomer_zakaza}`);
                                        });
                                    }
                                } catch (error) {
                                    console.error(`Ошибка при получении сообщений для ${ticket.__id}`, error);
                                }
                            }
    
                            return {
                                ...chatsData[0],
                                name: ticket.nomer_zakaza,
                                id: ticket.nomer_zakaza,
                                taskId: ticket.__id,
                                messages
                            };
                        })
                    );
                };
    
                const currentData = await fetchMessagesForTickets();
                setChatData(currentData);
            } catch (err) {
                console.error('Ошибка при загрузке чатов:', err);
                setError('Ошибка при загрузке чатов');
            } finally {
                setLoading(false);
            }
        };
    
        fetchData(); // Первый запуск
    
        intervalId = setInterval(fetchData, 10000);
    
        return () => {
            clearInterval(intervalId);
        };
    }, [secondData, ChatsData]);
    

    useEffect(() => {
        // синхронизируем выбранный чат с URL
        if (chatData.length === 0) return;
    
        const urlId = searchParams.get("item");
        const chatFromUrl = chatData.find((chat) => chat.id === urlId);
    
        const selected = chatFromUrl ?? chatData[0];
        if (!selected) return;
    
        if (activeChatId !== Number(selected.id)) {
            setActiveChatId(Number(selected.id));
            setSelectedChat(selected);
            setSearchParams({ item: String(selected.id) });
        }
    }, [searchParams, chatData]);

    useEffect(() => {
        if (!chatData.length) return;
    
        const current = chatData.find((c) => Number(c.id) === activeChatId);
        if (current) {
            setSelectedChat(current);
        }
    }, [chatData, activeChatId]);
    
    

    // Function to send a message to a chat identified by `chatId` using an API call.
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


