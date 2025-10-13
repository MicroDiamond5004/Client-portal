import dotenv from 'dotenv';
dotenv.config();

export const VAPID_KEYS = {
  publicKey: 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE',
  privateKey: 'WM4lBtcHCBrKFaiZiOLF39NbMjML-H3VaDNXkCQBFmg', // 👈 НЕ выкладывай этот ключ на клиент!
};

export const AllStatus = {
  NEW: 'Новый заказ',
  PENDING: 'В работе',
  BOOKED: 'Бронь',
  FORMED: 'Оформлено',
  CLOSED: 'Завершено',
}

export const AUTH_DATA_PATH = "./src/data/auth/authData.json";
export const auth_login = process.env.API_USER ?? '';
export const password = process.env.API_PASSWORD ?? '';
export const loginURL = 'https://portal.dev.lead.aero/guard/login';
export const authURL = 'https://portal.dev.lead.aero/api/auth';
export const logoutURL = 'https://portal.dev.lead.aero/guard/logout';
export const cookieCheckURL = 'https://portal.dev.lead.aero/guard/cookie'

export const FIXED_CREDENTIALS = {
  auth_login,
  password,
  remember: false,
};

export const TOKEN = process.env.TOKEN ?? '';