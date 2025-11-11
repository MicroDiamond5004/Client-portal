import { findUserByClientId, getWebsocketSession, getWebsocketSessionsByUserId } from "../../data/mongodbStorage";
import { IAuthor, IFilePreview, IMessage, IOrder, IPassport } from "../../models";
import { sendToUser } from "../../websocket";

interface UserOrderData {
    userId: string;
    order?: IOrder | null;
    type: string;
    passports?: Record<string, [string | undefined, string | undefined]>;
    files?: IFilePreview[];
}

interface UserMessageData {
    userId: string;
    message?: IMessage | null;
    type: string;
    authors?: Record<string, string>;
    files?: IFilePreview[]
}

export const updateMessageToUser = async ({userId, message, type, authors}: UserMessageData) => {
    const user = await findUserByClientId(userId);

    const email = user?.email;
    if (!email) {
        throw new Error('Error with updating user data (message)');
    }

    
    const websocketSessions = await getWebsocketSessionsByUserId(userId);

    const websoketIds: string[] = [];  

    websocketSessions?.forEach((websocketSession) => {
        if (websocketSession.orderIds.includes(message?.targetId ?? '')) {   
            websoketIds.push(websocketSession.id); 
        }
    })

    // console.log('websoket sessions for send new message: ', websocketSessions);

    if (websoketIds.length > 0) {
        sendToUser(websoketIds, email, {data: {message, authors}, type});
    }
}

export const updateOrderToUser = async ({userId, order, type, passports}: UserOrderData) => {
    const user = await findUserByClientId(userId);

    const email = user?.email;
    if (!email) {
        throw new Error('Error with updating user data (order)');
    }

    
    const websocketSessions = await getWebsocketSessionsByUserId(userId);

    const websoketIds: string[] = [];  

    websocketSessions?.forEach((websocketSession) => {
        if (websocketSession.orderIds.includes(order?.elmaId ?? '')) {   
            websoketIds.push(websocketSession.id); 
        }
    })

    if (websoketIds.length > 0) {
        sendToUser(websoketIds, email, {data: {order, passports}, type});
    }
}