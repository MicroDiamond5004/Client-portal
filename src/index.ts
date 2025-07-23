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
import { isEqual, result } from 'lodash';
import previewRouter from './router/routes/previewRoute';
import htmlRouter from './router/routes/htmlRoute';
import { initWebSocket, sendToUser } from './websocket';
import subscriptionRouter from './router/routes/subscriptionRouter';
import http from 'http';

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
    const firstLogin = await axios.post(loginURL, {
      auth_login,
      password,
      portal: 'work_orders',
    }, {
      withCredentials: true,
    });

    if (firstLogin?.data === 'need logout') return true;

    const newToken = firstLogin.data?.token;
    if (!newToken) return true;

    const [, payloadBase64] = newToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    return !payload.exp || payload.exp - now <= 300;

  } catch (err) {
    console.warn('⚠ Ошибка проверки токена:', err);
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
    console.error('❌ Ошибка в getSergeiToken:', e);
    throw e;
  }
}


let token = '';

const authenticateToken = async (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  try {
    const response = await axios.get('https://portal.dev.lead.aero/api/auth', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const savedClientId = response.data.userId ?? '';

    const responseUser = await axios.post('https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list', {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          "__user": `${savedClientId}`
        }
      }
    }, {
      headers: {
        Authorization: `${TOKEN}`
      }
    });

    const data = responseUser.data.result.result[0];

    req.email = data.email;
    req.fullname = data.__name;
    req.company = data.company;

    req.fullnameObject = data.fullname;

    req.clientId = savedClientId;
    req.clientName = response.data.username ?? 'Клиент'; // если нужно имя
    req.externalToken = `Bearer ${token}`;

    next();
  } catch (error) {
    console.error("Ошибка при проверке токена:", error);
    return res.status(403).json({ error: "Ошибка при валидации токена" });
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

const TOKEN = 'Bearer a515732b-4549-4634-b626-ce4362fb10bc';

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
        console.warn(`⚠ Подписка больше неактивна, удаляем: ${endpoint}`);
        deleteUserSubscriptionByEndpoint(endpoint);
      } else {
        console.error('❌ Ошибка отправки уведомления:', error);
      }
    }
  });
}



app.post('/api/updateChange', authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;
  const email = req.email;
  const {type, id} = req.body;

  const localData = loadUserData(clientId);

  let currentOrders = localData.orders;
  let currentMessages = localData.messages;

  if (type === 'order') {
    const changeOrder = currentOrders.findIndex((el) => el.__id === id);
    if (changeOrder !== -1) {
      currentOrders = [...currentOrders.slice(0, changeOrder), {...currentOrders[changeOrder], isChanged: false} ,...currentOrders.slice(changeOrder + 1)]
      sendToUser(email, {type: 'orders', orders: currentOrders});
    }
  } else if (type === 'message') {
    const orderNumber = currentOrders.find((el) => el.__id === id)?.nomer_zakaza;
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
      currentMessages = {
        ...currentMessages,
        [orderNumber]: currentMessages[orderNumber]?.map((e) => ({...e, isChanged: false}))
      };
    }

    sendToUser(email, {type: 'messages', messages: currentMessages});
  } else {
    res.status(501).json({err: 'Не предоставлен тип'});
  }

  const newData = { orders: currentOrders, messages: currentMessages };
  saveUserData(clientId, newData as UserData);

  res.status(201).json({});
})

app.get("/api/getUserData", authenticateToken, async (req: any, res: any) => {

  const token = req.externalToken;

  try {
    const response = await axios.get('https://portal.dev.lead.aero/api/auth', {
      headers: {
        Authorization: token,
      }
    })

    const data = response.data;

    const userId = data.userId;

    const userResponse = await axios.post('https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list', {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          "__user": `${userId}`
        }
      }
    }, {
      headers: {
        Authorization: TOKEN
      }
    })

    const userData = userResponse.data?.result?.result[0];

    const fio = {
      firstName: userData?.fullname.firstname,
      lastName: userData?.fullname.lastname,
      middleName: userData?.fullname.middlename,
    }

    res.json({...data, fio, email: userData.email, phone: userData.phone?.tel})
  } catch (err) {
    // // // console.log(err);
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
    // // // // console.log(err);
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
    // console.error(err);
    // // // // console.log(body);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
});

app.post("/api/addComment/:messageId", authenticateToken, async (req: any, res: any) => {
  const token = req.externalToken;
  const clientId = req.clientId;
  const email = req.email;

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
    }
  });

  const result = response.data;

  if (result) {
    const userData = loadUserData(clientId);

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

      // // console.log('✅ Обновлённый userData:', updatedUserData);
      saveUserData(clientId, updatedUserData);
    }
  }

  res.status(201);
})

app.post("/api/getManagers", authenticateToken, async (req: any, res: any) => {
  const token = req.externalToken;
  const SergeiToken = await getSergeiToken();

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
          },
        });

      const data = response.data;

      // // // // console.log(data);

      const foundUser = data.result.find((u: any) => u.__id === userId);

      if (foundUser) {
        fetchedUsers.push(foundUser.__name);
      } else {
        fetchedUsers.push('Система');
      }
    }

    res.json(fetchedUsers);
  } catch (err) {
    console.error(err);
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

    // // // console.log(dataCompany);

    res.json({contragent, contragentId});
  } catch (err) {
    // // // console.log(err);
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




app.post("/api/login", loginLimiter, async (req: any, res: any) => {

  token = '';

  const { login: auth_login, password } = req.body;

  if (!auth_login || !password) {
    return res.status(400).json({ error: "Логин и пароль обязательны" });
  }

  try {
    const response = await axios.post(`https://portal.dev.lead.aero/guard/login`, {
      auth_login,
      password,
      portal: "work_orders"
    }, {
      withCredentials: true
    })

    const data = response.data;

    const setCookiePrev = response.headers['set-cookie'];

    // Отправляем токен в ответ
    const prevToken = data.token;

    await axios.post("https://portal.dev.lead.aero/guard/logout", {}, {
      headers: {
        Cookie: setCookiePrev, // 👈 кука как строка
      }
    });

    const mainResponse = await axios.post(`https://portal.dev.lead.aero/guard/login`, {
      auth_login,
      password,
      portal: "work_orders"
    }, {
      withCredentials: true
    })

    const rawSetCookie = mainResponse.headers['set-cookie']; // массив строк

    // Получаем первую cookie (vtoken=...) без лишнего
    const cookieValue = rawSetCookie?.[0]?.split(';')[0]; // vtoken=abc123...

    // И потом используем её как заголовок:
    const auth = await axios.get(`https://portal.dev.lead.aero/api/auth`, {
      headers: {
        Cookie: cookieValue,
      }
    });

    // // // // console.log(auth);

    const responseCookie = await axios.get(`https://portal.dev.lead.aero/guard/cookie`, {
      headers: {
        'Cookie': cookieValue,
      }
    })

    const currentToken = auth.headers['token'];

    // console.log(cookieValue, currentToken);

    res.json({token: currentToken, clientName: '' });
  } catch (err) {
    // console.error("Ошибка в /api/login:", err);
    res.status(500).json({ error: "Неправильный логин или пароль" });
  }
});

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
  if (!targetDir) {
    throw new Error('Нет доступных директорий для загрузки');
  }

  const directoryId = targetDir.__id;

  const uploadedFileMetadata = await Promise.all(
    files.map(async (file) => {
      const hash = uuidv4();

      if (file.buffer.length !== file.size) {
        throw new Error(`Неверный размер файла ${file.originalname}`);
      }

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
    })
  );

  return uploadedFileMetadata;
};

const uploadFilesAndGetIds = async (files: Express.Multer.File[], token: string): Promise<string[]> => {
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
  if (!targetDir) {
    throw new Error('Нет доступных директорий для загрузки');
  }

  const directoryId = targetDir.__id;
  // // // // // // console.log('🎯 Загрузка в директорию:', directoryId);

  const uploadedFileIds = await Promise.all(
    files.map(async (file) => {
      const hash = uuidv4();

      if (file.buffer.length !== file.size) {
        throw new Error(`Неверный размер файла ${file.originalname}`);
      }

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

      // // // // // // console.log('⬆️ Загружаем файл:', file.originalname);
      // // // // // // console.log('📦 Content-Length:', contentLength);

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

      // // // // // // console.log('✅ Успешно загружен:', uploadRes.data.file.name);
      return uploadRes.data.file.__id;
    })
  );

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
        // // // console.log(match?.[1]);

      } catch (e) {
        console.warn(`Не удалось распарсить имя файла для ${fileId}`);
      }

      return {
        fileId,
        filename,
        url: Link,
      };
    }));

    res.json({ success: true, files });
  } catch (error) {
    console.error('❌ Ошибка при получении ссылок на файлы:', error);
    res.status(500).json({ success: false, error: 'Ошибка при получении ссылок на файлы' });
  }
});


// Создание нового заказа
app.post('/api/orders/new', authenticateToken, upload.array('imgs'), async (req: any, res: any) => {
  const user = req.user;
  const token = req.externalToken;
  const clientId = req.clientId;

  const fullnameObject = req.fullnameObject;

  const fullname = req.fullname;
  const email = req.email;
  const company = req.company;

  // // console.log(fullname, email, company);
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
        'Content-Type': 'application/json'
      }
    })

    const contactData = getContact.data?.result?.result[0];

    const kontakt = contactData.__id;

    // // console.log(contactData);

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

    // // // // console.log(elmaInstance.data);

    // {
    //   "context": {
    //     "OrdersNew": [
    //       "00000000-0000-0000-0000-000000000000"
    //     ]
    // }
    // }

    res.json({
      message: 'Заявка отправлена',
      elmaResponse: elmaInstance.data,
      fileIds: uploadedFileIds,
    });

  } catch (err: any) {
    console.error('❌ Ошибка:', err || err.message);
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

  // console.log(subscription);

  try {
    // // // // // // // console.log(subscription);
    await webpush.sendNotification(subscription, payload);
    // // // // // // // console.log('✅ Уведомление отправлено!');
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

app.get('/api/proxy/:userId/:id', authenticateToken, async (req: any, res: any) => {
  const user = req.user;
  const token = req.externalToken;
  const clientId = req.clientId;

  const userData = loadUserData(clientId);
  const savedMessages = userData?.messages || [];

  return res.json(savedMessages);
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
// //     // // // // console.log(responseUnread);
//
// //     const unreadMessages = responseUnread.data?.result || [];
//
// //     // Если есть непрочитанные сообщения, помечаем их прочитанными
// //     for (const message of unreadMessages) {
// //       const messageId = message.__id;
//
// //       // // // // // console.log(unreadMessages);
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
// //         console.error(`Ошибка при markread для сообщения ${messageId}:`, error?.response?.status);
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
//     const userData = loadUserData(clientId);
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
// //       // // // console.log(allElmaMessages, prevElmaMessages);
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
// //         saveUserData(clientId, userData);
// //       }
// //     }
//
// //     if (elmaMessages.length > 0) {
// //       // // // // console.log(allMessages);
// //     }
//
// //     const newMessages: any[] = [];
//
// //
//
// //   } catch (error) {
// //     console.error('Ошибка в процессе получения сообщений:', error);
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

  const SergeiToken = await getSergeiToken();


  // // // // // // // console.log(user);
  const { id } = req.params;
  const { userId, orderNumber, files = [], href,  ...messagePayload } = req.body;

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

  // // console.log(messagePayload);

  try {
    const response = await fetch(`https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${id}/messages`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': 'https://portal.dev.lead.aero/'
      },
      body: JSON.stringify({...messagePayload, files: uploadedFiles})
    });

    const text = await response.text();
    let result = null;

    if (text) {
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.warn('Ответ не JSON, но есть текст:', text);
      }
    }

    // 💾 Сохраняем сообщение локально
    if (userId && result) {
      const userData = loadUserData(clientId);
      const updatedUserData = {
        ...userData,
        messages:
          {...userData?.messages,
            [orderNumber]: [...(userData?.messages?.[orderNumber] ?? []), result]
          }
      };

      // console.log(updatedUserData);

      // Предполагаем, что result — это сообщение, иначе можно вынести messagePayload
      // userData.messages.p(result);

      sendToUser(email, {type: 'messages', messages: updatedUserData.messages});


      saveUserData(clientId, updatedUserData);
    }

    const responseAllChannels = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
      method: 'GET',
      headers: {
        'Authorization': SergeiToken,
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
        console.error("Ошибка при парсинге JSON:", raw);
        throw new Error("Сервер вернул не-JSON");
      }

      channelId = request2.__id;


      // Присвоить автора конкретному каналу
      const response3 = await fetch(`https://portal.dev.lead.aero/api/feed/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': SergeiToken,
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

    // // // console.log(responseChanelMessage);


    // // // // // // console.log(await responseChanelMessage.json());
    // https://portal.dev.lead.aero/api/feed/channels/067e0ad3-e929-4f28-9ff7-9d2a89b5203a

    // {id: "1b010ab3-0ee1-567a-8e55-68b1914d4207", type: "group", accessRights: "author"}

    //   body: JSON.stringify({
    //     userId: '543e820c-e836-45f0-b177-057a584463b7',
    //     body: `${text}`,
    //     mentionIds: [],
    //     files: []
    // })


    res.status(response.status).json(result || { status: 'ok' });

  } catch (error) {
    console.error('Ошибка запроса:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка при отправке сообщения' });
    }
  }
});


app.post('/api/change-subscription', authenticateToken, (req: any, res: any) => {
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
    const localData = loadUserData(clientId);

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
          console.error(`Ошибка при получении паспорта ${passport}:`, error);
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
      if (!isEqual({...ticket, __updatedAt: '', __updatedBy: '', isChanged: false, __version: ''}, {...prevTickets?.[index], __updatedAt: '', __updatedBy: '', isChanged: false, __version: ''}) || (prevTickets?.find((el) => el.__id === ticket.__id)?.isChanged)) {
        // // // // console.log({...ticket, __updatedAt: '', __updatedBy: ''}, {...prevTickets?.[index], __updatedAt: '', __updatedBy: ''});
        return {...ticket, isChanged: true}
      }
      return ticket;
    })


    const newData = { orders: currentOrders.length > 0 ? currentOrders : allData.result.result, messages: localData.messages };
    saveUserData(clientId, newData as UserData);

    if (currentOrders.length > 0) {
      return res.json({fetchedOrders: {result: {result: currentOrders, total: currentOrders.length}, error: '', success: true}, passports});
    }

    const fetchedOrders: any = {result: {result: currentOrders, total: currentOrders.length}, error: '', success: true};

    // Сохраняем новые заказы

    res.json({fetchedOrders, passports});
  } catch (err: any) {
    console.error('Ошибка при получении заказов из ELMA365:', err.response?.data || err.message);
    res.status(500).json({ error: 'Не удалось получить заказы из ELMA365' });
  }
});

console.log('ffffffffffffffffggggggggggggggggggggggggggggg');

async function pollNewMessages() {
  const users = getAllUsersData();
  const token = await getSergeiToken();

  try {
    for (const { userId, data } of users) {
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

      // console.log(' - Юзер ', email);

      const clientId = userId;
      const messages = data.messages;
      const tickets = data.orders;

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

        if (!kontakt) continue;

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

        const mergedOrders = elmaResponse.data?.result?.result || [];

        // console.log(' - Получил заказы ');

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


        const currentOrders: any[] = allData.result.result.map((ticket: ELMATicket, index: number) => {
          const existingTicket = tickets.find(
            (el) => el.__id === ticket.__id || el.nomer_zakaza === ticket.nomer_zakaza
          );

          const isCurrentChanged = existingTicket?.isChanged ?? false;


          const fieldsToCompare = [
            'otvet_klientu1', 'fio2', 'dopolnitelnye_fio',
            'fio_passazhira_ov_bron_3', 'fio_passazhira_ov_bron_4', 'fio_passazhira_ov_bron_5',
            'fio_passazhira_ov_bron_6',
            'nomer_a_pasporta_ov_dlya_proverki', 'nomer_a_pasporta_ov_dlya_proverki_bron_2',
            'nomer_a_pasporta_ov_dlya_proverki_bron_3',
            'nomer_a_pasporta_ov_dlya_proverki_bron_4', 'nomer_a_pasporta_ov_dlya_proverki_bron_5',
            'nomer_a_pasporta_ov_dlya_proverki_bron_6',
            'kod_bronirovaniya_v_sisteme', 'dopolnitelnyi_kod_bronirovaniya',
            'kod_bronirovaniya_v_sisteme_bron_3', 'kod_bronirovaniya_v_sisteme_bron_4',
            'kod_bronirovaniya_v_sisteme_bron_5', 'kod_bronirovaniya_v_sisteme_bron_6',
            'otvet_klientu', 'otvet_klientu_o_bronirovanii_2', 'otvet_klientu_o_bronirovanii_3',
            'otvet_klientu_o_bronirovanii_4', 'otvet_klientu_o_bronirovanii_5', 'otvet_klientu_o_bronirovanii_6',
            'taim_limit_dlya_klienta', 'taim_limit_dlya_klienta_bron_2', 'taim_limit_dlya_klienta_bron_3',
            'taim_limit_dlya_klienta_bron_4', 'taim_limit_dlya_klienta_bron_5', 'taim_limit_dlya_klienta_bron_6',
            'otvet_klientu3', 'otvet_klientu_pered_oformleniem_bron_2', 'otvet_klientu_pered_oformleniem_3',
            'otvet_klientu_pered_oformleniem_4', 'otvet_klientu_pered_oformleniem_5', 'otvet_klientu_pered_oformleniem_6',
            'marshrutnaya_kvitanciya', 'otel1', 'otel2', 'otel3',
            'data_zaezda1', 'data_vyezda1', 'data_zaezda2', 'data_vyezda2', 'data_zaezda3', 'data_vyezda3',
            'kolichestvo_nomerov', 'kolichestvo_nochei1', 'kolichestvo_nochei2', 'kolichestvo_nochei_3',
            'tip_nomera1', 'tip_nomera2', 'tip_nomera3',
            'tip_pitaniya1', 'tip_pitani2', 'tip_pitaniya3',
            'stoimost', 'stoimost2', 'stoimost3',
            'kommentarii_k_predlozheniyu',
            'otmena_bez_shtrafa', 'otmena_so_shtrafom', 'nevozvratnyi', 'vaucher',
            'otvet_klientu_po_transferu', 'informaciya_o_passazhire', 'prilozhenie_transfer1',
            'stoimost_dlya_klienta_za_oformlenie_transfera_1', 'vaucher_transfer',
            'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis', 'opisanie_uslugi_vipservis',
            'nazvanie_uslugi_vipservis', 'fio_passazhirov_vipservis', 'vaucher_vipservis',
            'karta_mest_f', 'opisanie_stoimosti_mest',
          ];

          const pickFields = (obj: Record<string, any>, fields: string[]) =>
            fields.reduce((res, key) => {
              res[key] = obj[key];
              return res;
            }, {} as Record<string, any>);

          const isEqualTicket = isEqual(
            pickFields(ticket, fieldsToCompare),
            pickFields(existingTicket || {}, fieldsToCompare)
          );

          const isNew = !existingTicket;
          const isChanged =  isCurrentChanged;

          // console.log('🔎 Проверка заказа:', {
          //   nomer_zakaza: ticket?.nomer_zakaza,
          //   __id: ticket?.__id,
          //   isNew,
          //   isChanged,
          //   isEqualTicket,
          //   isCurrentChanged,
          // });

          if (isNew) {
            ordersFlag = true;
            messagesFlag = true;
            // console.log('📦 Новый заказ! Отправляем PUSH и WS:', ticket?.nomer_zakaza);

            if (webSubscriptions && webSubscriptions.length > 0 && ticket?.nomer_zakaza) {
              sendPushNotifications(
                webSubscriptions,
                'Новый заказ',
                `Поступил новый заказ №${ticket?.nomer_zakaza}`
              );
            } else {
              console.warn('⚠ Нет подписок на PUSH (webSubscriptions пуст)');
            }

            return { ...ticket, isChanged: true };
          }

          if (!isEqualTicket) {
            ordersFlag = true;
            // console.log('✏️ Изменение в заказе! Отправляем PUSH:', ticket?.nomer_zakaza);

            if (webSubscriptions && webSubscriptions.length > 0) {
              sendPushNotifications(
                webSubscriptions,
                'Изменения в заказе',
                `Изменения в заказе №${ticket?.nomer_zakaza}`
              );
            }

            return { ...ticket, isChanged: true };
          }

          if (isChanged) {
            return { ...ticket, isChanged: true };
          }

          return ticket;
        });


        if (!clientId) continue;

        // 👇 Храним все сообщения по заказам в виде: { nomer_zakaza: [messages] }
        const allMessagesByOrder: Record<string, any[]> = {};

        await Promise.all(currentOrders.map(async (order) => {
          const orderId = order.__id;
          // console.log('- Заказ ', order?.nomer_zakaza);

          try {
            // Получаем непрочитанные сообщения
            const responseUnread = await axios.get(
              `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages?offset=0&limit=1000000&condition=unread`,
              {
                headers: {
                  'Authorization': `${token}`,
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
                console.error(`Ошибка при markread для сообщения ${messageId}:`, error?.response?.status);
              }
            }

            const responseAll = await axios.get(
              `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages`,
              {
                params: { limit: 100000, offset: 0 },
                headers: {
                  'Authorization': `${token}`,
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                  'Origin': 'https://portal.dev.lead.aero',
                  'Referer': 'https://portal.dev.lead.aero/',
                },
                withCredentials: true
              }
            );

            // console.log('- Загрузил все сообщения ', userId);

            const elmaData = responseAll.data;
            const elmaMessages = Array.isArray(elmaData) ? elmaData : elmaData?.result || [];

            if (orderId === '804') {
              // console.log(elmaMessages);
            }

            const currentMessages: any[] = elmaMessages.map((message: any) => {
              const existingMessage = messages?.[order.nomer_zakaza]?.find((el: any) => el.__id === message.__id);

              if (!existingMessage) {
                messagesFlag = true;
                // console.log('PUUUUUSH __ Сообщение НОВОЕ (не было)');
                console.log(message, clientId);
                if (message.author !== clientId) {
                  sendPushNotifications(webSubscriptions, `Новое сообщение по заказу ${order.nomer_zakaza}`, `${stripHtml(message?.body)}`)
                }
                return { ...message, isChanged: true };
              }

              const strippedNew = { ...message.comments };
              const strippedOld = { ...existingMessage.comments };



              if (!isEqual(strippedNew, strippedOld)) {
                messagesFlag = true;
                // console.log('PUUUUUSH __ Сообщение НОВОЕ (изменилось)');
                const curMessages: any = messages;
                if (message.comments.sort()?.at(-1)?.author !== clientId) {
                  sendPushNotifications(webSubscriptions, `Новый комментарий по заказу ${order.nomer_zakaza}`, `${stripHtml(message.comments.sort().at(-1)?.body) ?? 'Файл'}`)
                }
                return { ...message, isChanged: true };
              }

              return existingMessage;
            });

            // 👇 Сохраняем по номеру заказа
            allMessagesByOrder[order.nomer_zakaza] = currentMessages;

          } catch (error) {
            console.error('Ошибка в процессе получения сообщений:', error);
          }
        }));

        if (ordersFlag) {
          sendToUser(email, {type: 'orders', orders: currentOrders});
          // console.log('WEB SOCKET ORDERS');
        }

        if (messagesFlag) {
          sendToUser(email, {type: 'messages', messages: allMessagesByOrder});
          // console.log('WEB SOCKET _MESSAGES_');
        }

        if (messagesFlag || ordersFlag) {
          const newData = {
            orders: currentOrders.length > 0 ? currentOrders : allData.result.result,
            messages: allMessagesByOrder
          };

          saveUserData(clientId, newData as UserData);
        }


      } catch (error) {
        console.error("❌ Ошибка при опросе:", error);
      }
    }
  } catch (error) {
    console.error("❌ Ошибка при опросе:", error);
  } finally {
    setTimeout(pollNewMessages, 3000);
  }
}

// Запуск первого вызова
pollNewMessages();

const server = http.createServer(app); // вместо app.listen

initWebSocket(server); // подключаем WS поверх HTTP-сервера

server.listen(3001, () => {
  // console.log('🚀 Сервер запущен на http://localhost:3001');
});
