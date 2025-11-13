import express from 'express';
import webpush from 'web-push';
import cors from 'cors';
import { ELMATicket, MessageType, UserData } from './data/types';
import { getAllUsersData, getUserSubscriptions, changeSubscription, deleteUserSubscriptionByEndpoint, loadUserData, saveUserData, saveUserSubscription, findAuthFileByUserId, addUser, getOrdersByUserId, getMessagesByUserId, getPassportsById, getOrdersByUserIdWithLimit, updateIsChangedByType, updateUser, createMessage, getOrderById } from './data/mongodbStorage';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { error } from 'console';
import multer from 'multer';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from "express-rate-limit";
import { get, isEqual, result } from 'lodash';
import previewRouter from './router/routes/previewRoute';
import htmlRouter from './router/routes/htmlRoute';
import { initWebSocket, sendToUser } from './websocket';
import subscriptionRouter from './router/routes/subscriptionRouter';
import http from 'http';
import { getCookieByToken, saveCookieAndToken } from './data/mongodbStorage';
import { connectToDatabase } from './database/connection';
import authenticateToken, { createChatFromMessages, getSergeiToken, getStatus, mergeIsChanged, mergeMessagesWithIsChanged, readAuth, sortAllTickets, stripHtml } from './utils';
import { loginURL, logoutURL, VAPID_KEYS, TOKEN, AllStatus } from './const';
import { UploadedFileMetadata } from './types';
import { sendPushNotifications } from './push';
import pollNewMessages from './polling';
import { getAnotherUsers } from './polling/pollingFunctions';
import { IOrder, IPassport } from './models';

let token = '';

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


// Ограничение: не более 10 запросов с одного IP за 2 минуты
const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  message: {
    error: "Слишком много попыток входа. Попробуйте повторить вход через 10 мин.",
  },
});

// Это "единый логин", который реально используется при обращении к внешнему API

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


app.post('/api/logoutAll', async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;

  try {
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
  } catch (error) {

  }

  res.status(200).json({ message: 'Success' });
})

app.post('/api/updateChange', authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;
  const email = req.email;
  const { type, id } = req.body;

  const localData = await loadUserData(clientId);

  if (type === 'order') {
    const updatedOrder = await updateIsChangedByType(clientId, id, 'order', false);
    // const changeOrder = currentOrders.findIndex((el) => el.__id === id);
    // // console.log(type, changeOrder);

  } else if (type === 'message') {
    const updatedMessages = await updateIsChangedByType(clientId, id, 'message', false);


    // sendToUser(email, { type: 'messages', messages: currentMessages });
  } else {
    res.status(501).json({ err: 'Не предоставлен тип' });
  }


  res.status(201).json({});
})

app.get("/api/getUserData", authenticateToken, async (req: any, res: any) => {
  const startTotal = Date.now();

  const token = req.externalToken;
  const cookie = getCookieByToken(token);

  if (!cookie) {
    return res.status(401).json({ error: "Сессия не найдена для токена" });
  }

  try {
    // 🔹 Measure time for /api/auth
    const startAuth = Date.now();
    const response = await axios.get("https://portal.dev.lead.aero/api/auth", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json, text/plain, */*",
        Cookie: typeof cookie === "string" ? cookie : "",
        "Content-Type": "application/json",
        Referer: "https://portal.dev.lead.aero/_login?returnUrl=%2Fwork_orders%2F__portal",
        "Sec-CH-UA": `"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"`,
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": `"Windows"`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "X-Language": "ru-RU",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    const authTime = Date.now() - startAuth;
    console.log(`⏱️ /api/auth took ${authTime}ms`);

    const data = response.data;
    const userId = data.userId;

    // 🔹 Measure time for /user_profiles/list
    const startUserProfile = Date.now();

    const [userResponse, anotherUsers] = await Promise.all([
      axios.post('https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list', {
        active: true,
        fields: { "*": true },
        filter: { tf: { "__user": `${userId}` } }
      }, { headers: { Authorization: TOKEN } }),
      getAnotherUsers(userId)
    ]);

    const userProfileTime = Date.now() - startUserProfile;
    console.log(`⏱️ /_user_profiles/list took ${userProfileTime}ms`);

    const userData = userResponse.data?.result?.result?.[0];

    // 🔹 Combine all results
    const fio = {
      firstName: userData?.fullname?.firstname,
      lastName: userData?.fullname?.lastname,
      middleName: userData?.fullname?.middlename
    };

    const totalTime = Date.now() - startTotal;
    console.log(`✅ /api/getUserData total time: ${totalTime}ms`);

    res.json({
      ...data,
      isMultiUser: anotherUsers?.length > 1,
      fio,
      email: userData?.email,
      phone: userData?.phone?.tel,
    });

  } catch (err: any) {
    console.error("❌ Error in /api/getUserData:", err.message);
    res.status(500).json({ error: err.message });
  }
});



app.post("/api/:id/finish", async (req: any, res: any) => {
  const { id } = req.params;
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
    res.status(500).json({ error: err })
  }

})

app.get("/api/getUserEmail/:id", async (req: any, res: any) => {
  const { id } = req.params;
  const response = await axios.get(`https://portal.dev.lead.aero/api/portal/profiles/work_orders/${id}`);

  const data = response.data;

  res.json(data);
})

app.post("/api/:id/checkCode", async (req: any, res: any) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const response = await axios.post(`https://portal.dev.lead.aero/api/portal/signup/work_orders/${id}/check-code`,
      body
    )

    const emailConfirmCode = response.data.emailConfirmCode;

    res.status(201).json({ emailConfirmCode });
  } catch (err) {
    res.status(500).json({ error: err })
  }
});

app.post("/api/:id/sendCode", async (req: any, res: any) => {
  const { id } = req.params;

  const body = req.body;

  try {
    const response = await axios.post(`https://portal.dev.lead.aero/api/portal/signup/work_orders/${id}/send-code`, body)

    res.status(201).json({ status: 'OK' });
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

  const response = await axios.put(`https://portal.dev.lead.aero/api/feed/messages/${messageId}/comments`, JSON.stringify({ ...body, files: uploadedFiles }), {
    headers: {
      Authorization: token,
      'Cookie': typeof cookie === "string" ? cookie : "",
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

      // sendToUser(email, { type: 'message', messages: updatedUserData.messages });

      // // // // console.log('✅ Обновлённый userData:', updatedUserData);
      await saveUserData(clientId, updatedUserData);
    }
  }

  res.status(201);
})

app.post("/api/getManagers", authenticateToken, async (req: any, res: any) => {
  const token = req.externalToken;

  const company = req.company;

  await getSergeiToken();
  const auth = await readAuth();
  const SergeiToken = auth?.token;
  const cookie = auth?.cookie;

  const fetchOtherAgents = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_clients/_companies/${company?.[0]}/get`,
    {},
    {
      headers: {
        'Authorization': TOKEN,
      }
    });

  const { users } = req.body;

  const fetchedUsers = [];

  const updatedManagers: Record<string, string> = {};

  const updatedUsers = users.concat(fetchOtherAgents.data.item._contacts);

  try {
    for (let userId of updatedUsers) {

      let contactName: string | null = null;

      try {
        const contactResponse = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list`,
          {
            "active": true,
            "fields": {
              "*": true
            },
            "filter": {
              "tf": {
                "__user": userId
              }
            }
          },
          {
            headers: {
              'Authorization': TOKEN,
            }
          });

        const contactData = contactResponse.data;

        contactName = contactData.result.result?.[0].__name;
      } catch (e) {

      }


      try {
        const contactResponse = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/${userId}/get`,
          {},
          {
            headers: {
              'Authorization': TOKEN,
            }
          });

        const contactData = contactResponse.data;

        contactName = contactData.item.__name;
      } catch (e) {

      }

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
        , {
          headers: {
            'Authorization': SergeiToken,
            'Cookie': typeof cookie === "string" ? cookie : "",
          },
        });

      const data = response.data;

      const foundUser = data.result.find((u: any) => u.__id === userId);

      if (foundUser) {
        fetchedUsers.push(foundUser.__name);
        updatedManagers[userId] = foundUser.__name;
      } else {
        fetchedUsers.push(contactName ?? 'Система');
        updatedManagers[userId] = contactName ?? 'Система';
      }
    }

    res.json(updatedManagers);
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

    res.json({ contragent, contragentId });
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

    const authData = auth.data;
    try {
      await updateUser(authData.userId, { email: auth_login, password, clientName: authData.userId, clientId: authData.userId, token: currentToken, cookie: cookieValue })
      console.log('Update User');
      // await addUser(authData.userId, authData.userId, auth_login, password, company);
    } catch (err) {
      console.error(`Can't save login`, err);
    }

    const responseUser = await axios.post(
      'https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list',
      {
        "active": true,
        "fields": {
          "*": true
        },
        "filter": {
          "tf": {
            "__user": `${authData.userId}`
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

    const company = data.company?.[0];


    const fileName = await saveCookieAndToken(currentToken, cookieValue || "");

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

  await getSergeiToken();
  const auth = await readAuth();
  const SergeiToken = auth?.token;
  const cookie = auth?.cookie;

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
      JSON.stringify({ payload: contextPayload, tempData: { withEventForceCreate: false, assignExistingIndex: false } }),
      {
        headers: {
          'Authorization': `${SergeiToken}`,
          'Cookie': `${cookie}`,
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

    interface ElmaOrderResponse {
      success: boolean;
      error: string;
      item: Record<string, any>;
    }

    async function pollOrder(
      orderId: string,
      {
        interval = 1000,   // как часто опрашивать, в мс
        timeout = 10000,   // общее время ожидания, в мс
      }: { interval?: number; timeout?: number } = {}
    ): Promise<ElmaOrderResponse['item']> {
      const start = Date.now();

      while (true) {
        // Выполняем запрос
        const response = await axios.post<ElmaOrderResponse>(
          `https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/${orderId}/get`,
          {},
          {
            headers: {
              Authorization: `${TOKEN}`,
              'Content-Type': 'application/json',
              Accept: 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Language': 'ru-RU',
              'X-Timezone': 'Europe/Moscow',
              Referer:
                'https://portal.dev.lead.aero/admin/process/01957f60-8641-75f6-a8f9-b41a57782729/settings',
              Origin: 'https://portal.dev.lead.aero',
            },
            withCredentials: true,
          }
        );

        const item = response.data.item;
        const link = item.ssylka_na_kartochku;
        const nomer_zakaza = item.nomer_zakaza;

        // Если поле есть — возвращаем item
        if ((typeof link === 'string') && (link?.trim() !== '') && (nomer_zakaza?.trim() !== '')) {
          return response;
        }

        // Проверяем таймаут
        if (Date.now() - start >= timeout) {
          throw new Error(`Timeout: поле ssylka_na_kartochku не появилось за ${timeout} мс`);
        }

        // Ждём interval перед следующим запросом
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }


    const response = await pollOrder(orderId, { interval: 500, timeout: 10000 });

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

    // sendToUser(email, {
    //   type: 'orders',
    //   orders: sortAllTickets(finalOrders),
    // });

    // sendToUser(email, {
    //   type: 'messages',
    //   messages: finalMessages,
    // });

    // await saveUserData(clientId, {
    //   orders: finalOrders,
    //   messages: finalMessages,
    // }, true);

    res.json({
      message: 'Заявка отправлена',
      elmaResponse: response.data,
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

  // // // console.log(subscription);

  try {
    // // // // // // // // // console.log(subscription);
    await sendPushNotifications(subscription, title, message);
    // // // // // // // // // console.log('✅ Уведомление отправлено!');
    res.status(201).json({ success: true });
  } catch (error) {
    // // console.error('❌ Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

app.get('/api/proxy/:userId/:id', authenticateToken, async (req: any, res: any) => {
  // const user = req.user;
  const clientId = req.clientId;
  // const orderId = req.params.id;

  const { type = 'my' } = req.query;

  try {
    // 👇 загружаем только нужную страницу + общее количество
    const anotherUsers = type === 'all' ? await getAnotherUsers(clientId) : null;

    const { orders, totalCount } = await getOrdersByUserIdWithLimit(anotherUsers ?? clientId, 1, 10000);

    const chats = await Promise.all(
      orders.map(async (order) => await createChatFromMessages(clientId, order.orderData))
    );

    return res.json(chats);
  } catch (err) {
    console.log("err====>", err);
    const userData = await loadUserData(clientId);
    const savedMessages = userData?.messages || [];
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
  const auth = await readAuth();
  const SergeiToken = auth?.token ?? '';
  const cookie = auth?.cookie ?? '';

  const clientCookie = req.clientCookie;

  console.log('=====', clientCookie, token);

  // // // // // // // // // console.log(user);
  const { id } = req.params;
  const { userId, orderNumber, files = [], href, ...messagePayload } = req.body;

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

    await createMessage(userId, { __id: result.__id, targetId: result.target.id, authorId: result.author, body: result.body, files: result.files ?? [] })

    // 💾 Сохраняем сообщение локально
    console.log(clientId, userId, result)

    if (userId && result) {
      const userData = await loadUserData(clientId);
      const updatedUserData = {
        ...userData,
        messages:
        {
          ...userData?.messages,
          [orderNumber]: [...(userData?.messages?.[orderNumber] ?? []), result]
        }
      };

      // sendToUser(email, { type: 'messages', messages: updatedUserData.messages });

      await saveUserData(clientId, updatedUserData);
    }

    const responseAllChannels = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
      method: 'GET',
      headers: {
        'Authorization': SergeiToken,
        'Cookie': typeof cookie === "string" ? cookie : "",
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
    const isInChannels = AllChannels?.find((channel: any) => channel?.name?.split('№')[1]?.split(' ')[0]?.trim() === orderNumber);

    let channelId = isInChannels?.__id;

    // Создать новый канал в общей elma
    if (!isInChannels || (isInChannels == null)) {

      const companyResponse = await fetch(`https://portal.dev.lead.aero/pub/v1/app/_clients/_companies/${req.company}/get`, {
        method: 'POST',
        headers: {
          'Authorization': TOKEN,
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
        })
      });

      const company = await companyResponse.json();

      console.log('---------------');
      console.log(company);

      const response2 = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
        method: 'PUT',
        headers: {
          'Authorization': SergeiToken,
          'Cookie': typeof cookie === "string" ? cookie : "",
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
          name: `Заказ №${orderNumber} - ${company?.item?.__name}`,
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
          'Cookie': typeof cookie === "string" ? cookie : "",
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

      const addMembers = await fetch(`https://portal.dev.lead.aero/api/feed/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': SergeiToken,
          'Cookie': typeof cookie === "string" ? cookie : "",
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://portal.dev.lead.aero',
          'Referer': `https://portal.dev.lead.aero/channels/${channelId}`
        },
        body: JSON.stringify(
          [
            { "id": clientId, "type": "user", "accessRights": "author" },
            { id: "1b010ab3-0ee1-567a-8e55-68b1914d4207", type: "group", accessRights: "reader" }
          ])
      });
    }

    const personId = 'all';

    // Добавляем сообщение в канал заказа
    const responseChanelMessage = await fetch(`https://portal.dev.lead.aero/api/feed/messages`, {
      method: 'PUT',
      headers: {
        'Authorization': SergeiToken,
        'Cookie': typeof cookie === "string" ? cookie : "",
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': `https://portal.dev.lead.aero/channels/${channelId}`
      },
      body: JSON.stringify(
        {
          ...messagePayload,
          body: `<p>${href}<br/><br/>${messagePayload.body}</p>`,
          title: `Сообщение от ${req.fullname}`,
          mentionIds: [personId],
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


app.post('/api/delete-subscription', authenticateToken, async (req: any, res: any) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Не передан endpoint' });
  }

  const success = await deleteUserSubscriptionByEndpoint(endpoint);

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

  saveUserSubscription(userId, { ...subscription, email, userId });
  res.status(201).json({ success: true });
});


app.get('/api/user/order/:id', authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;

  const {id} = req.params;

  const orderRaw = await getOrderById(id);

  res.json(orderRaw?.orderData);
})

// Main function for fetch orders (only initial)
app.get('/api/user/orders', authenticateToken, async (req: any, res: any) => {
  const clientId = req.clientId;
  const { type = 'my' } = req.query;

  try {
    // 👇 загружаем только нужную страницу + общее количество
    console.log('prev orders');

    const anotherUsers = type === 'all' ? await getAnotherUsers(clientId) : null;

    const passportsRaw = await getPassportsById(clientId) ?? [];

    const passports = Object.fromEntries(
      passportsRaw.map(p => [p.passportId, [p.name, p.passportData]])
    );

    const { orders, totalCount } = await getOrdersByUserIdWithLimit(anotherUsers ?? clientId, 1, 10000);

    console.log('-----orders', totalCount);
    // const savedPassports = await getPassportsById(clientId);

    // const passports = Object.fromEntries(
    //   savedPassports.map((p: any) => [p.passportId ?? "", p])
    // );

  
    const fetchedOrders = {
      result: {
        result: orders.map((el) => {

          const {
            nomer_zakaza,
            __id,
            __name,
            __status,
            __createdAt,
            fio2,
            zapros,
            otvet_klientu,
            otvet_klientu1,
            otvet_klientu3,
            otvet_klientu_o_bronirovanii_2,
            otvet_klientu_o_bronirovanii_4,
            otvet_klientu_o_bronirovanii_5,
            otvet_klientu_o_bronirovanii_6,
            otvet_klientu_pered_oformleniem_bron_2,
            otvet_klientu_pered_oformleniem_bron_3,
            otvet_klientu_pered_oformleniem_bron_4,
            otvet_klientu_pered_oformleniem_bron_5,
            otvet_klientu_pered_oformleniem_bron_6,
            data_vyleta,
            taim_limit_dlya_klienta,
            taim_limit_dlya_klienta_bron_2,
            taim_limit_dlya_klienta_bron_3,
            taim_limit_dlya_klienta_bron_4,
            taim_limit_dlya_klienta_bron_5,
            taim_limit_dlya_klienta_bron_6,
            dopolnitelnye_fio,
            fio_passazhira_ov_bron_3,
            fio_passazhira_ov_bron_4,
            fio_passazhira_ov_bron_5,
            fio_passazhira_ov_bron_6,
          } = el.orderData;

          return {
            nomer_zakaza,
            __id,
            __name,
            __status,
            __createdAt,
            fio2,
            zapros,
            otvet_klientu,
            otvet_klientu1,
            otvet_klientu3,
            otvet_klientu_o_bronirovanii_2,
            otvet_klientu_o_bronirovanii_4,
            otvet_klientu_o_bronirovanii_5,
            otvet_klientu_o_bronirovanii_6,
            otvet_klientu_pered_oformleniem_bron_2,
            otvet_klientu_pered_oformleniem_bron_3,
            otvet_klientu_pered_oformleniem_bron_4,
            otvet_klientu_pered_oformleniem_bron_5,
            otvet_klientu_pered_oformleniem_bron_6,
            isChanged: el.isChanged,
            data_vyleta,
            taim_limit_dlya_klienta,
            taim_limit_dlya_klienta_bron_2,
            taim_limit_dlya_klienta_bron_3,
            taim_limit_dlya_klienta_bron_4,
            taim_limit_dlya_klienta_bron_5,
            taim_limit_dlya_klienta_bron_6,
            dopolnitelnye_fio,
            fio_passazhira_ov_bron_3,
            fio_passazhira_ov_bron_4,
            fio_passazhira_ov_bron_5,
            fio_passazhira_ov_bron_6,
          };

        }),
        total: totalCount,
      },
      error: "",
      success: true,
    };

    res.json({ fetchedOrders, passports });
  } catch (err: any) {
    console.error('Ошибка при получении заказов:', err);
    res.status(500).json({ error: 'Не удалось получить заказы' });
  }
});


const server = http.createServer(app); // вместо app.listen

// initWebSocket(server); // подключаем WS поверх HTTP-сервера

server.listen(3001, async () => {
  console.log('🚀 Сервер запущен на http://localhost:3001');
  await connectToDatabase();
});
