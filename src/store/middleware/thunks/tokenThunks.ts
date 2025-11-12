import { createAsyncThunk } from "@reduxjs/toolkit";
import { method } from "lodash";
import { ELMATicket } from "src/mocks/tickets/ticket.type";
import { ELMAChat } from "src/types/apps/chat";
import api from "../../api";

// Сохранение токена и времени истечения
const saveToken = (token: string) => {
  const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // Токен будет действителен 1 день
  localStorage.setItem("auth_token", token);
  localStorage.setItem("token_expiration", expirationTime.toString());
};

// Экшен для получения токена
export const fetchAuthToken = createAsyncThunk<{token: string, clientName: string}, { login: string; password: string }>(
  "auth/fetchAuthToken",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Ошибка авторизации");
      }

      const data = await response.json();
      const token = data.token;
      const clientName = data.clientName;

      saveToken(token); // Сохраняем токен

      return {token, clientName};
    } catch (err) {
      return rejectWithValue("Сетевая ошибка");
    }
  }
);

// Экшен для обновления токена
export const refreshAuthToken = createAsyncThunk<string, void>(
  "auth/refreshAuthToken",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      return rejectWithValue("Токен отсутствует или истек");
    }

    try {
      const response = await fetch("/api/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Ошибка обновления токена");
      }

      const data = await response.json();
      const newToken = data.newToken as string;

      saveToken(newToken); // Сохраняем новый токен

      return newToken;
    } catch (err) {
      return rejectWithValue("Ошибка при обновлении токена");
    }
  }
);

// Экшен для проверки и обновления токена
export const checkAndRefreshToken = createAsyncThunk<string, void>(
  "auth/checkAndRefreshToken",
  async (_, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      try {
        return await dispatch(refreshAuthToken()).unwrap();
      } catch (err) {
        return rejectWithValue("Ошибка обновления токена");
      }
    }

    return token!;
  }
);
