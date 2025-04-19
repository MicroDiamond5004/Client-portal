import express from 'express';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ELMATicket, MessageType, UserData } from './data/types';
import { getUserSubscriptions, loadUserData, saveUserData, saveUserSubscription } from './data/storage';
import path from 'path';
import { readdirSync } from 'fs';
import fs from 'fs';
import axios from 'axios';
import { error } from 'console';

// 🔑 Конфигурация VAPID-ключей
const VAPID_KEYS = {
  publicKey: 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE',
  privateKey: 'WM4lBtcHCBrKFaiZiOLF39NbMjML-H3VaDNXkCQBFmg', // 👈 НЕ выкладывай этот ключ на клиент!
};

webpush.setVapidDetails(
  'mailto:test@example.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const token = 'Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55IjoiaGVhZCIsInVzZXJJZCI6IjU0M2U4MjBjLWU4MzYtNDVmMC1iMTc3LTA1N2E1ODQ0NjNiNyIsIm93bmVyIjpmYWxzZSwiaXNQb3J0YWwiOmZhbHNlLCJzZXNzaW9uSWQiOiIyODY5ZTAyZC1kNDM0LTVlOWQtYWEyOS04MmM3ODBmNGY3YzgiLCJwcml2aWxlZ2VzIjpbInN5c3RlbSIsImFkbWluaXN0cmF0aW9uIl0sIm5lZWRDaGFuZ2VQYXNzd29yZCI6ZmFsc2UsImNyZWF0ZWRBdCI6MTc0NDg0NjY0OSwiaXNzIjoiYXBpIiwiZXhwIjoxNzQ3MjcwMDc0LCJpYXQiOjE3NDQ4NTA3NTR9.GL4lodxftYl0FVabU9SdzwCaciNvc6iMZgkRXSxxdhLPScwa_CwiRknEKYPaNbZeHFUkJ0Kz2TMP8fEBPLxEC-pJ4d0_hK6sINQYQkg_NPp1EamEatu1HQbGXNOm2OAGDy0YAsNZxhYhtnOi6FBq4hPB4pinA8Hr7ML_zXF0A4U';

// 🎯 Роут для приёма подписки и отправки уведомления
app.post('/api/send-notification', async (req, res) => {
  const { subscription, message, title } = req.body;

  const payload = JSON.stringify({
    title: title || '🚀 Push из backend!',
    body: message || 'Нет текста в сообщении',
  });

  try {
    console.log(subscription);
    await webpush.sendNotification(subscription, payload);
    console.log('✅ Уведомление отправлено!');
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

app.get('/api/proxy/:userId/:id', async (req: any, res: any) => {
  const { id, userId } = req.params;

  if (!userId || !id) {
    return res.status(400).json({ error: 'Не указан userId или id заказа' });
  }  

  try {
    // Получаем последние сообщения с ELMA
    const response = await axios.get(`https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${id}/messages`, {
      params: {
        limit: 100000,
        offset: 0,
      },
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': 'https://portal.dev.lead.aero/'
      }
    });

    console.log(response.statusText);

    if (response.statusText !== 'OK') {
      return res.status(500).json({ error: 'Не удалось получить сообщения от ELMA' });
    }

    const elmaData = response.data;
    const elmaMessages = Array.isArray(elmaData) ? elmaData : elmaData?.result || [];

    // console.log(userId);

    // Загружаем локальные данные пользователя
    const userData = loadUserData(userId);
    const savedMessages = userData?.messages || [];

    // Выявляем новые сообщения (сравниваем по ID или тексту)
    const savedIds = new Set(savedMessages.map((msg: any) => msg.__id));
    const newMessages = elmaMessages.filter((msg: any) => !savedIds.has(msg.__id));

    if (newMessages.length > 0) {
      // Добавляем только новые сообщения
      userData.messages.push(...newMessages);
      if (userId && userData) {
        saveUserData(userId, userData);
      }
    }

    res.json({
      messages: elmaMessages,
      newMessages
    });

  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении сообщений' });
  }
});

app.post('/api/proxy/send/:id', async (req, res) => {
  const { id } = req.params;
  const { userId, orderNumber, ...messagePayload } = req.body;

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
      body: JSON.stringify(messagePayload)
    });

    const responseAllChannels = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
      method: 'GET',
      headers: {
        'Authorization': token,
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

    const AllChannels = await responseAllChannels.json()

    const isInChannels = AllChannels.find((channel: any) => channel?.name?.split('№')[1]?.trim() === orderNumber);

    let channelId = isInChannels?.__id ?? '';

    // Создать новый канал в общей elma
    if (!isInChannels) {
      const response2 = await fetch(`https://portal.dev.lead.aero/api/feed/channels/`, {
        method: 'PUT',
        headers: {
          'Authorization': token,
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
            "author": "c566297b-2f3c-40b5-a27e-7d9f30aae080",
            name: `Заказ №${orderNumber}`,
            members: [], // или [userId], если поле поддерживается
            accessRights: "author"
          })
      });
  
      const request2 = await response2?.json();
      channelId = request2.__id;

      // Присвоить автора конкретному каналу
      const response3 = await fetch(`https://portal.dev.lead.aero/api/feed/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': token,
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
          id: "543e820c-e836-45f0-b177-057a584463b7", 
          type: "user", 
          accessRights: "author"
        }])
      });
    }

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
          title: "Сообщение из внешнего портала",
          target: {
            id: channelId
          }
        })
    });


    console.log(await responseChanelMessage.json());
    // https://portal.dev.lead.aero/api/feed/channels/067e0ad3-e929-4f28-9ff7-9d2a89b5203a

    

    // body: JSON.stringify({
      // userId: '543e820c-e836-45f0-b177-057a584463b7',
      // body: `<p>${text}</p>`,
      // mentionIds: [],
      // files: []
  // })

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
      const userData = loadUserData(userId);

      // Предполагаем, что result — это сообщение, иначе можно вынести messagePayload
      userData.messages.push(result);

      saveUserData(userId, userData);
    }

    res.status(response.status).json(result || { status: 'ok' });

  } catch (error) {
    console.error('Ошибка запроса:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка при отправке сообщения' });
    }
  }
});

app.post('/api/save-subscription/:userId', (req: any, res: any) => {
  const { userId } = req.params;
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Некорректная подписка' });
  }

  saveUserSubscription(userId, subscription);
  res.status(201).json({ success: true });
});

app.get('/api/user/:userId/orders', async (req: any, res: any) => {
  const { userId } = req.params;

  try {
    const localData = loadUserData(userId);

    // Если уже есть сохранённые заказы — сразу возвращаем

    // Иначе идем в ELMA365
    const elmaResponse = await axios.post(
      'https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/list',
      {
        active: true,
        fields: {
          "*": true
        },
        from: 394,
        size: 15
      },
      {
        params: {
          limit: 100000000,
          offset: 0,
        },
        headers: {
          'Authorization': 'Bearer a515732b-4549-4634-b626-ce4362fb10bc',
          'Content-Type': 'application/json'
        }
      }
    );
    

    if (localData?.orders?.length === elmaResponse.data?.result?.result?.length) {
      return res.json({result: {result: localData.orders, total: localData.orders.length}, error: '', success: true});
    }

    const fetchedOrders = elmaResponse.data || [];

    // Сохраняем новые заказы
    const newData = { orders: fetchedOrders, messages: localData.messages };
    saveUserData(userId, newData as UserData);

    res.json(fetchedOrders);
  } catch (err: any) {
    console.error('Ошибка при получении заказов из ELMA365:', err.response?.data || err.message);
    res.status(500).json({ error: 'Не удалось получить заказы из ELMA365' });
  }
});


async function pollNewMessages() {
  try {
    const userFiles = readdirSync(path.join(__dirname, 'data', 'user'));

  for (const file of userFiles) {
    const userId = file.replace('.json', '');
    const user = loadUserData(userId);
    if (!user || !user.messages) continue;

    const subscriptions = getUserSubscriptions(userId);

    const orderId = '0';

    for (const currentMessage of user.messages) {
      if (!currentMessage.__id) continue;
      try {
        const response = await axios.get(
          `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${currentMessage.target?.id}/messages`,
          {
            params: {
              limit: 100000,
              offset: 0,
            },
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0',
              'Origin': 'https://portal.dev.lead.aero',
              'Referer': 'https://portal.dev.lead.aero/'
            },
          }
        );
  
        const { result: messages} = response.data;
        if (!Array.isArray(messages) || messages.length === 0) continue;

        const allMessages = user.messages.filter((msg: any) => msg.target?.id === currentMessage.target?.id)

        if (allMessages.length < messages?.length) console.log(true);
        console.log(allMessages.length, messages?.length, currentMessage.target?.id);
  
        while (allMessages.length < messages?.length) {
          const newMessage = messages[allMessages.length]

          // console.log(newMessage);
  
          const payload = JSON.stringify({
            title: `Новое сообщение по заказу ${orderId ?? '0'}`,
            body: newMessage.body || 'Новое сообщение',
          });
  
          allMessages.push(newMessage);
          user.messages.push(newMessage);
  
          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(sub, payload);
            } catch (err: any) {
              console.warn('❌ Ошибка отправки пуша:', err.statusCode, err.body);
          
              if (err.statusCode === 410 || err.statusCode === 404) {
                console.log('🗑 Удаляем просроченную подписку...');
                // Удалим подписку из файла
                const userSubscriptions = getUserSubscriptions(userId);
                const updatedSubs = userSubscriptions.filter(s => s.endpoint !== sub.endpoint);
                saveUserSubscription(userId, updatedSubs);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`⚠ Ошибка при получении сообщений по заказу ${orderId}`, e);
      }
    } 
    

    saveUserData(userId, user);
    }
  } catch (error) {
    console.error("❌ Ошибка при опросе:", error);
  } finally {
    // Ждём 5 секунд после выполнения
    setTimeout(pollNewMessages, 5000);
  }
}

// Запуск первого вызова
// pollNewMessages();

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
