// storage.ts
import fs from 'fs';
import path from 'path';
import { UserData } from './types';

const DATA_DIR = path.resolve(__dirname, 'user');

function getUserFilePath(userId: string) {
  return path.join(DATA_DIR, `${userId}.json`);
}

export function loadUserData(userId: string): UserData {
  const file = getUserFilePath(userId);
  if (!fs.existsSync(file)) {
    return { orders: [], messages: [] };
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
