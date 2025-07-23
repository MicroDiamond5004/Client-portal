import axios from 'axios';

const FIXED_CREDENTIALS = {
  auth_login: "clients@lead.aero",
  password: "EPWgGP%4V7"
};

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
let cookies: string[] = [];

const loginUrl = "https://portal.dev.lead.aero/guard/login";

export async function getExternalToken(): Promise<string | null> {
  const now = Date.now();

  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post(loginUrl, FIXED_CREDENTIALS, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://portal.dev.lead.aero',
        'Referer': 'https://portal.dev.lead.aero/_login?returnUrl=%2F_logi',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Sec-CH-UA': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
      },
      // Axios возвращает заголовки Set-Cookie
      withCredentials: false, // не нужно на Node.js, но пусть будет явно
    });

    const data = response.data;

    // Сохраняем токен и куки
    cachedToken = data.token;
    tokenExpiry = now + 60 * 60 * 1000; // Примерно 1 час
    cookies = response.headers['set-cookie'] || [];

    return cachedToken;
  } catch (err) {
    console.error("Ошибка авторизации:", err);
    return null;
  }
}
