import axios from "axios";
import { TOKEN } from "../const";
import { ELMATicket } from "../data/types";

export async function getContact(clientId: string) {
     const responseUser = await axios.post(
        "https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list",
        {
        active: true,
        fields: {
            "*": true,
        },
        filter: {
            tf: {
            __user: `${clientId}`,
            },
        },
        },
        {
        headers: {
            Authorization: `${TOKEN}`,
        },
        },
    );

    const data = responseUser.data.result.result[0];

    const company = data.company;

    const getContact = await axios.post(
        "https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/list",
        {
        active: true,
        fields: {
            "*": true,
        },
        filter: {
            tf: {
            // вернуть после соответствия
            // "fio": `${fullname}`,
            _companies: [`${company[0]}`],
            },
        },
        },
        {
        headers: {
            Authorization: `${TOKEN}`,
            "Content-Type": "application/json",
        },
        },
    );

    const contactData = getContact.data?.result;

    return contactData.total > 1
        ? contactData.result?.map((el: any) => el.__id)
        : [contactData.result[0]?.__id];
}

export async function getOrders(kontakt: string) {
    const elmaResponse = await axios.post(
        "https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/list",
        {
        active: true,
        fields: {
            "*": true,
        },
        filter: {
            tf: {
            kontakt: kontakt,
            },
        },
        size: 10000,
        },
        {
        params: {
            limit: 10000,
            offset: 0,
        },
        headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
        },
        },
    );

    return elmaResponse.data?.result?.result || [];
}

export async function getMessages(order: ELMATicket, token: string, cookie: string) {
    const orderId = order.__id;

    try {
    // 📥 Получаем непрочитанные сообщения
    const responseUnread = await axios.get(
        `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages?offset=0&limit=1000000&condition=unread`,
        {
        headers: {
            'Authorization': token,
            'Cookie': cookie,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://portal.dev.lead.aero',
            'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${orderId})`,
        },
        withCredentials: true
        }
    );

    const unreadMessages = responseUnread.data?.result || [];

    // ✅ Помечаем непрочитанные как прочитанные
    for (const message of unreadMessages) {
        const messageId = message.__id;
        await axios.put(
        `https://portal.dev.lead.aero/api/feed/messages/${messageId}/markread`,
        JSON.stringify({
            readCount: 1,
            count: message.comments.length + 1
        }),
        {
            headers: {
            'Authorization': token,
            'Cookie': cookie,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://portal.dev.lead.aero',
            'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${orderId})`,
            },
            withCredentials: true
        }
        );
    }

    // 📥 Получаем все сообщения
    const responseAll = await axios.get(
        `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages`,
        {
        params: { limit: 100000, offset: 0 },
        headers: {
            'Authorization': token,
            'Cookie': cookie,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://portal.dev.lead.aero',
            'Referer': 'https://portal.dev.lead.aero/',
        },
        withCredentials: true
        }
    );

    const elmaData = responseAll.data;

    return Array.isArray(elmaData) ? elmaData : elmaData?.result || [];

    } catch (error) {
    console.error(`Ошибка при обработке сообщений по заказу ${orderId}:`, error);
    }
}