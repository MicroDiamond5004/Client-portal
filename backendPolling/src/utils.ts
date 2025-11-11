import axios from "axios";
import { ELMATicket } from "./data/types";
import { IMessage, Session } from "./models";
import { createFile, getAuthor, getCookieByToken, getFileById, getMessagesByOrderId, isSessionExpired, saveCookieAndToken } from "./data/mongodbStorage";
import { AllStatus, AUTH_DATA_PATH, auth_login, authURL, loginURL, logoutURL, password, TOKEN } from "./const";
import fs from "fs";
import { getAuthors, getFiles } from "./polling/pollingFunctions";

export function sortAllTickets(tickets: ELMATicket[]): ELMATicket[] {
  return [...tickets].sort((a, b) => {
    // Сначала те, у кого isChanged === true
    if (a.isChanged !== b.isChanged) {
      return a.isChanged ? -1 : 1;
    }

    // Затем сортировка по убыванию nomer_zakaza (по номеру заказа)
    return Number(b?.nomer_zakaza || '0') - Number(a?.nomer_zakaza || '0');
  });
}

export async function saveAuth({token, cookie }: { token: string, cookie: string }) {
  try {
    await saveCookieAndToken(token, cookie);
  } catch (error) {
    console.error('Error saving auth to MongoDB:', error);
  }
}

export async function readAuth(): Promise<{ token: string, cookie: string } | null> {
  try {
    // Query MongoDB for the latest valid session
    const session = await Session.findOne({ 
      expiresAt: { $gt: new Date() } 
    }).sort({ createdAt: -1 });
    
    if (session) {
      return {
        token: session.token,
        cookie: session.cookie
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error reading auth from MongoDB:', error);
    return null;
  }
}

interface AuthToken {
  token: string;
  cookie: string;
}

export async function isTokenExpiringSoonOrInvalid({token, cookie}: AuthToken): Promise<boolean> {
  try {
    const firstLogin = await axios.get("https://portal.dev.lead.aero/api/auth", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Cookie": `${cookie}`, 
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Referer": "https://portal.dev.lead.aero/_login?returnUrl=%2Fwork_orders%2F__portal",
        "Sec-CH-UA": `"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"`,
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": `"Windows"`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "X-Language": "ru-RU",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    if (firstLogin?.data?.userId) return false;

    return true;

    // const [, payloadBase64] = newToken.split('.');
    // const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    // const now = Math.floor(Date.now() / 1000);
    // return !payload.exp || payload.exp - now <= 300;

  } catch (err) {
    // console.warn('⚠ Ошибка проверки токена:', err);
    return true;
  }
}


export async function getSergeiToken(): Promise<string> {
  const cached = await readAuth();

  if (cached?.token && !(await isTokenExpiringSoonOrInvalid(cached)) && !(await isSessionExpired(cached.token))) {
    return cached.token;
  }

  try {
    // 1️⃣ Первый login
    const firstLogin = await axios.post(loginURL, {
      auth_login,
      password,
      portal: 'work_orders',
    }, {
      withCredentials: true,
    });

    const setCookiePrev = firstLogin.headers['set-cookie'];
    if (!setCookiePrev) throw new Error('⛔ Не получены cookie от первого логина');

    // 2️⃣ Logout
    await axios.post(logoutURL, {}, {
      headers: { Cookie: setCookiePrev },
    });

    // 3️⃣ Второй login
    const mainLogin = await axios.post(loginURL, {
      auth_login,
      password,
      portal: 'work_orders',
    }, {
      withCredentials: true,
    });

    const rawSetCookie = mainLogin.headers['set-cookie'];
    const cookieValue = rawSetCookie?.[0]?.split(';')[0]; // vtoken=...

    if (!cookieValue) throw new Error('⛔ Cookie после второго логина не получена');

    // 4️⃣ Получение токена
    const auth = await axios.get(authURL, {
      headers: { Cookie: cookieValue },
    });

    const currentToken = auth.headers['token'];
    if (!currentToken) throw new Error('⛔ Токен не получен из /api/auth');

    saveAuth({token: currentToken, cookie: cookieValue})

    return currentToken;

  } catch (e) {
    // // console.error('❌ Ошибка в getSergeiToken:', e);
    throw e;
  }
}

const authenticateToken = async (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')?.trim();

  if (!token) {
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  const cookie = getCookieByToken(token);

  if (!cookie) {
    return res.status(401).json({ error: "Сессия не найдена для токена" });
  }

  // console.log(`Bearer ${token}`);

const response = await axios.get("https://portal.dev.lead.aero/api/auth", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json, text/plain, */*",
      "Cookie": typeof cookie === "string" ? cookie : "",
      "Content-Type": "application/json",
      "Referer": "https://portal.dev.lead.aero/_login?returnUrl=%2Fwork_orders%2F__portal",
      "Sec-CH-UA": `"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"`,
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": `"Windows"`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      "X-Language": "ru-RU",
      "X-Requested-With": "XMLHttpRequest"
    }
  });


  try {
    const savedClientId = response.data.userId ?? '';

    const responseUser = await axios.post(
      'https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list',
      {
        "active": true,
        "fields": {
          "*": true
        },
        "filter": {
          "tf": {
            "__user": `${savedClientId}`
          }
        }
      },
      {
        headers: {
          Authorization: `${TOKEN}`
        }
      }
    );

    const data = responseUser.data.result.result[0];

    req.email = data.email;
    req.fullname = data.__name;
    req.company = data.company;

    req.fullnameObject = data.fullname;

    req.clientId = savedClientId;
    req.clientName = response.data.username ?? 'Клиент';
    req.externalToken = token;

    next();
  } catch (error: any) {
    // console.error("Ошибка при проверке токена:", error?.response?.data);
    return res.status(403).json({
      error: `Ошибка при валидации токена ${error}`
    });
  }
};

export default authenticateToken;


export function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '');
}

export function readAuthData() {
  const data = fs.readFileSync(AUTH_DATA_PATH, "utf-8");
  return JSON.parse(data);
}

export function mergeIsChanged<T extends { __id: string; isChanged?: boolean }>(
  oldItems: T[],
  newItems: T[]
): T[] {
  const map = new Map(oldItems.map(item => [item.__id, item]));

  return newItems.map(newItem => {
    const oldItem = map.get(newItem.__id);

    if (oldItem) {
      return {
        ...oldItem,
        ...newItem,
        isChanged: oldItem.isChanged === false && newItem.isChanged === true
          ? false
          : newItem.isChanged
      };
    }

    return newItem;
  });
}


export function mergeMessagesWithIsChanged(
  oldMessages: Record<string, any[]>,
  newMessages: Record<string, any[]>
): Record<string, any[]> {
  const result: Record<string, any[]> = {};

  for (const key of Object.keys(newMessages)) {
    const old = oldMessages[key] || [];
    const incoming = newMessages[key];

    const map = new Map(old.map(m => [m.__id, m]));

    result[key] = incoming.map(m => {
      const existing = map.get(m.__id);
      if (existing && existing.isChanged === false && m.isChanged === true) {
        return { ...m, isChanged: false };
      }
      return m;
    });
  }

  return result;
}

export const getStatus = (ticket: any): string => {
  let status = 'Не определен';
  switch (ticket?.__status?.status) {
    // Новый заказ
    case 1:
      status = AllStatus.NEW;
      break;
    //  В работе
    case 2:
      status = ticket.tip_zakaz ? AllStatus.PENDING : AllStatus.NEW;
      break;
    // Ожидание
    case 3:
      status = AllStatus.PENDING;
      break;
    case 4:
      status = ticket.otvet_klientu ? AllStatus.BOOKED : AllStatus.PENDING;
      break;
    // Выписка
    case 5:
      status = AllStatus.BOOKED;
      break;
    // Завершено
    case 6:
      status = AllStatus.FORMED;
      break;
    // Снято
    case 7:
      status = AllStatus.CLOSED;
      break;
  }

  return status;
}

export async function createChatFromMessages(userId: string, order: ELMATicket) {
  const allFileIds: string[] = [];

  let isChanged = false;

  const messages = await getMessagesByOrderId(order.__id ?? '');

  const authorIds = new Set<string>();

  const preparedMessages = messages?.map((m: any) => {
    m.files?.forEach((f: any) => allFileIds.push(f));
    m.comments?.forEach((c: any) => c.files?.forEach((f: any) => allFileIds.push(f)));

    if (m.authorId) {
      authorIds.add(m.authorId);
    }

    m.comments?.forEach((comment: any) => {
      if (comment.author) {
        authorIds.add(comment.author);
      }
    })

    if (m.isChanged) {
      isChanged = true;
    }

    return {
      id: m.__id,
      msg: m.body ?? '',
      createdAt: m.createdAt,
      senderId: m.authorId,
      comments: m.comments,
    };
  }).filter((el: any) => !(el.authorId?.includes('00000000-0000-0000-0000-000000000000'))) ?? [];

  preparedMessages?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const filesFromChat = await Promise.all(allFileIds.map(async (id) => await getFileById(id)));

  const authors: Record<string, string> = Object.fromEntries(
    await Promise.all(
      Array.from(authorIds).map(async (id) => {
        const author = await getAuthor(id);
        return [id, author?.name]
      })
    )
  );

  return {
    name: order.nomer_zakaza,
    id: order.nomer_zakaza,
    taskId: order.__id,
    isChanged,

    files: filesFromChat,
    messages: preparedMessages,
    authors, 
  };
};