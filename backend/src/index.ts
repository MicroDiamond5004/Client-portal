import express from 'express';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import cors from 'cors';

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

// 🎯 Роут для приёма подписки и отправки уведомления
app.post('/api/send-notification', async (req, res) => {
  const { subscription, message, title } = req.body;

  const payload = JSON.stringify({
    title: title || '🚀 Push из backend!',
    body: message || 'Нет текста в сообщении',
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('✅ Уведомление отправлено!');
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
