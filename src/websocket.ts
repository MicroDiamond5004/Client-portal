import { updateAllTickets } from "./store/slices/ticketsSlice";
import { updateAllMessages } from "./store/slices/messageSlice";

let socket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let currentUserId: string = '';
let currentDispatch: Function | null = null;

const RECONNECT_INTERVAL = 2000; // ms

// Добавляем функцию отключения
export const disconnectWebSocket = (email: string) => {
  console.log("🛑 Отключаем WebSocket");

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    socket.send(JSON.stringify({ type: 'disconnect', email }));
    socket.close();
    socket.onclose = null; // чтобы не запускать reconnect при закрытии вручную
    socket = null;
  }

  currentDispatch = null;
  currentUserId = '';
};


export const connectWebSocket = (email: string, userId: string, dispatchFn?: Function) => {
  currentUserId = userId;

  if (dispatchFn) {
    currentDispatch = dispatchFn;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log("⛔️ Сокет уже активен, не пересоздаём");
    return;
  }

  socket = new WebSocket("wss://lk.lead.aero/ws");

  socket.onopen = () => {
    console.log("✅ WebSocket подключён");
    socket?.send(JSON.stringify({ type: "register", email, userId }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (!currentDispatch) return;

    if (data.type === 'registered') {
      console.log(data);
    }

    if (data.type === 'messages') {
      console.log(`Новые сообщения по WS:\n${data.messages['967']?.length}`);
      currentDispatch(updateAllMessages(data.messages));
    }

    if (data.type === 'orders') {
      // console.log(`Новые заказы по WS:\n${JSON.stringify(data.orders)}`);
      currentDispatch(updateAllTickets(data.orders));
    }
  };

  socket.onclose = () => {
    console.warn("❌ WebSocket отключён. Переподключение через 2с...");
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => connectWebSocket(email, userId, dispatchFn), RECONNECT_INTERVAL);
  };

  socket.onerror = (err) => {
    console.error("Ошибка WebSocket:", err);
    socket?.close();
  };
};

// ✅ Экспортируем доступ к текущему WebSocket и userId
export const getSocket = () => socket;
export const getCurrentUserId = () => currentUserId;