import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const authDataDir = path.resolve(__dirname, 'data/auth');
if (!fs.existsSync(authDataDir)) {
  fs.mkdirSync(authDataDir, { recursive: true });
}

// === ФАЙЛ: Путь к данным пользователя по email ===
function getUserFilePath(email: string) {
  return path.join(authDataDir, `${email}.json`);
}

// === Загрузка данных пользователя ===
function loadUserData(email: string): any | null {
  const file = getUserFilePath(email);
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.warn(`⚠ Ошибка чтения auth-файла ${email}:`, e);
    return null;
  }
}

// === Сохранение данных пользователя ===
function saveUserData(email: string, data: any): void {
  const file = getUserFilePath(email);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// === Удаление файла данных пользователя ===
function deleteUserData(email: string): void {
  const file = getUserFilePath(email);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// === Активные соединения и таймеры удаления ===
const socketConnections = new Map<string, Set<WebSocket>>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();

export function initWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const socketId = uuidv4();
    console.log(`🔌 WebSocket подключился: ${socketId}`);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'register' && msg.userId && msg.email) {
          const { userId, email } = msg;

          // Снимаем таймер удаления, если был
          if (disconnectTimers.has(email)) {
            clearTimeout(disconnectTimers.get(email)!);
            disconnectTimers.delete(email);
          }

          // Сохраняем в файл, если ещё не было
          const currentData = loadUserData(email);
          if (!currentData) {
            saveUserData(email, { userId, email, createdAt: Date.now() });
          }

          // Регистрируем соединение
          if (!socketConnections.has(email)) socketConnections.set(email, new Set());
          socketConnections.get(email)!.add(ws);

          console.log(`✅ Зарегистрирован email: ${email}`);
          ws.send(JSON.stringify({ type: 'registered', email }));
        }
      } catch (e) {
        console.warn('❌ Ошибка разбора сообщения:', e);
      }
    });

    ws.on('close', () => {
      const email = [...socketConnections.entries()]
        .find(([_, set]) => set.has(ws))?.[0];

      if (email) {
        socketConnections.get(email)?.delete(ws);
        if (socketConnections.get(email)?.size === 0) {
          socketConnections.delete(email);

          // Удаление через 5 сек
          const timeout = setTimeout(() => {
            deleteUserData(email);
            disconnectTimers.delete(email);
            console.log(`🗑 Удалены данные email=${email} после 5 сек`);
          }, 5000);

          disconnectTimers.set(email, timeout);
        }

        console.log(`❌ WebSocket отключён: ${socketId}, email=${email}`);
      }
    });
  });

  console.log('✅ WebSocket сервер слушает по /ws');
}

// === Отправка сообщению пользователю по email ===
export function sendToUser(email: string, payload: any) {
  const message = JSON.stringify(payload);
  const sockets = socketConnections.get(email);

  if (!sockets) {
    console.log(`⚠ Нет активных соединений для email=${email}`);
    return;
  }

  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}
