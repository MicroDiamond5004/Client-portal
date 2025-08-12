import { createAsyncThunk } from "@reduxjs/toolkit";
import { method } from "lodash";
import { ELMATicket } from "src/mocks/tickets/ticket.type";
import { ELMAChat } from "src/types/apps/chat";
import api from "../api";
import { disconnectWebSocket } from 'src/websocket.ts';
import { RootState } from 'src/store';

  
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// const VAPID_PUBLIC_KEY = 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE';

// function urlBase64ToUint8Array(base64String: string): Uint8Array {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding)
//     .replace(/-/g, '+')
//     .replace(/_/g, '/');

//   const rawData = window.atob(base64);
//   return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
// }

// export const savePushSubscription = createAsyncThunk(
//   'push/saveSubscription',
//   async ({ email }: { email: string }, thunkAPI) => {
//     try {
//       const registration = await navigator.serviceWorker.register('/sw.js');

//       const subscription = await registration.pushManager.getSubscription()
//         ?? await registration.pushManager.subscribe({
//           userVisibleOnly: true,
//           applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
//         });

//       await fetch('/api/save-subscription', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ subscription, email }),
//       });

//       console.log('✅ Подписка отправлена на сервер');
//     } catch (e) {
//       console.error('❌ Не удалось сохранить подписку', e);
//       return thunkAPI.rejectWithValue(e);
//     }
//   }
// );
  export const logoutAll = createAsyncThunk<string | null, {password: string, login: string}>(
    "auth/logoutAll",
    async (payload, thunkAPI) => {
      const state = thunkAPI.getState() as RootState;
      const email = state.auth.email;
      disconnectWebSocket(email ?? '');
      const { data } = await api.post('/logoutAll', {
        login: payload.login,
        password: payload.password,
      });
      return data;
    }
  );


  // Получение тикетов
  export const fetchTickets = createAsyncThunk<ELMATicket[], string | null>(
    "tickets/fetchTickets",
    async (userId) => {
      const { data } = await api.get<ELMATicket[]>(
        `/user/${userId ?? "543e820c-e836-45f0-b177-057a584463b7"}/orders`
      );
      return data;
    }
  );
  
  // Создание новой заявки
  export const fetchAddNewOrder = createAsyncThunk<
    any,
    { zapros: string | null; imgs: File[], kontakt: string }
  >(
    "tickets/fetchNewOrder",
    async ({ zapros, imgs, kontakt }) => {
      const formData = new FormData();

      formData.append("zapros", zapros || "");
      formData.append("kontakt", kontakt || "");

      console.log(kontakt);
  
      imgs.forEach((file) => {
        formData.append("imgs", file);
      });
  
      const { data } = await api.post("/orders/new", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    }
  );


  // Проверка истечения срока действия токена
const isTokenExpired = (): boolean => {
  const expirationTime = localStorage.getItem("token_expiration");
  return expirationTime ? Date.now() > parseInt(expirationTime) : true;
};

// Сохранение токена и времени истечения
const saveToken = (token: string) => {
  const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // Токен будет действителен 1 день
  localStorage.setItem("auth_token", token);
  localStorage.setItem("token_expiration", expirationTime.toString());
};

interface AuthState {
  token: string | null;
  error: string | null;
}


  