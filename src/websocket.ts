import { updateAllTickets } from "./store/slices/ticketsSlice";
import { addNewMessage, updateAllMessages } from "./store/slices/messageSlice";

let socket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let currentUserId = "";
let currentEmail = "";
let currentDispatch: Function | null = null;

const RECONNECT_INTERVAL = 2000;
let manualDisconnect = false;
const websocketUrl = 'localhost:3002';

let currentSocketId: string | null = null;


export const disconnectWebSocket = (email: string) => {
  console.log("🛑 Отключаем WebSocket");
  manualDisconnect = true;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    socket.send(JSON.stringify({ type: "disconnect", email }));
    socket.close();
    socket.onclose = null;
    socket = null;
  }

  currentDispatch = null;
  currentUserId = "";
  currentEmail = "";
};


export const connectWebSocket = (
  email: string,
  userId: string,
  dispatchFn?: Function,
  orderType: "my" | "all" = "my",
  search: string = ""
) => {
  currentUserId = userId;
  currentEmail = email;
  manualDisconnect = false;

  if (dispatchFn) {
    currentDispatch = dispatchFn;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log("⛔️ Сокет уже активен, не пересоздаём");
    return;
  }

  console.log("🔌 Подключаем WebSocket...");
  socket = new WebSocket(`ws://${websocketUrl}/ws`);

  socket.onopen = () => {
    console.log("✅ WebSocket подключён");

    // === 🔥 Immediately notify backend about active session ===
    socket?.send(
      JSON.stringify({
        type: "init",
        email,
        userId,
        orderType,
        search,
        timestamp: Date.now(),
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (!currentDispatch) return;

      console.log(data);

      switch (data.type) {
        case "registered":
          currentSocketId = data.id;
          console.log(`🟢 Зарегистрирован ${data.email} (id=${currentSocketId})`);
          break;

        case "message:add":
          currentDispatch(addNewMessage(data.data));
          break;

        case "messages":
          currentDispatch(updateAllMessages(data.messages));
          break;

        case "orders":
          currentDispatch(updateAllTickets(data.orders));
          break;

        default:
          console.log("⚠ Неизвестный тип сообщения:", data);
      }
    } catch (err) {
      console.error("Ошибка обработки WS-сообщения:", err);
    }
  };

  socket.onclose = () => {
    console.warn("❌ WebSocket отключён.");
    if (!manualDisconnect) {
      console.log(`🔁 Переподключение через ${RECONNECT_INTERVAL / 1000}с...`);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(
        () => connectWebSocket(email, userId, dispatchFn, orderType, search),
        RECONNECT_INTERVAL
      );
    }
  };

  socket.onerror = (err) => {
    console.error("Ошибка WebSocket:", err);
    socket?.close();
  };
};

export const getSocket = () => socket;
export const getCurrentUserId = () => currentUserId;
export const getCurrentEmail = () => currentEmail;

export const sendOrderIdsToWebSocket = async (orderIds: string[]) => {
  if (!socket) {
    console.warn("⚠️ WebSocket is not initialized");
    return;
  }

  // ждём пока сокет не откроется
  if (socket.readyState === WebSocket.CONNECTING) {
    console.log("⏳ Waiting for WebSocket to connect...");
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // ждём пока произойдёт регистрация (currentSocketId заполнится)
  if (!currentSocketId) {
    console.log("⏳ Waiting for WebSocket registration...");
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (currentSocketId) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // дополнительная проверка после ожидания
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("⚠️ WebSocket is not connected after waiting");
    return;
  }

  const message = {
    type: "updateOrders",
    email: currentEmail,
    userId: currentUserId,
    id: currentSocketId, // ✅ теперь точно есть
    orderIds,
    timestamp: Date.now(),
  };

  console.log("📤 Sending orderIds via WebSocket:", message);
  socket.send(JSON.stringify(message));
};

