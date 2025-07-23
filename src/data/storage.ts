// storage.ts
import fs from 'fs';
import path from 'path';
import { UserData } from './types';

const DATA_DIR = path.resolve(__dirname, 'user');

function getUserFilePath(userId: string) {
  return path.join(DATA_DIR, `${userId}.json`);
}

const authDataDir = path.resolve(__dirname, 'auth');


export function getAllUsersData(): { userId: string; data: UserData }[] {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));

  return files.map(file => {
    const userId = path.basename(file, '.json');
    const filePath = path.join(DATA_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: UserData = JSON.parse(content);
      return { userId, data };
    } catch (e) {
      console.warn(`⚠ Не удалось прочитать или распарсить ${file}:`, e);
      return { userId, data: { orders: [], messages: {} } };
    }
  });
}

export function loadUserData(userId: string): UserData {
  const file = getUserFilePath(userId);
  if (!fs.existsSync(file)) {
    return { orders: [], messages: {} };
  }
  const content = fs.readFileSync(file, 'utf-8');
  return JSON.parse(content);
}

export function saveUserData(userId: string, data: UserData): void {
  const file = getUserFilePath(userId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// SUBSCRIPTIONS
const subscriptionsDir = path.join(__dirname, 'subscriptions');

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

  const isAlreadySaved = subscriptions.some((sub) => sub.endpoint === subscription.endpoint);
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
    const filtered = subscriptions.filter(sub =>
      sub.endpoint !== identifier && sub.email !== identifier
    );

    if (filtered.length < subscriptions.length) {
      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  } catch (e) {
    console.warn('⚠ Ошибка удаления подписки:', e);
  }

  return false;
}

export function findAuthFileByUserId(userId: string): { email: string; data: any } | null {
  const files = fs.readdirSync(authDataDir).filter(file => file.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(authDataDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
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

type PushSubscription = {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  email?: string;
  userId?: string;
  [key: string]: any;
};

export function changeSubscription(
  endpoint: string,
  newUserId: string,
  newEmail: string
): boolean {
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

    // Удалить из текущего файла
    const [matchedSub] = subscriptions.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));

    // Обновить поля
    const updatedSub: PushSubscription = {
      ...matchedSub,
      email: newEmail,
      userId: newUserId,
    };

    // Добавить в новый файл
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
    subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint);

    if (subscriptions.length !== originalLength) {
      if (subscriptions.length === 0) {
        fs.unlinkSync(filePath); // удалить файл, если больше нет подписок
      } else {
        fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));
      }

      return true;
    }
  }

  return false;
}



