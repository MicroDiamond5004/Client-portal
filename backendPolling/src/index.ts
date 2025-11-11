import express from 'express';
import cors from 'cors';
import multer from 'multer';

import { initWebSocket } from './websocket';
import http from 'http';
import { connectToDatabase } from './database/connection';
import pollNewMessages from './polling';

let token = '';

const upload = multer();
const app = express();

app.use(cors());

// 👇 сначала парсеры
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.set('trust proxy', true);

// мгновенный старт
pollNewMessages().catch(err => console.error("Ошибка в первом pollNewMessages:", err));

// // затем каждые 3 секунды
// setInterval(() => {
//   console.log("⏱ Периодический запуск pollNewMessages...");
//   pollNewMessages().catch(err => console.error("Ошибка в pollNewMessages:", err));
// }, 5000);

const server = http.createServer(app); // вместо app.listen

initWebSocket(server); // подключаем WS поверх HTTP-сервера

server.listen(3002, async () => {
  console.log('🚀 Сервер запущен на http://localhost:3002');
  await connectToDatabase();
});
