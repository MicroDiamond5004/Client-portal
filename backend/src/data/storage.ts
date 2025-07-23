import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { UserData } from './types';

const DATA_DIR = path.resolve(__dirname, 'user');
const authDataDir = path.resolve(__dirname, 'auth');
const subscriptionsDir = path.join(__dirname, 'subscriptions');

// --- UTILS ---
function getUserFilePath(userId: string): string {
  return path.join(DATA_DIR, `${userId}.json.gz`);
}

function migrateUserJsonToGzip(userId: string): boolean {
  const oldPath = path.join(DATA_DIR, `${userId}.json`);
  const newPath = getUserFilePath(userId);

  if (fs.existsSync(oldPath)) {
    try {
      const json = fs.readFileSync(oldPath, 'utf-8');
      const compressed = zlib.gzipSync(json);
      fs.writeFileSync(newPath, compressed);
      fs.unlinkSync(oldPath);
      console.log(`📦 Мигрирован ${userId}.json → ${userId}.json.gz`);
      return true;
    } catch (e) {
      console.warn(`⚠ Не удалось мигрировать ${userId}.json:`, e);
    }
  }

  return false;
}


function readGzipJson(filePath: string): any {
  const buffer = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(buffer).toString('utf-8');
  return JSON.parse(decompressed);
}

function writeGzipJson(filePath: string, data: any): void {
  const json = JSON.stringify(data, null, 2);
  const compressed = zlib.gzipSync(json);
  fs.writeFileSync(filePath, compressed);
}

// --- USER DATA (gzipped) ---
export function getAllUsersData(): { userId: string; data: UserData }[] {
  if (!fs.existsSync(DATA_DIR)) return [];

  // Собираем список и .json.gz, и .json
  const files = fs.readdirSync(DATA_DIR);
  const userIds = new Set<string>();

  for (const file of files) {
    if (file.endsWith('.json.gz')) {
      userIds.add(path.basename(file, '.json.gz'));
    } else if (file.endsWith('.json')) {
      userIds.add(path.basename(file, '.json'));
    }
  }

  return Array.from(userIds).map(userId => {
    // Миграция при необходимости
    const gzPath = getUserFilePath(userId);
    const jsonPath = path.join(DATA_DIR, `${userId}.json`);

    if (!fs.existsSync(gzPath) && fs.existsSync(jsonPath)) {
      migrateUserJsonToGzip(userId);
    }

    try {
      const data: UserData = readGzipJson(gzPath);
      return { userId, data };
    } catch (e) {
      console.warn(`⚠ Ошибка чтения ${userId}.json.gz:`, e);
      return { userId, data: { orders: [], messages: {} } };
    }
  });
}


export function loadUserData(userId: string): UserData {
  const gzPath = getUserFilePath(userId);
  const jsonPath = path.join(DATA_DIR, `${userId}.json`);

  if (!fs.existsSync(gzPath) && fs.existsSync(jsonPath)) {
    migrateUserJsonToGzip(userId);
  }

  if (!fs.existsSync(gzPath)) return { orders: [], messages: {} };

  try {
    return readGzipJson(gzPath);
  } catch (e) {
    console.warn(`⚠ Не удалось загрузить ${userId}.json.gz:`, e);
    return { orders: [], messages: {} };
  }
}


export function saveUserData(userId: string, data: UserData): void {
  const filePath = getUserFilePath(userId);
  writeGzipJson(filePath, data);
}

// --- SUBSCRIPTIONS ---
if (!fs.existsSync(subscriptionsDir)) {
  fs.mkdirSync(subscriptionsDir, { recursive: true });
}

export function saveUserSubscription(userId: string, subscription: any) {
  const filePath = path.join(subscriptionsDir, `${userId}.json`);
  let subscriptions: any[] = [];

  if (fs.existsSync(filePath)) {
    try {
      subscriptions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn('⚠ Не удалось прочитать subscriptions:', e);
    }
  }

  const isAlreadySaved = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
  if (!isAlreadySaved) {
    subscriptions.push(subscription);
    fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));
  }
}

export function getUserSubscriptions(userId: string): any[] {
  const filePath = path.join(subscriptionsDir, `${userId}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn('⚠ Не удалось прочитать subscriptions:', e);
    return [];
  }
}

export function removeUserSubscription(userId: string, identifier: string): boolean {
  const filePath = path.join(subscriptionsDir, `${userId}.json`);
  if (!fs.existsSync(filePath)) return false;

  try {
    const subscriptions: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const filtered = subscriptions.filter(
      sub => sub.endpoint !== identifier && sub.email !== identifier
    );

    if (filtered.length < subscriptions.length) {
      if (filtered.length === 0) fs.unlinkSync(filePath);
      else fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
      return true;
    }
  } catch (e) {
    console.warn('⚠ Ошибка удаления подписки:', e);
  }

  return false;
}

// --- AUTH DATA (не архивируется) ---
export function findAuthFileByUserId(userId: string): { email: string; data: any } | null {
  const files = fs.readdirSync(authDataDir).filter(file => file.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(authDataDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.userId === userId) {
        const email = path.basename(file, '.json');
        return { email, data };
      }
    } catch (e) {
      console.warn(`⚠ Ошибка чтения/парсинга auth-файла ${file}:`, e);
    }
  }

  return null;
}

// --- SUBSCRIPTION UTILS ---
type PushSubscription = {
  endpoint: string;
  keys?: { p256dh: string; auth: string };
  email?: string;
  userId?: string;
  [key: string]: any;
};

export function changeSubscription(endpoint: string, newUserId: string, newEmail: string): boolean {
  const files = fs.readdirSync(subscriptionsDir);

  for (const file of files) {
    const filePath = path.join(subscriptionsDir, file);
    let subscriptions: PushSubscription[];

    try {
      subscriptions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.warn('⚠ Ошибка чтения файла:', filePath, err);
      continue;
    }

    const index = subscriptions.findIndex(sub => sub.endpoint === endpoint);
    if (index === -1) continue;

    const [matchedSub] = subscriptions.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));

    const updatedSub: PushSubscription = { ...matchedSub, email: newEmail, userId: newUserId };
    const newFilePath = path.join(subscriptionsDir, `${newUserId}.json`);
    let newSubscriptions: PushSubscription[] = [];

    if (fs.existsSync(newFilePath)) {
      try {
        newSubscriptions = JSON.parse(fs.readFileSync(newFilePath, 'utf-8'));
      } catch (err) {
        console.warn('⚠ Ошибка чтения нового файла:', newFilePath, err);
      }
    }

    newSubscriptions.push(updatedSub);
    fs.writeFileSync(newFilePath, JSON.stringify(newSubscriptions, null, 2));
    console.log(`🔄 Подписка перенесена в ${newUserId}.json`);
    return true;
  }

  console.warn('❌ Подписка с таким endpoint не найдена.');
  return false;
}

export function deleteUserSubscriptionByEndpoint(endpoint: string): boolean {
  const files = fs.readdirSync(subscriptionsDir);

  for (const file of files) {
    const filePath = path.join(subscriptionsDir, file);
    let subscriptions: any[];

    try {
      subscriptions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }

    const originalLength = subscriptions.length;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);

    if (subscriptions.length !== originalLength) {
      if (subscriptions.length === 0) fs.unlinkSync(filePath);
      else fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));
      return true;
    }
  }

  return false;
}
