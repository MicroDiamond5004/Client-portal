import express from 'express';
import webpush from 'web-push';
import bodyParser, { json } from 'body-parser';
import cors from 'cors';
import { ELMATicket, MessageType, UserData } from './data/types';
import { getAllUsersData, getUserSubscriptions, changeSubscription, deleteUserSubscriptionByEndpoint, loadUserData, saveUserData, saveUserSubscription, findAuthFileByUserId } from './data/storage';
import path from 'path';
import { readdirSync, readFileSync } from 'fs';
import fs from 'fs';
import axios from 'axios';
import { error } from 'console';
import multer from 'multer';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from "express-rate-limit";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { get, isEqual, result } from 'lodash';
import previewRouter from './router/routes/previewRoute';
import htmlRouter from './router/routes/htmlRoute';
import { initWebSocket, sendToUser } from './websocket';
import subscriptionRouter from './router/routes/subscriptionRouter';
import http from 'http';
import { getCookieByToken, saveCookieAndToken } from './data/cookieStore';

dotenv.config();

interface UploadedFileMetadata {
  hash: string;
  size: number;
  __id: string;
  __name: string;
}

const AUTH_DATA_PATH = "./src/data/auth/authData.json";

function readAuthData() {
  const data = fs.readFileSync(AUTH_DATA_PATH, "utf-8");
  return JSON.parse(data);
}

function sortAllTickets(tickets: ELMATicket[]): ELMATicket[] {
  return [...tickets].sort((a, b) => {
    // Сначала те, у кого isChanged === true
    if (a.isChanged !== b.isChanged) {
      return a.isChanged ? -1 : 1;
    }

    // Затем сортировка по убыванию nomer_zakaza (по номеру заказа)
    return Number(b?.nomer_zakaza || '0') - Number(a?.nomer_zakaza || '0');
  });
}

const auth_login = process.env.API_USER;
const password = process.env.API_PASSWORD;

const loginURL = 'https://portal.dev.lead.aero/guard/login';
const authURL = 'https://portal.dev.lead.aero/api/auth';
const logoutURL = 'https://portal.dev.lead.aero/guard/logout';
const cookieCheckURL = 'https://portal.dev.lead.aero/guard/cookie'

const AUTH_CACHE_FILE = path.resolve(__dirname, 'data/token.json');

export function saveAuth({ token, cookie }: { token: string, cookie: string }) {
  fs.writeFileSync(AUTH_CACHE_FILE, JSON.stringify({ token, cookie }, null, 2), 'utf-8');
}

export function readAuth(): { token: string, cookie: string } | null {
  if (!fs.existsSync(AUTH_CACHE_FILE)) return null;
  try {
    const content = fs.readFileSync(AUTH_CACHE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function isTokenExpiringSoonOrInvalid(token: string): Promise<boolean> {
  try {
    const firstLogin = await axios.get("https://portal.dev.lead.aero/api/auth", {
      headers: {
        "Authorization": `Bearer ${token}`,
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

    console.log(firstLogin.data, 'fffffffffffffffffffffuuuuuuuuuuuuuuuuuuuuuuu');

    if (firstLogin?.data === 'need logout') return true;

    const newToken = firstLogin.data?.token;
    if (!newToken) return true;

    const [, payloadBase64] = newToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    return !payload.exp || payload.exp - now <= 300;

  } catch (err) {
    // console.warn('⚠ Ошибка проверки токена:', err);
    return true;
  }
}


async function getSergeiToken(): Promise<string> {
  const cached = readAuth();
  if (cached?.token && !(await isTokenExpiringSoonOrInvalid(cached.token))) {
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

    // ✅ Сохраняем токен + cookie
    saveAuth({ token: currentToken, cookie: cookieValue });

    return currentToken;

  } catch (e) {
    // // console.error('❌ Ошибка в getSergeiToken:', e);
    throw e;
  }
}

let token = '';

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
      "Cookie": cookie,
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

  // console.log(response.status, response.data);


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


export function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '');
}

const upload = multer();
const app = express();

app.use(cors());

// 👇 сначала парсеры
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.set('trust proxy', true);

// 👇 потом роуты
app.use('/previews', express.static(path.join(__dirname, '..', 'public', 'previews')));

// API Routes
app.use('/api', previewRouter); // Для GET /previews/:id.html
app.use('/', htmlRouter);
app.use('/api/subscription', authenticateToken, subscriptionRouter);

// 🔑 Конфигурация VAPID-ключей
const VAPID_KEYS = {
  publicKey: 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE',
  privateKey: 'WM4lBtcHCBrKFaiZiOLF39NbMjML-H3VaDNXkCQBFmg', // 👈 НЕ выкладывай этот ключ на клиент!
};

const TOKEN = 'Bearer 4ae6ed17-6612-4458-a30d-5a245732168c';

// Ограничение: не более 10 запросов с одного IP за 2 минуты
const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  message: {
    error: "Слишком много попыток входа. Попробуйте повторить вход через 10 мин.",
  },
});

// Это "единый логин", который реально используется при обращении к внешнему API
const FIXED_CREDENTIALS = {
  auth_login: "dev_9@lead.aero",
  password: "*cJ85gXS7Sfd",
  remember: false,
};

webpush.setVapidDetails(
  'mailto:test@example.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

const subscriptionsPath = path.join(__dirname, 'data/subscriptions/subscriptions.json');

// Store subscription
app.post('/subscribe', (req, res) => {
  const sub = req.body;
  let subs = [];

  if (fs.existsSync(subscriptionsPath)) {
    // subs = JSON.parse(fs.readFileSync(subscriptionsPath));
  }

  subs.push(sub);
  fs.writeFileSync(subscriptionsPath, JSON.stringify(subs, null, 2));

  res.status(201).json({ message: 'Subscribed' });
});

function sendPushNotifications(subscriptions: any[], title: string, message: string) {
  const payload = JSON.stringify({
    title,
    body: message,
  });

  subscriptions?.forEach(async (subscription: any) => {
    try {
      await webpush.sendNotification(subscription, payload);
    } catch (error: any) {
      const endpoint = subscription.endpoint;

      const errMessage = error?.body || error?.message || '';

      const isGone =
        errMessage.includes('unsubscribed') ||
        errMessage.includes('expired') ||
        error?.statusCode === 410; // 410 = Gone

      if (isGone && endpoint) {
        // console.warn(`⚠ Подписка больше неактивна, удаляем: ${endpoint}`);
        deleteUserSubscriptionByEndpoint(endpoint);
      } else {
        // // console.error('❌ Ошибка отправки уведомления:', error);
      }
    }
  });
}

app.post('/api/logoutAll', async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;

  const firstLogin = await axios.post(loginURL, {
    auth_login: login,
    password: password,
    portal: 'work_orders',
  }, {
    withCredentials: true,
  });

  // console.log(firstLogin.headers);

  const setCookiePrev = firstLogin.headers['set-cookie'];
  if (!setCookiePrev) throw new Error('⛔ Не получены cookie от первого логина');

  // 2️⃣ Logout
  await axios.post(logoutURL, {}, {
    headers: { Cookie: setCookiePrev },
  });
})

app.post('/api/updateChange', authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;
  const email = req.email;
  const {type, id} = req.body;

  const localData = await loadUserData(clientId);

  let currentOrders = localData.orders;
  let currentMessages = localData.messages;


  if (type === 'order') {
    const changeOrder = currentOrders.findIndex((el) => el.__id === id);
    // // console.log(type, changeOrder);
    if (changeOrder !== -1) {
      const newData = { orders: currentOrders, messages: currentMessages };
      console.log('[DEBUG] Order найден:', currentOrders[changeOrder]);
      console.log('[DEBUG] isChanged до:', currentOrders[changeOrder].isChanged);
      currentOrders[changeOrder].isChanged = false;
      console.log('[DEBUG] isChanged после:', currentOrders[changeOrder].isChanged);
      await saveUserData(clientId, newData);
      sendToUser(email, {type: 'orders', orders: currentOrders});
    }
  } else if (type === 'message') {
    const orderNumber = currentOrders.find((el) => el.__id === id)?.nomer_zakaza;
    currentOrders.forEach((el) => {
      console.log(el.nomer_zakaza)
    },);
    console.log(clientId,currentOrders?.length, currentOrders?.filter(el => el.nomer_zakaza).length);
    let found = false;

    if (!orderNumber) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    currentMessages[orderNumber]?.map((el) => {
      if (el.isChanged) {
        found = true;
      }
    })

    if (found) {
      currentMessages[orderNumber] = currentMessages[orderNumber].map((msg) => ({
        ...msg,
        isChanged: false
      }));
    }

    const newData = { orders: currentOrders, messages: currentMessages };
    await saveUserData(clientId, newData);

    sendToUser(email, {type: 'messages', messages: currentMessages});
  } else {
    res.status(501).json({err: 'Не предоставлен тип'});
  }


  res.status(201).json({});
})

app.get("/api/getUserData", authenticateToken, async (req: any, res: any) => {
  const token = req.externalToken;

  const cookie = getCookieByToken(token);

  if (!cookie) {
    return res.status(401).json({ error: "Сессия не найдена для токена" });
  }

  const response = await axios.get("https://portal.dev.lead.aero/api/auth", {

    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json, text/plain, */*",
      "Cookie": cookie,
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
    const data = response.data;

    const userId = data.userId;

    const userResponse = await axios.post(
      'https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list',
      {
        "active": true,
        "fields": {
          "*": true
        },
        "filter": {
          "tf": {
            "__user": `${userId}`
          }
        }
      },
      {
        headers: {
          Authorization: TOKEN
        }
      }
    );

    const userData = userResponse.data?.result?.result[0];

    const fio = {
      firstName: userData?.fullname.firstname,
      lastName: userData?.fullname.lastname,
      middleName: userData?.fullname.middlename,
    };

    res.json({
      ...data,
      fio,
      email: userData.email,
      phone: userData.phone?.tel
    });
  } catch (err) {
    // console.error(err);
    res.status(500).json(err);
  }
});


app.post("/api/:id/finish", async (req: any, res: any) => {
  const {id} = req.params;
  const body = req.body;

  try {
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'ru',
      'Content-Type': 'application/json',
      'Origin': 'https://portal.dev.lead.aero',
      'Priority': 'u=1, i',
      'Referer': `https://portal.dev.lead.aero/_portal/work_orders/_signup?invite=${id}`,
      'Sec-CH-UA': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'X-Language': 'ru-RU',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const response = await axios.put(`https://portal.dev.lead.aero/api/portal/signup/work_orders/${id}/finish`,
      body
      , { headers, withCredentials: true })

    res.status(201).json({});
  } catch (err) {
    // // // // // // console.log(err);
    res.status(500).json({error: err})
  }

})

app.get("/api/getUserEmail/:id", async(req: any, res: any) => {
  const {id} = req.params;
  const response = await axios.get(`https://portal.dev.lead.aero/api/portal/profiles/work_orders/${id}`);

  const data = response.data;

  res.json(data);
})

app.post("/api/:id/checkCode", async (req: any, res: any) => {
  const {id} = req.params;
  const body = req.body;

  try {
    const response = await axios.post(`https://portal.dev.lead.aero/api/portal/signup/work_orders/${id}/check-code`,
      body
    )

    const emailConfirmCode= response.data.emailConfirmCode;

    res.status(201).json({emailConfirmCode });
  } catch (err) {
    res.status(500).json({error: err})
  }
});

app.post("/api/:id/sendCode", async (req: any, res: any) => {
  const {id} = req.params;

  const body = req.body;

  try {
    const response = await axios.post(`https://portal.dev.lead.aero/api/portal/signup/work_orders/${id}/send-code`, body)

    res.status(201).json({status: 'OK'});
  } catch (err) {
    // // // console.error(err);
    // // // // // // console.log(body);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
});

app.post("/api/addComment/:messageId", authenticateToken, async (req: any, res: any) => {
  const token = req.externalToken;
  const clientId = req.clientId;
  const email = req.email;

  const cookie = getCookieByToken(token);

  const { messageId } = req.params;

  const { files = [], ...body } = req.body;

  let uploadedFiles: UploadedFileMetadata[] = [];

  if (files.length > 0) {
    // Преобразуем base64-файлы в формат, понятный uploadFilesAndGetIds
    const fileBuffers = files.map((file: any) => ({
      originalname: file.name,
      mimetype: file.type,
      size: Buffer.from(file.content, "base64").length,
      buffer: Buffer.from(file.content, "base64"),
    }));

    uploadedFiles = await uploadFilesAndGetMetadata(fileBuffers, TOKEN);
  }

  const response = await axios.put(`https://portal.dev.lead.aero/api/feed/messages/${messageId}/comments`, JSON.stringify({...body, files: uploadedFiles}), {
    headers: {
      Authorization: token,
      'Cookie': cookie
    }
  });

  const result = response.data;

  if (result) {
    const userData = await loadUserData(clientId);

    const [orderNumber, messages] = Object.entries(userData?.messages ?? {}).find(
      ([_, msgs]) => msgs.some((msg) => msg.__id === messageId)
    ) ?? [];

    // Если нашли нужные сообщения
    if (orderNumber && Array.isArray(messages)) {
      // Клонируем массив сообщений для иммутабельности
      const updatedMessages = messages.map((msg) => {
        if (msg.__id === messageId) {
          return {
            ...msg,
            comments: [...(msg.comments ?? []), result], // Добавим result в конец comments
          };
        }
        return msg;
      });

      // Обновляем userData
      const updatedUserData = {
        ...userData,
        messages: {
          ...userData.messages,
          [orderNumber]: updatedMessages,
        },
      };

      sendToUser(email, {type: 'message', messages: updatedUserData.messages});

      // // // // console.log('✅ Обновлённый userData:', updatedUserData);
      await saveUserData(clientId, updatedUserData);
    }
  }

  res.status(201);
})

app.post("/api/getManagers", authenticateToken, async (req: any, res: any) => {
  const token = req.externalToken;
  await getSergeiToken()
  const auth = readAuth();
  const SergeiToken = auth?.token;
  const cookie = auth?.cookie;

  const { users } = req.body;

  const fetchedUsers = [];

  try {
    for (let userId of users) {
      const response = await axios.post(`https://portal.dev.lead.aero/api/auth/users`, {
          asc: true,
          orderBy: "__name",
          limit: 1000,
          offset: 0,
          filter: JSON.stringify({
            and: [
              {
                in: [
                  { field: "__status" },
                  { list: [2, 0, 1, 3, 4] }
                ]
              },
              {
                and: [
                  {
                    and: [
                      {
                        tf: {
                          "__status": [2, 0]
                        }
                      }
                    ]
                  },
                  {
                    eq: [
                      { field: "__deletedAt" },
                      { null: "" }
                    ]
                  }
                ]
              }
            ]
          })
        }
        ,{
          headers: {
            'Authorization': SergeiToken,
            'Cookie': cookie
          },
        });

      const data = response.data;

      // // // // // // console.log(data);

      const foundUser = data.result.find((u: any) => u.__id === userId);

      if (foundUser) {
        fetchedUsers.push(foundUser.__name);
      } else {
        fetchedUsers.push('Система');
      }
    }

    res.json(fetchedUsers);
  } catch (err: any) {
    console.error(err.response);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
})

app.get("/api/getContragent", authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;
  const token = req.externalToken;

  try {
    const response = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list`, {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          "__user": `${clientId}`
        }
      }
    }, {
      headers: {
        'Authorization': TOKEN,
      },
    });

    const data = response.data;

    const companyId = data?.result?.result?.[0].company[0];

    const responseCompany = await axios.get(`https://portal.dev.lead.aero/pub/v1/app/_clients/_companies/${companyId}/get`, {
      headers: {
        'Authorization': TOKEN,
      },
    });

    const dataCompany = responseCompany.data;

    const contragent = dataCompany?.item.__name;
    const contragentId = dataCompany?.item._contacts[0];

    // // // // // console.log(dataCompany);

    res.json({contragent, contragentId});
  } catch (err) {
    // // // // // console.log(err);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
})

app.get("/api/user", authenticateToken, async (req: any, res: any) => {
  try {
    // Доступ к данным пользователя через req.user (они были получены из токена)
    const user = req.user; // Это будет объект, который мы передаем в payload токена

    // Здесь можно найти пользователя в базе данных, если нужно
    // const userData = await getUserData(user.id);

    res.json({ message: "Успешный доступ к данным пользователя", user });
  } catch (err) {
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
});

app.post("/api/refresh-token", authenticateToken, (req: any, res: any) => {
  try {
    const { user } = req;

    // Создаем новый токен с теми же данными, что и старый
    const newToken = token;

    res.json({ token: newToken });
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления токена" });
  }
});

app.post("/api/registration", loginLimiter, async (req: any, res: any) => {
  // https://portal.dev.lead.aero/api/portal/profiles/work_orders/${user} GET
  // Этого user нужно записать так как он и есть тот самый юзер


  // Завершение создания
  // https://portal.dev.lead.aero/api/portal/signup/work_orders/c0d2b789-a4c4-4a13-81b9-7f9790d2ccc8/finish PUT
  // {
  //   "emailConfirmCode": "",
  //   "fullname": {
  //     "firstname": "Сергей",
  //     "lastname": "Тест",
  //     "middlename": ""
  //   },
  //   "inviteSign": "4b7cf307-a647-4445-baf2-72e83e508a21",
  //   "needToken": true,
  //   "password": "test1234",
  //   "phoneConfirmCode": ""
  // }

  // Получение токена
  // https://portal.dev.lead.aero/guard/login POST
  // {
  //   "auth_login": "serepetr90@mail.ru",
  //   "password": "test1234",
  //   "portal": "work_orders"
  // }
})




app.post("/api/login", async (req, res) => {
  try {
    const { login: auth_login, password } = req.body;

    const firstLogin = await axios.post(
      "https://portal.dev.lead.aero/guard/login",
      {
        auth_login,
        password,
        portal: "work_orders"
      },
      { withCredentials: true }
    );

    const setCookiePrev = firstLogin.headers["set-cookie"];

    await axios.post(
      "https://portal.dev.lead.aero/guard/logout",
      {},
      {
        headers: { Cookie: setCookiePrev }
      }
    );

    const mainResponse = await axios.post(
      "https://portal.dev.lead.aero/guard/login",
      {
        auth_login,
        password,
        portal: "work_orders"
      },
      { withCredentials: true }
    );

    const rawSetCookie = mainResponse.headers["set-cookie"];
    const cookieValue = rawSetCookie?.[0]?.split(";")[0];

    const auth = await axios.get(
      "https://portal.dev.lead.aero/api/auth",
      {
        headers: { Cookie: cookieValue }
      }
    );

    const currentToken = auth.headers["token"];

    const fileName = saveCookieAndToken(currentToken, cookieValue || "");

    res.json({
      token: currentToken,
      clientName: "",
    });
  } catch (err) {
    // console.error(err);
    res.status(500).json({ error: "Неправильный логин или пароль" });
  }
});

const CHUNK_SIZE = 5242880;


const uploadFilesAndGetMetadata = async (
  files: Express.Multer.File[],
  token: string
): Promise<UploadedFileMetadata[]> => {
  if (!files || files.length === 0) return [];

  // Получаем список директорий
  const { data: listData } = await axios.get(
    'https://portal.dev.lead.aero/pub/v1/disk/directory/list',
    {
      params: { query: JSON.stringify({}) },
      headers: { Authorization: token },
    }
  );

  const targetDir = listData?.result?.result?.[0];
  if (!targetDir) throw new Error('Нет доступных директорий для загрузки');

  const directoryId = targetDir.__id;

  const uploadedFileMetadata = await Promise.all(
    files.map(async (file, idx) => {
      console.log(`\n🆔 [#${idx + 1}] Файл: ${file.originalname}, размер: ${file.buffer.length} байт`);
      if (file.buffer.length !== file.size) {
        console.error(`❌ Неверный размер: buffer.length=${file.buffer.length}, size=${file.size}`);
        throw new Error(`Неверный размер файла ${file.originalname}`);
      }

      const hash = uuidv4();
      let offset = 0;
      let lastRes: any = null;

      if (file.buffer.length > CHUNK_SIZE) {
        console.log(`🚧 Chunked upload: total=${file.buffer.length}`);
        while (offset < file.buffer.length) {
          const total = file.buffer.length;
          const start = offset;
          const endExclusive = Math.min(offset + CHUNK_SIZE, total);
          const chunk = file.buffer.slice(start, endExclusive);
          const endInclusive = endExclusive;

          console.log(`🔹 Чанк: bytes ${start}-${endInclusive} (payload=${chunk.length})`);

          const form = new FormData();
          form.append('file', chunk, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: chunk.length,
          });

          const formLength = await new Promise<number>((res, rej) =>
            form.getLength((e, l) => (e ? rej(e) : res(l)))
          );

          const headers = {
            ...form.getHeaders(),
            Authorization: token,
            'Content-Length': formLength,
            'Content-Range': `bytes ${start}-${endInclusive}/${total}`,
          };

          try {
            lastRes = await axios.post(
              `https://portal.dev.lead.aero/pub/v1/disk/directory/${directoryId}/upload`,
              form,
              {
                params: { hash },
                headers,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
              }
            );
            console.log(`    ✅ chunk status=${lastRes.status}`);
          } catch (err: any) {
            console.error(`    ❌ chunk error: status=${err.response?.status}`);
            console.error(`       data=`, err.response?.data);
            throw err;
          }

          offset = endExclusive;
        }

        const uploaded = lastRes.data.file;
        return {
          hash,
          size: file.buffer.length,
          __id: uploaded.__id,
          __name: uploaded.name || uploaded.__name || file.originalname,
        };
      }

      // Маленький файл — обычная загрузка
      console.log('✔️ Маленький файл, обычная загрузка одним запросом');
      const form = new FormData();
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.buffer.length,
      });

      const contentLength = await new Promise<number>((resolve, reject) => {
        form.getLength((err, length) => {
          if (err) reject(err);
          else resolve(length);
        });
      });

      const headers = {
        ...form.getHeaders(),
        Authorization: token,
        'Content-Length': contentLength,
      };

      try {
        const uploadRes = await axios.post(
          `https://portal.dev.lead.aero/pub/v1/disk/directory/${directoryId}/upload`,
          form,
          {
            params: { hash },
            headers,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }
        );

        const uploaded = uploadRes.data.file;
        return {
          hash,
          size: file.buffer.length,
          __id: uploaded.__id,
          __name: uploaded.name || uploaded.__name || file.originalname,
        };
      } catch (err: any) {
        console.error('    ❌ Ошибка при обычной загрузке:', err?.response?.data || err.message);
        throw err;
      }
    })
  );

  console.log('\n🎉 Все файлы обработаны');
  return uploadedFileMetadata;
};

const uploadFilesAndGetIds = async (
  files: Express.Multer.File[],
  token: string
): Promise<string[]> => {
  if (!files || files.length === 0) return [];

  console.log(`📁 Начинаем загрузку ${files.length} файлов`);

  // Получаем список директорий
  console.log('🔍 Запрашиваем список директорий...');
  const { data: listData } = await axios.get(
    'https://portal.dev.lead.aero/pub/v1/disk/directory/list',
    {
      params: { query: JSON.stringify({}) },
      headers: { Authorization: token },
    }
  );
  console.log('📂 Список директорий получен');

  const targetDir = listData?.result?.result?.[0];
  if (!targetDir) {
    console.error('❌ Нет доступных директорий');
    throw new Error('Нет доступных директорий для загрузки');
  }

  const directoryId = targetDir.__id;
  console.log(`🎯 Загружаем в директорию: ${directoryId}`);

  const uploadedFileIds = await Promise.all(
    files.map(async (file, idx) => {
      console.log(`\n🆔 [#${idx + 1}] Файл: ${file.originalname}, размер: ${file.buffer.length} байт`);
      if (file.buffer.length !== file.size) {
        console.error(`❌ Неверный размер: buffer.length=${file.buffer.length}, size=${file.size}`);
        throw new Error(`Неверный размер файла ${file.originalname}`);
      }

      const hash = uuidv4();
      console.log(`🔑 Сгенерировали hash: ${hash}`);

      let offset = 0;
      let lastRes: any = null;

      // БОЛЬШОЙ файл?
      // если файл достаточно большой — по частям
      if (file.buffer.length > CHUNK_SIZE) {
        console.log(`🚧 Chunked upload: total=${file.buffer.length}`);
        while (offset < file.buffer.length) {
          const total = file.buffer.length;
          const start = offset;
          const endExclusive = Math.min(offset + CHUNK_SIZE, total);
          const chunk = file.buffer.slice(start, endExclusive);
          const endInclusive = endExclusive;

          console.log(`🔹 Чанк: bytes ${start}-${endInclusive} (payload=${chunk.length})`);

          const form = new FormData();
          form.append('file', chunk, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: chunk.length,
          });

          const formLength = await new Promise<number>((res, rej) =>
            form.getLength((e, l) => (e ? rej(e) : res(l)))
          );
          console.log(`    formLength=${formLength}`);

          const headers = {
            ...form.getHeaders(),
            Authorization: token,
            'Content-Length': formLength,
            'Content-Range': `bytes ${start}-${endInclusive}/${total}`,
          };

          try {
            lastRes = await axios.post(
              `https://portal.dev.lead.aero/pub/v1/disk/directory/${directoryId}/upload`,
              form,
              { params: { hash }, headers, maxBodyLength: Infinity, maxContentLength: Infinity }
            );
            console.log(`    ✅ chunk status=${lastRes.status}`);
            console.log(`    response.data=`, lastRes.data);
          } catch (err: any) {
            console.error(`    ❌ chunk error: status=${err.response?.status}`);
            console.error(`       data=`, err.response?.data);
            console.error(`       headers=`, err.response?.headers);
            throw err;
          }

          offset = endExclusive;
        }

        // результат последнего чанка возвращает data.file
        return lastRes.data.file.__id;
      }

      // Мелкий файл — обычная загрузка
      console.log('✔️ Маленький файл, обычная загрузка одним запросом');
      const form = new FormData();
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.buffer.length,
      });

      const contentLength = await new Promise<number>((resolve, reject) => {
        form.getLength((err, length) => {
          if (err) reject(err);
          else resolve(length);
        });
      });

      const headers = {
        ...form.getHeaders(),
        Authorization: token,
        'Content-Length': contentLength,
      };

      console.log(`  🚀 Отправляем: Content-Length=${contentLength}`);
      try {
        const uploadRes = await axios.post(
          `https://portal.dev.lead.aero/pub/v1/disk/directory/${directoryId}/upload`,
          form,
          {
            params: { hash },
            headers,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }
        );
        console.log(`    ✅ Загружен маленький файл, статус ${uploadRes.status}`);
        console.log(`    📄 Returned file ID: ${uploadRes.data.file.__id}`);
        return uploadRes.data.file.__id;
      } catch (err: any) {
        console.error('    ❌ Ошибка при обычной загрузке:', err?.response?.data || err.message);
        throw err;
      }
    })
  );

  console.log('\n🎉 Все файлы обработаны');
  return uploadedFileIds;
};




// {
//   "context": {
//     "kontakt": [
//       "0194fa07-f526-7c98-873d-5f0d7547168a"
//     ],
//     "zapros": "example"
//   }
// }

app.post('/api/get-files', authenticateToken, async (req: any, res: any) => {
  const { fileIds } = req.body;

  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'fileIds (массив) обязательны' });
  }

  try {
    const files = await Promise.all(fileIds.map(async (fileId) => {
      const response = await axios.get(`https://portal.dev.lead.aero/pub/v1/disk/file/${fileId}/get-link`, {
        headers: {
          'Authorization': 'Bearer a515732b-4549-4634-b626-ce4362fb10bc',
        },
      });

      const { success, Link } = response.data;
      if (!success || !Link) {
        throw new Error(`Не удалось получить ссылку для файла ${fileId}`);
      }

      // Пытаемся достать имя файла из ссылки
      let filename = fileId;

      try {
        const decodedLink = decodeURIComponent(Link);
        const match = decodedLink.match(/filename\*\=UTF-8''(.+?)\;/);
        filename = match?.[1];
        // // // // // console.log(match?.[1]);

      } catch (e) {
        // console.warn(`Не удалось распарсить имя файла для ${fileId}`);
      }

      return {
        fileId,
        filename,
        url: Link,
      };
    }));

    res.json({ success: true, files });
  } catch (error) {
    // // console.error('❌ Ошибка при получении ссылок на файлы:', error);
    res.status(500).json({ success: false, error: 'Ошибка при получении ссылок на файлы' });
  }
});

function sortByIsChangedAndCreatedAt<T extends { isChanged?: boolean; __createdAt?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    // Сначала isChanged === true
    if (a.isChanged !== b.isChanged) {
      return a.isChanged ? -1 : 1;
    }

    // Потом по дате (по убыванию)
    const dateA = new Date(a.__createdAt || 0).getTime();
    const dateB = new Date(b.__createdAt || 0).getTime();
    return dateB - dateA;
  });
}

// Создание нового заказа
app.post('/api/orders/new', authenticateToken, upload.array('imgs'), async (req: any, res: any) => {
  const user = req.user;
  const token = req.externalToken;
  const clientId = req.clientId;

  const fullnameObject = req.fullnameObject;

  const fullname = req.fullname;
  const email = req.email;
  const company = req.company;

  const cookie = getCookieByToken(token) ?? '';

  // // // // console.log(fullname, email, company);
  try {
    const files = req.files;
    const zapros = req.body.zapros || '';

    const getContact = await axios.post('https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/list', {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          // вернуть после соответствия
          // "fio": `${fullnameObject.}`,
          "_email": `${email}`,
          "_companies": [
            `${company[0]}`
          ]
        }
      }
    }, {
      headers: {
        'Authorization': `${TOKEN}`,
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    })

    const contactData = getContact.data?.result?.result[0];

    const kontakt = contactData.__id;

    // // // // console.log(contactData);

    const uploadedFileIds = await uploadFilesAndGetIds(files, TOKEN);

    const contextPayload: any = {
      kontakt: [`${kontakt}`],
      zapros,
    };

    if (uploadedFileIds.length > 0) {
      contextPayload.prilozhenie_k_zaprosu = uploadedFileIds;
    }

    const elmaResponse = await axios.post(
      'https://portal.dev.lead.aero/api/apps/work_orders/OrdersNew/items',
      JSON.stringify({ payload: contextPayload, tempData: {withEventForceCreate: false, assignExistingIndex: false}}),
      {
        headers: {
          'Authorization': `${token}`,
          'Cookie': cookie,
          'Content-Type': 'application/json'
        }
      }
    );

    // /bpm/template/work_orders.OrdersNew/glavnyi_bp_copy/run

    const elmaInstance = await axios.post(
      'https://portal.dev.lead.aero/pub/v1/bpm/template/work_orders.OrdersNew/glavnyi_bp_copy_copy/run',
      {
        context: {
          OrdersNew: [`${elmaResponse.data.__id}`],
          zapros_klienta: contextPayload.zapros,
          kontakt: contextPayload.kontakt,
          prilozhenie_k_zaprosu: contextPayload.prilozhenie_k_zaprosu,
          __createdBy: clientId
        }
      },
      {
        headers: {
          'Authorization': `${TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Language': 'ru-RU',
          'X-Timezone': 'Europe/Moscow',
          'Sec-CH-UA': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
          'Referer': 'https://portal.dev.lead.aero/admin/process/01957f60-8641-75f6-a8f9-b41a57782729/settings',
          'Origin': 'https://portal.dev.lead.aero'
        },
        withCredentials: true
      }
    );

    //
    // {
    //   "context": {
    //     "OrdersNew": [
    //       "00000000-0000-0000-0000-000000000000"
    //     ]
    // }
    // }

    const orderId = elmaResponse.data?.__id; // замените на нужный ID

    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await axios.post(
      `https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/${orderId}/get`,
      {},
      {
        headers: {
          'Authorization': `${TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Language': 'ru-RU',
          'X-Timezone': 'Europe/Moscow',
          'Sec-CH-UA': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
          'Referer': 'https://portal.dev.lead.aero/admin/process/01957f60-8641-75f6-a8f9-b41a57782729/settings',
          'Origin': 'https://portal.dev.lead.aero'
        },
        withCredentials: true
      }
    );


    const newOrderId = response.data?.__id;

    const latest = await loadUserData(clientId, true);

    const newOrder: any = {
      ...response.data,
      __id: newOrderId,
      isChanged: true,
      zapros,
      kontakt,
    };


    const finalOrders = [...(latest.orders || []), newOrder];
    const finalMessages = {
      ...(latest.messages || {}),
      [newOrder.nomer_zakaza]: [], // если nomer_zakaza ещё не присвоен, подстраховка
    };

    sendToUser(email, {
      type: 'orders',
      orders: sortAllTickets(finalOrders),
    });

    sendToUser(email, {
      type: 'messages',
      messages: finalMessages,
    });

    await saveUserData(clientId, {
      orders: finalOrders,
      messages: finalMessages,
    }, true);

    res.json({
      message: 'Заявка отправлена',
      elmaResponse: response.data,
      fileIds: uploadedFileIds,
    });

  } catch (err: any) {
    // // console.error('❌ Ошибка:', err || err.message);
    res.status(500).json({ error: 'Ошибка при обработке запроса' });
  }
});


// 🎯 Роут для приёма подписки и отправки уведомления
app.post('/api/send-notification', async (req, res) => {
  const { subscription, message, title } = req.body;

  const payload = JSON.stringify({
    title: title || '🚀 Push из backend!',
    body: message || 'Нет текста в сообщении',
  });

  // // // console.log(subscription);

  try {
    // // // // // // // // // console.log(subscription);
    await webpush.sendNotification(subscription, payload);
    // // // // // // // // // console.log('✅ Уведомление отправлено!');
    res.status(201).json({ success: true });
  } catch (error) {
    // // console.error('❌ Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

app.get('/api/proxy/:userId/:id', authenticateToken, async (req: any, res: any) => {
  const user = req.user;
  const clientId = req.clientId;

  const orderId = req.params.id;

  await getSergeiToken()
  const auth = readAuth();
  const token = auth?.token;
  const cookie = auth?.cookie;

  try {
  const responseUnread = await axios.get(
    `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages?offset=0&limit=1000000&condition=unread`,
    {
      headers: {
        'Authorization': `${token}`,
        'Cookie': cookie,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${orderId})`,
      },
      withCredentials: true
    }
  );

    const unreadMessages = responseUnread.data?.result || [];

    // Если есть непрочитанные сообщения, помечаем их прочитанными
    for (const message of unreadMessages) {
      const messageId = message.__id;

      try {
        await axios.put(
          `https://portal.dev.lead.aero/api/feed/messages/${messageId}/markread`,
          JSON.stringify({
            "readCount": 1,
            "count": unreadMessages[0].comments.length + 1
          }),
          {
            headers: {
              'Authorization': `${token}`,
              'Cookie': cookie,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Origin': 'https://portal.dev.lead.aero',
              'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${orderId})`,
            },
            withCredentials: true
          }
        );
      } catch (error: any) {
        // // console.error(`Ошибка при markread для сообщения ${messageId}:`, error?.response?.status);
      }
    }

    const responseAll = await axios.get(
      `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages`,
      {
        params: { limit: 100000, offset: 0 },
        headers: {
          'Authorization': `${token}`,
          'Cookie': cookie,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Origin': 'https://portal.dev.lead.aero',
          'Referer': 'https://portal.dev.lead.aero/',
        },
        withCredentials: true
      }
    );

    const text = await responseAll.data.text();
    let result = null;

    if (text) {
      try {
        result = JSON.parse(text);
      } catch (e) {
        // console.warn('Ответ не JSON, но есть текст:', text);
      }
    }

    if (clientId && orderId && result) {
      const userData = await loadUserData(clientId);
      const orderNumber = userData.orders.find((el) => el.__id === orderId)?.nomer_zakaza;
      if (orderNumber) {
        const updatedUserData = {
          ...userData,
          messages:
            {
              ...userData?.messages,
              [orderNumber]: [...(userData?.messages?.[orderNumber] ?? []), result]
            }
        };

        await saveUserData(clientId, updatedUserData);

        return res.json(updatedUserData.messages);

      }
    }
  } catch (err) {
    const userData = await loadUserData(clientId);
    const savedMessages = userData?.messages || [];

    // console.log(clientId);

    return res.json(savedMessages);
  }
});


// app.get('/api/proxy/:userId/:id', authenticateToken, async (req: any, res: any) => {
//   const user = req.user;
//   const token = req.externalToken;
//   const clientId = req.clientId;
// //   const { id, userId } = req.params;
//
// //   if (!userId || !id || !clientId) {
// //     return res.status(400).json({ error: 'Не указан userId или id заказа' });
// //   }
//
// //   try {
// //     // Получаем непрочитанные сообщения
// //     const responseUnread = await axios.get(
// //       `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${id}/messages?offset=0&limit=1000000&condition=unread`,
// //       {
// //         headers: {
// //           'Authorization': `${token}`,
// //           'Accept': 'application/json',
// //           'Content-Type': 'application/json',
// //           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
// //           'Origin': 'https://portal.dev.lead.aero',
// //           'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${id})`,
// //         },
// //         withCredentials: true
// //       }
// //     );
//
// //     // // // // // // console.log(responseUnread);
//
// //     const unreadMessages = responseUnread.data?.result || [];
//
// //     // Если есть непрочитанные сообщения, помечаем их прочитанными
// //     for (const message of unreadMessages) {
// //       const messageId = message.__id;
//
// //       // // // // // // // console.log(unreadMessages);
//
// //       try {
// //         await axios.put(
// //           `https://portal.dev.lead.aero/api/feed/messages/${messageId}/markread`,
// //           JSON.stringify({
// //             "readCount": 1,
// //             "count": unreadMessages[0].comments.length + 1
// //           }),
// //           {
// //             headers: {
// //               'Authorization': `${token}`,
// //               'Accept': 'application/json',
// //               'Content-Type': 'application/json',
// //               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
// //               'Origin': 'https://portal.dev.lead.aero',
// //               'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${id})`,
// //             },
// //             withCredentials: true
// //           }
// //         );
// //       } catch (error: any) {
// //         // // console.error(`Ошибка при markread для сообщения ${messageId}:`, error?.response?.status);
// //       }
// //     }
//
// //     // После того как все непрочитанные пометили как прочитанные, грузим все сообщения
// //     const responseAll = await axios.get(
// //       `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${id}/messages`,
// //       {
// //         params: {
// //           limit: 100000,
// //           offset: 0,
// //         },
// //         headers: {
// //           'Authorization': `${token}`,
// //           'Accept': 'application/json',
// //           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
// //           'Origin': 'https://portal.dev.lead.aero',
// //           'Referer': 'https://portal.dev.lead.aero/',
// //         },
// //         withCredentials: true
// //       }
// //     );
//
// //     const elmaData = responseAll.data;
// //     const elmaMessages = Array.isArray(elmaData) ? elmaData : elmaData?.result || [];
//
//     const userData = await loadUserData(clientId);
//     const savedMessages = userData?.messages || [];
//
// //     const currentMessageId = savedMessages.findIndex((el: any) => el.id === id);
//
// //     const allElmaMessages: any[] = [];
// //     const prevElmaMessages: any[] = [];
//
// //     elmaMessages?.forEach((el: any) => {
// //       if (el.author !== clientId) {
// //         allElmaMessages.push({...el, comments: [],  __updatedAt: ''})
// //       }
// //       if (el.comments?.length > 0) {
// //         el.comments.forEach((comment: any, index: number) => {
// //           if (comment.author !== clientId) {
// //              if ((index === el.comments.length - 1) && (comment.author !== clientId)) {
// //               allElmaMessages.push(comment);
// //             } else if (index < el.comments.length - 1) {
// //               allElmaMessages.push(comment);
// //             }
// //           }
// //         })
// //       }
// //     })
//
// //     savedMessages?.[currentMessageId]?.messages?.forEach((el: any) => {
// //       if (el.author !== clientId) {
// //         prevElmaMessages.push({...el, comments: [], __updatedAt: ''})
// //       }
// //       if (el.comments?.length > 0) {
// //         el.comments.forEach((comment: any, index: number) => {
// //           if (comment.author !== clientId) {
// //              if ((index === el.comments.length - 1) && (comment.author !== clientId)) {
// //               prevElmaMessages.push(comment);
// //             } else if (index < el.comments.length - 1) {
// //               prevElmaMessages.push(comment);
// //             }
// //           }
// //         })
// //       }
// //     })
//
// //     if (!isEqual(allElmaMessages.sort(), prevElmaMessages.sort())) {
// //       // // // // // console.log(allElmaMessages, prevElmaMessages);
// //     }
//
// //     const isChanged = !isEqual(allElmaMessages.sort(), prevElmaMessages.sort()) || savedMessages?.[currentMessageId]?.isChanged;
//
// //     const allMessages = currentMessageId !== -1 ? [
// //       ...savedMessages[].slice(0, currentMessageId),
// //       {
// //         ...savedMessages[currentMessageId],
// //         messages: elmaMessages,
// //         isChanged
// //       },
// //      ...savedMessages.slice(currentMessageId + 1)] :
// //      [...savedMessages, {id, messages: elmaMessages, isChanged }];
//
// //     if (allMessages.length > 0) {
// //       userData.messages = allMessages;
// //       if (clientId && userData) {
// //         await saveUserData(clientId, userData);
// //       }
// //     }
//
// //     if (elmaMessages.length > 0) {
// //       // // // // // // console.log(allMessages);
// //     }
//
// //     const newMessages: any[] = [];
//
// //
//
// //   } catch (error) {
// //     // // console.error('Ошибка в процессе получения сообщений:', error);
//   if ((savedMessages?.length ?? 0) === 0) {
//     res.status(500).json({ error: 'Ошибка сервера при получении сообщений' });
//   }
//
//   res.json({savedMessages} as any);
// });



app.post('/api/proxy/send/:id', authenticateToken, async (req: any, res: any) => {
  const user = req.user;
  const token = req.externalToken;
  const clientName = req.clientName;
  const clientId = req.clientId
  const email = req.email;

  await getSergeiToken();
  const auth = readAuth();
  const SergeiToken = auth?.token ?? '';
  const cookie = auth?.cookie ?? '';

  const clientCookie = getCookieByToken(token) ?? '';


  // // // // // // // // // console.log(user);
  const { id } = req.params;
  const { userId, orderNumber, files = [], href,  ...messagePayload } = req.body;

  let uploadedFiles: UploadedFileMetadata[] = [];

  if (files.length > 0) {
    // Преобразуем base64-файлы в формат, понятный uploadFilesAndGetIds
    const fileBuffers = files?.map((file: any) => ({
      originalname: file.name,
      mimetype: file.type,
      size: Buffer.from(file.content, "base64").length,
      buffer: Buffer.from(file.content, "base64"),
    }));


    uploadedFiles = await uploadFilesAndGetMetadata(fileBuffers, TOKEN);
  }

  // // // // console.log(messagePayload);

  const { data: result } = await axios.put(
    `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${id}/messages`,
    {
      ...messagePayload,
      files: uploadedFiles
    },
    {
      headers: {
        'Authorization': token,
        'Cookie': clientCookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': 'https://portal.dev.lead.aero/'
      },
      withCredentials: true
    }
  );

  try {
    console.log(result);

    // 💾 Сохраняем сообщение локально
    console.log(clientId, userId, result)

    if (userId && result) {
      const userData = await loadUserData(clientId);
      const updatedUserData = {
        ...userData,
        messages:
          {...userData?.messages,
            [orderNumber]: [...(userData?.messages?.[orderNumber] ?? []), result]
          }
      };

      sendToUser(email, {type: 'messages', messages: updatedUserData.messages});

      await saveUserData(clientId, updatedUserData);
    }

    const responseAllChannels = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
      method: 'GET',
      headers: {
        'Authorization': SergeiToken,
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': 'https://portal.dev.lead.aero/messages/channels',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Timezone': 'Europe/Moscow',
        'X-EQL-Timezone': 'Europe/Moscow',
        'X-Language': 'ru-RU'
      }
    });

    const AllChannels = await responseAllChannels?.json();
    const isInChannels = AllChannels?.find((channel: any) => channel?.name?.split('№')[1]?.trim() === orderNumber);

    let channelId = isInChannels?.__id;

    // Создать новый канал в общей elma
    if (!isInChannels || (isInChannels == null)) {
      const response2 = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
        method: 'PUT',
        headers: {
          'Authorization': SergeiToken,
          'Cookie': cookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://portal.dev.lead.aero',
          'Referer': 'https://portal.dev.lead.aero/messages/channels',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Timezone': 'Europe/Moscow',
          'X-EQL-Timezone': 'Europe/Moscow',
          'X-Language': 'ru-RU'
        },
        body: JSON.stringify({
          "author": clientId,
          name: `Заказ №${orderNumber}`,
          members: ['543e820c-e836-45f0-b177-057a584463b7'],
          accessRights: "author"
        })
      });

      const raw = await response2.text(); // читаем тело один раз

      let request2;
      try {
        request2 = JSON.parse(raw);
      } catch (e) {
        // // console.error("Ошибка при парсинге JSON:", raw);
        throw new Error("Сервер вернул не-JSON");
      }

      channelId = request2.__id;


      // Присвоить автора конкретному каналу
      const response3 = await fetch(`https://portal.dev.lead.aero/api/feed/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': SergeiToken,
          'Cookie': cookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://portal.dev.lead.aero',
          'Referer': 'https://portal.dev.lead.aero/messages/channels',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Timezone': 'Europe/Moscow',
          'X-EQL-Timezone': 'Europe/Moscow',
          'X-Language': 'ru-RU'
        },
        body: JSON.stringify([{
          id: clientId,
          type: "user",
          accessRights: "author"
        }])
      });
    }

    const addMembers = await fetch(`https://portal.dev.lead.aero/api/feed/channels/${channelId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': SergeiToken,
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': `https://portal.dev.lead.aero/channels/${channelId}`
      },
      body: JSON.stringify(
        [{"id":clientId,"type":"user","accessRights":"author"},{id: "1b010ab3-0ee1-567a-8e55-68b1914d4207", type: "group", accessRights: "reader"}])
    });

    // Добавляем сообщение в канал заказа
    const responseChanelMessage = await fetch(`https://portal.dev.lead.aero/api/feed/messages`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Cookie': clientCookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': `https://portal.dev.lead.aero/channels/${channelId}`
      },
      body: JSON.stringify(
        {
          ...messagePayload,
          body: `${href}<br/><br/>${messagePayload.body}`,
          title: "Сообщение из внешнего портала",
          target: {
            id: channelId
          }
        })
    });

    // // // // // console.log(responseChanelMessage);


    // // // // // // // // console.log(await responseChanelMessage.json());
    // https://portal.dev.lead.aero/api/feed/channels/067e0ad3-e929-4f28-9ff7-9d2a89b5203a

    // {id: "1b010ab3-0ee1-567a-8e55-68b1914d4207", type: "group", accessRights: "author"}

    //   body: JSON.stringify({
    //     userId: '543e820c-e836-45f0-b177-057a584463b7',
    //     body: `${text}`,
    //     mentionIds: [],
    //     files: []
    // })


    res.json(result || { status: 'ok' });

  } catch (error) {
    console.error('Ошибка запроса:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка при отправке сообщения' });
    }
  }
});


app.post('/change-subscription', authenticateToken, (req: any, res: any) => {
  const { endpoint, newUserId, newEmail } = req.body;

  if (!endpoint || !newUserId || !newEmail) {
    return res.status(400).json({ error: 'Неверные параметры' });
  }

  const success = changeSubscription(endpoint, newUserId, newEmail);

  if (!success) {
    return res.status(404).json({ error: 'Подписка не найдена' });
  }

  res.json({ success: true });
});


app.post('/api/delete-subscription', authenticateToken, (req: any, res: any) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Не передан endpoint' });
  }

  const success = deleteUserSubscriptionByEndpoint(endpoint);

  if (success) {
    return res.json({ success: true });
  } else {
    return res.status(404).json({ error: 'Подписка не найдена' });
  }
});


app.post('/api/save-subscription/:userId', authenticateToken, (req: any, res: any) => {
  const userId = req.clientId;
  const email = req.email;
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Некорректная подписка' });
  }

  saveUserSubscription(userId, {...subscription, email, userId});
  res.status(201).json({ success: true });
});


app.get('/api/user/orders', authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;
  const email = req.email;
  const company = req.company;

  try {
    // Если уже есть сохранённые заказы — сразу возвращаем
    const localData = await loadUserData(clientId);

    const getContact = await axios.post('https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/list', {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          // вернуть после соответствия
          // "fio": `${fullname}`,
          "_email": `${email}`,
          "_companies": [
            `${company[0]}`
          ]
        }
      }
    }, {
      headers: {
        'Authorization': `${TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    const contactData = getContact.data?.result?.result[0];

    const kontakt = contactData.__id;

    // Иначе идем в ELMA365
    const elmaResponse = await axios.post(
      'https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/list',
      {
        "active": true,
        "fields": {
          "*": true
        },
        "filter": {
          "tf": {
            "kontakt": [
              `${kontakt}`
            ],
          }
        },
        size: 1000
      },
      {
        params: {
          limit: 10000,
          offset: 0,
        },
        headers: {
          'Authorization': 'Bearer a515732b-4549-4634-b626-ce4362fb10bc',
          'Content-Type': 'application/json'
        }
      }
    );

    const mergedOrders = elmaResponse.data?.result?.result || [];



    const AllPassports = new Set<string>();

    mergedOrders?.forEach((order: any) => {
      order.fio2.forEach((fio: string) => AllPassports.add(fio));
      order.dopolnitelnye_fio.forEach((fio: string) => AllPassports.add(fio));
      order.fio_passazhira_ov_bron_3.forEach((fio: string) => AllPassports.add(fio));
      order.fio_passazhira_ov_bron_4.forEach((fio: string) => AllPassports.add(fio));
      order.fio_passazhira_ov_bron_5.forEach((fio: string) => AllPassports.add(fio));
      order.fio_passazhira_ov_bron_6.forEach((fio: string) => AllPassports.add(fio));
    });

    const passports: Record<string, [string | undefined, string | undefined]> = {};

    await Promise.all(
      Array.from(AllPassports).map(async (passport) => {
        try {
          const response = await axios.post(
            `https://portal.dev.lead.aero/pub/v1/app/n3333/pasporta/${passport}/get`,
            {},
            {
              headers: {
                Authorization: TOKEN
              }
            }
          );

          const data = response.data;

          passports[passport] = [
            data.item.familiya_imya_po_pasportu,
            data.item.dannye_pasporta
          ];
        } catch (error) {
          // // console.error(`Ошибка при получении паспорта ${passport}:`, error);
        }
      })
    );

    const allData = {
      success: true,
      error: "",
      result: {
        result: mergedOrders,
        total: mergedOrders.length
      }
    };

    const prevTickets = localData.orders;

    const currentOrders: any[] = allData?.result?.result.map((ticket: ELMATicket, index: number) => {
      if ((prevTickets?.find((el) => el.__id === ticket.__id)?.isChanged)) {
        // // // // // // console.log({...ticket, __updatedAt: '', __updatedBy: ''}, {...prevTickets?.[index], __updatedAt: '', __updatedBy: ''});
        return {...ticket, isChanged: true}
      }
      return ticket;
    })


    const newData = { orders: currentOrders.length > 0 ? currentOrders : allData.result.result, messages: localData.messages };
    // await saveUserData(clientId, newData as UserData);

    if (currentOrders.length > 0) {
      return res.json({fetchedOrders: {result: {result: currentOrders, total: currentOrders.length}, error: '', success: true}, passports});
    }

    const fetchedOrders: any = {result: {result: currentOrders, total: currentOrders.length}, error: '', success: true};

    // Сохраняем новые заказы

    res.json({fetchedOrders, passports});
  } catch (err: any) {
    // // console.error('Ошибка при получении заказов из ELMA365:', err.response?.data || err.message);
    res.status(500).json({ error: 'Не удалось получить заказы из ELMA365' });
  }
});

const AllStatus = {
  NEW: 'Новый заказ',
  PENDING: 'В работе',
  BOOKED: 'Бронь',
  FORMED: 'Оформлено',
  CLOSED: 'Завершено',
}

const getStatus = (ticket: any): string => {
  let status = 'Не определен';
  switch(ticket?.__status?.status) {
    // Новый заказ
    case 1:
      status = AllStatus.NEW;
      break;
    //  В работе
    case 2:
      status = ticket.tip_zakaz ?  AllStatus.PENDING : AllStatus.NEW;
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

function mergeIsChanged<T extends { __id: string; isChanged?: boolean }>(
  oldItems: T[],
  newItems: T[]
): T[] {
  const map = new Map(oldItems.map(item => [item.__id, item]));

  return newItems.map(newItem => {
    const oldItem = map.get(newItem.__id);

    // если isChanged был сброшен вручную — не затираем
    if (oldItem && oldItem.isChanged === false && newItem.isChanged === true) {
      return { ...newItem, isChanged: false };
    }

    return newItem;
  });
}

function mergeMessagesWithIsChanged(
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


async function pollNewMessages() {
  const users = await getAllUsersData();
  await getSergeiToken()
  const auth = readAuth();
  const token = auth?.token;
  const cookie = auth?.cookie;

  try {
    await Promise.all(
      users.map(async ({ userId, data }) => {
        try {
      const subscriptions = getUserSubscriptions(userId);
      const webSubscriptions = subscriptions?.map((el) => ({
        endpoint: el.endpoint,
        expirationTime: el.expirationTime || null,
        keys: {
          p256dh: el.keys?.p256dh,
          auth: el.keys?.auth
        }
      }));

      const email = subscriptions[0]?.email ?? findAuthFileByUserId(userId)?.email;

      // // // console.log(' - Юзер ', email);

      const clientId = userId;

      let currentData = data;
      let messages = data.messages;
      let tickets = data.orders;

      // ----- Получаем контктные данные -----
      try {
        const getContact = await axios.post(
          'https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/list',
          {
            active: true,
            fields: { "*": true },
            filter: {
              tf: {
                _email: `${email}`
              }
            }
          },
          {
            headers: {
              'Authorization': `${TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const contactData = getContact.data?.result?.result[0];
        const kontakt = contactData?.__id;

        if (!kontakt) return;

        // ----- Получаем заказы с ЕЛМЫ -----
        const elmaResponse = await axios.post('https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/list',
          {
            "active": true,
            "fields": {
              "*": true
            },
            "filter": {
              "tf": {
                "kontakt": [
                  `${kontakt}`
                ],
              }
            },
            size: 1000
          },
          {
            params: {
              limit: 10000,
              offset: 0,
            },
            headers: {
              'Authorization': TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        const mergedOrders = await elmaResponse.data?.result?.result || [];

        // // // console.log(' - Получил заказы ');

        const allData = {
          success: true,
          error: "",
          result: {
            result: mergedOrders,
            total: mergedOrders.length
          }
        };

        let ordersFlag = false;
        let messagesFlag = false;

        let currentData = await loadUserData(userId);

        messages = currentData.messages;
        tickets = currentData.orders;


        // ----- Логика заказов ----- //
        function pickFields(obj: any, fields: string[]) {
          return fields.reduce((acc, field) => {
            acc[field] = get(obj, field); // безопасно достаёт вложенные поля
            return acc;
          }, {} as Record<string, any>);
        }

        let allMessagesByOrder: Record<string, any[]> = {};
        let currentOrders: any[] = [];


        const orderPromises = mergedOrders.map(async (ticket: ELMATicket) => {
          try {
            const existingTicket = tickets?.find(
              (el: any) => el && (el?.__id === ticket?.__id || el?.nomer_zakaza === ticket?.nomer_zakaza)
            );

            if (!ticket) return;

            const updateIfChanged = (
              tabName: string,
              fields: string[],
            ): { updatedAtKey: string; changed: boolean } => {
              const prev: any = existingTicket;
              const current: any = ticket;
              const updatedAtKey = `__updatedAt${tabName}`;

              const wasSetBefore = Boolean(prev?.[updatedAtKey]);
              const wasChangedBefore = Boolean(current?.[updatedAtKey]);

              const isSame = isEqual(
                pickFields(current, fields),
                pickFields(prev, fields)
              );

              const changed = (!wasSetBefore && !wasChangedBefore) || !isSame;

              return { updatedAtKey, changed };
            };


            // Booking
            const fieldMap2: Record<
              number,
              {
                fio: string;
                passport: string;
                answer: string;
                timeLimit: string;
              }
            > = {
              1: {
                fio: 'fio2',
                passport: 'nomer_a_pasporta_ov_dlya_proverki',
                answer: 'otvet_klientu',
                timeLimit: 'taim_limit_dlya_klienta',
              },
              2: {
                fio: 'dopolnitelnye_fio',
                passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_2',
                answer: 'otvet_klientu_o_bronirovanii_2',
                timeLimit: 'taim_limit_dlya_klienta_bron_2',
              },
              3: {
                fio: 'fio_passazhira_ov_bron_3',
                passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_3',
                answer: 'otvet_klientu_o_bronirovanii_3',
                timeLimit: 'taim_limit_dlya_klienta_bron_3',
              },
              4: {
                fio: 'fio_passazhira_ov_bron_4',
                passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_4',
                answer: 'otvet_klientu_o_bronirovanii_4',
                timeLimit: 'taim_limit_dlya_klienta_bron_4',
              },
              5: {
                fio: 'fio_passazhira_ov_bron_5',
                passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_5',
                answer: 'otvet_klientu_o_bronirovanii_5',
                timeLimit: 'taim_limit_dlya_klienta_bron_5',
              },
              6: {
                fio: 'fio_passazhira_ov_bron_6',
                passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_6',
                answer: 'otvet_klientu_o_bronirovanii_6',
                timeLimit: 'taim_limit_dlya_klienta_bron_6',
              },
            };

  // Приоритетные поля для ответа до оформления
            const preAnswerMap: Record<number, string> = {
              1: 'otvet_klientu3',
              2: 'otvet_klientu_pered_oformleniem_bron_2',
              3: 'otvet_klientu_pered_oformleniem_bron_3',
              4: 'otvet_klientu_pered_oformleniem_bron_4',
              5: 'otvet_klientu_pered_oformleniem_bron_5',
              6: 'otvet_klientu_pered_oformleniem_bron_6',
            };

            const bookingFields = Object.values(fieldMap2).flatMap(obj => Object.values(obj))
              .concat(Object.values(preAnswerMap))
              .concat('marshrutnaya_kvitanciya');
            updateIfChanged('Booking', bookingFields);

  // Hotels
            const hotelFields = [1, 2, 3].flatMap(index => {
              const suffix = index === 1 ? '' : index;
              return [
                `otel${suffix}?.name`,
                `data_zaezda${suffix}`,
                `data_vyezda${suffix}`,
                `kolichestvo_nochei${suffix}`,
                `tip_nomera${suffix}?.name`,
                `tip_pitaniya${suffix}?.name`,
                `stoimost${suffix}?.cents`,
              ];
            }).concat('vaucher');
            updateIfChanged('Hotels', hotelFields);

  // Map
            updateIfChanged('Map', ['karta_mest_f', 'opisanie_stoimosti_mest']);

  // Transfer
            const transferFields = [
              'transfer_f',
              'prilozhenie_transfer1',
              'vaucher_transfer',
              'opisanie_transfera',
              'otvet_klientu_po_transferu',
              'informaciya_o_passazhire',
              'stoimost_dlya_klienta_za_oformlenie_transfera_1',
            ];
            updateIfChanged('Transfer', transferFields);

  // VIP
            const vipFields = [
              'vaucher_vipservis',
              'nazvanie_uslugi_vipservis',
              'opisanie_uslugi_vipservis',
              'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis',
              'fio_passazhirov_vipservis',
            ];
            updateIfChanged('Vip', vipFields);


            if (ticket?.__updatedAt === existingTicket?.__updatedAt) {
              const updatedFields = Object.fromEntries(
                Object.entries(ticket).filter(([key]) => key.includes('updatedAt'))
              );

              const updatedFieldsChanged = Object.entries(updatedFields).some(
                ([key, value]) => value !== (existingTicket as any)?.[key]
              );

              if (updatedFieldsChanged) {
                ordersFlag = true;
              }

              return {
                ...existingTicket,
                ...updatedFields,
              };
            }



            const isCurrentChanged = existingTicket?.isChanged ?? false;
            const isNew = !existingTicket;
            const status = getStatus(ticket);
            let fieldsToCompare: string[] = [];

            if (isNew) {
              ordersFlag = true;
              messagesFlag = true;
              if (webSubscriptions?.length && ticket?.nomer_zakaza) {
                // sendPushNotifications(webSubscriptions, 'Новый заказ', `Поступил новый заказ №${ticket.nomer_zakaza}`);
              }
              return { ...ticket, isChanged: true };
            }

            if ((getStatus(existingTicket) === AllStatus.NEW) && (status === AllStatus.PENDING)) {
              ordersFlag = true;
              if (webSubscriptions?.length) {
                sendPushNotifications(webSubscriptions, 'Принят в работу', `Заказ №${ticket.nomer_zakaza} принят в работу`);
              }
              return { ...ticket, isChanged: true };
            }

            if (status === AllStatus.PENDING) {
              fieldsToCompare = ['otvet_klientu1'];
              const isEqualStatus = isEqual(
                pickFields(ticket, fieldsToCompare),
                pickFields(existingTicket || {}, fieldsToCompare)
              );

              if (!isEqualStatus) {
                ordersFlag = true;
                if (webSubscriptions?.length) {
                  sendPushNotifications(webSubscriptions, 'Направление предложений', `По заказу №${ticket.nomer_zakaza}`);
                }
                return { ...ticket, isChanged: true };
              }
            }

            if (
              getStatus(existingTicket) === AllStatus.BOOKED &&
              status === AllStatus.FORMED &&
              ticket?.marshrutnaya_kvitanciya
            ) {
              ordersFlag = true;
              if (webSubscriptions?.length) {
                sendPushNotifications(webSubscriptions, 'Подтверждение оформления', `Подтверждение оформления заказа №${ticket.nomer_zakaza}`);
              }
              return { ...ticket, isChanged: true };
            }

            if (status === AllStatus.BOOKED && ticket.otvet_klientu) {
              fieldsToCompare = [
                'fio2', 'dopolnitelnye_fio', 'fio_passazhira_ov_bron_3', 'fio_passazhira_ov_bron_4',
                'fio_passazhira_ov_bron_5', 'fio_passazhira_ov_bron_6',
                'nomer_a_pasporta_ov_dlya_proverki', 'nomer_a_pasporta_ov_dlya_proverki_bron_2',
                'nomer_a_pasporta_ov_dlya_proverki_bron_3', 'nomer_a_pasporta_ov_dlya_proverki_bron_4',
                'nomer_a_pasporta_ov_dlya_proverki_bron_5', 'nomer_a_pasporta_ov_dlya_proverki_bron_6',
                'otvet_klientu', 'otvet_klientu_o_bronirovanii_2', 'otvet_klientu_o_bronirovanii_3',
                'otvet_klientu_o_bronirovanii_4', 'otvet_klientu_o_bronirovanii_5', 'otvet_klientu_o_bronirovanii_6',
                'taim_limit_dlya_klienta', 'taim_limit_dlya_klienta_bron_2', 'taim_limit_dlya_klienta_bron_3',
                'taim_limit_dlya_klienta_bron_4', 'taim_limit_dlya_klienta_bron_5', 'taim_limit_dlya_klienta_bron_6',
                'otvet_klientu3', 'otvet_klientu_pered_oformleniem_bron_2', 'otvet_klientu_pered_oformleniem_3',
                'otvet_klientu_pered_oformleniem_4', 'otvet_klientu_pered_oformleniem_5', 'otvet_klientu_pered_oformleniem_6',
              ];

              const isEqualStatus = isEqual(
                pickFields(ticket, fieldsToCompare),
                pickFields(existingTicket || {}, fieldsToCompare)
              );

              if (!isEqualStatus) {
                ordersFlag = true;
                if (webSubscriptions?.length) {
                  sendPushNotifications(webSubscriptions, 'Бронирование создано', `По заказу №${ticket.nomer_zakaza}`);
                }
                return { ...ticket, isChanged: true };
              }
            }

            if (status === AllStatus.BOOKED && ticket.otvet_klientu) {
              const fieldsToCompareT = [
                'taim_limit_dlya_klienta', 'taim_limit_dlya_klienta_bron_2', 'taim_limit_dlya_klienta_bron_3',
                'taim_limit_dlya_klienta_bron_4', 'taim_limit_dlya_klienta_bron_5', 'taim_limit_dlya_klienta_bron_6',
              ];
              const fieldsToCompareM = ['marshrutnaya_kvitanciya'];

              const isEqualStatus1 = isEqual(
                pickFields(ticket, fieldsToCompareT),
                pickFields(existingTicket || {}, fieldsToCompareT)
              );
              const isEqualStatus2 = isEqual(
                pickFields(ticket, fieldsToCompareM),
                pickFields(existingTicket || {}, fieldsToCompareM)
              );

              if (!(isEqualStatus1 || isEqualStatus2)) {
                ordersFlag = true;
                if (webSubscriptions?.length) {
                  sendPushNotifications(webSubscriptions, 'Актуализация бронирования', `По заказу №${ticket.nomer_zakaza}`);
                }
                return { ...ticket, isChanged: true };
              }
            }

            console.log('✅ Returning ticket', ticket.nomer_zakaza, ticket.__id);
            return ticket; // <-- теперь точно увидите логи
          } catch (err) {
            console.error('❌ Ошибка при обработке заказа:', ticket?.nomer_zakaza, err);
            return null; // или ticket с флагом ошибки
          }
        });

        const messagePromises = mergedOrders.map(async (order: any) => {
          if (!clientId) return;

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
            const elmaMessages = Array.isArray(elmaData) ? elmaData : elmaData?.result || [];

            // 🧠 Работаем с сообщениями
            allMessagesByOrder[order.nomer_zakaza] = elmaMessages.map((message: any) => {
              const previousMessages = messages?.[order.nomer_zakaza] || [];
              const existingMessage = previousMessages.find((el: any) => el.__id === message.__id);

              // Новое сообщение
              if (!existingMessage) {
                messagesFlag = true;
                console.log('ЗАШЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЛ');
                if (
                  message.author !== clientId &&
                  !message.author.includes('00000000-0000-0000-0000-000000000000')
                ) {
                  console.log('Перед отправкой пуша:', message);
                  sendPushNotifications(
                    webSubscriptions,
                    `Новое сообщение по заказу ${order.nomer_zakaza}`,
                    `${stripHtml(message?.body)}`
                  );
                  console.log('После отправки пуша:')
                }

                return { ...message, isChanged: true };
              }

              // Сравнение комментариев
              const newComments = message.comments || [];
              const oldComments = existingMessage.comments || [];

              const strippedNew = newComments.map((c: any) => ({
                body: c.body,
                author: c.author
              }));
              const strippedOld = oldComments.map((c: any) => ({
                body: c.body,
                author: c.author
              }));

              const commentsChanged = !isEqual(strippedNew, strippedOld);

              if (commentsChanged) {
                messagesFlag = true;

                const last = newComments.at(-1);
                if (
                  last?.author !== clientId &&
                  !last?.author.includes('00000000-0000-0000-0000-000000000000')
                ) {
                  sendPushNotifications(
                    webSubscriptions,
                    `Новый комментарий по заказу ${order.nomer_zakaza}`,
                    `${stripHtml(last?.body ?? 'Файл')}`
                  );
                }

                return { ...message, isChanged: true };
              }

              // Сообщение не изменилось
              return existingMessage;
            });

            allMessagesByOrder[order.nomer_zakaza] ??= [{isChanged: true}];

          } catch (error) {
            console.error(`Ошибка при обработке сообщений по заказу ${orderId}:`, error);
          }
        });

        // 1️⃣ Сначала обрабатываем и отдаем заказы
        // 1️⃣ Сначала обрабатываем и отдаем заказы

        const allSetted: Promise<void>[] = [];

        allSetted.push((async () => {
          const ordersResult = await Promise.all(orderPromises);
          currentOrders = sortAllTickets(ordersResult.filter(Boolean));

          const latest = await loadUserData(clientId, true);
          const ordersActuallyChanged = !isEqual(latest.orders || [], currentOrders || []);

          if (ordersFlag || ordersActuallyChanged) {
            const finalOrders = mergeIsChanged(latest.orders, currentOrders);
            const finalMessages = latest.messages;

            sendToUser(email, { type: 'orders', orders: currentOrders });

            await saveUserData(clientId, {
              orders: currentOrders,
              messages: finalMessages,
            }, true);
          }
        })());

        allSetted.push((async () => {
          try {
            await Promise.all(messagePromises);

            const hasNewMessages = Object.keys(allMessagesByOrder).some(key => !(key in messages));
            const hasChangedMessages = messagesFlag;

            if (hasNewMessages || hasChangedMessages) {
              sendToUser(email, { type: 'messages', messages: allMessagesByOrder });

              const latest = await loadUserData(clientId, true);
              const finalOrders = latest.orders;
              const finalMessages = mergeMessagesWithIsChanged(latest.messages, allMessagesByOrder);

              await saveUserData(clientId, {
                orders: finalOrders,
                messages: finalMessages,
              }, true);
            }
          } catch (err) {
            console.error('Ошибка фоновой обработки сообщений:', err);
          }
        })());

        await Promise.all(allSetted);

// 2️⃣ Параллельно обрабатываем сообщения
      } catch (error) {
        // // console.error("❌ Ошибка при опросе:", error);
      }
        } catch (err) {
          console.error(`Ошибка при обработке пользователя ${userId}`, err);
        }
      })
    );
  } catch (error) {
    // // console.error("❌ Ошибка при опросе:", error);
  } finally {
    setTimeout(pollNewMessages, 3000);
  }
}

// Запуск первого вызова
pollNewMessages();

const server = http.createServer(app); // вместо app.listen

initWebSocket(server); // подключаем WS поверх HTTP-сервера

server.listen(3001, () => {
  // // console.log('🚀 Сервер запущен на http://localhost:3001');
});
