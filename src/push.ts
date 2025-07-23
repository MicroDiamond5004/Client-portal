import webPush from 'web-push';
import fs from 'fs/promises';
import path from 'path';
import { PushSubscription } from 'web-push';

const SUBSCRIPTIONS_PATH = './server/subscriptions.json';

const VAPID_KEYS = {
  publicKey: 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE',
  privateKey: 'WM4lBtcHCBrKFaiZiOLF39NbMjML-H3VaDNXkCQBFmg', // 👈 НЕ выкладывай этот ключ на клиент!
};

webPush.setVapidDetails(
  'mailto:you@example.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

export async function subscribeClient(sub: PushSubscription) {
  try {
    const existing = await readSubscriptions();
    const merged = [...existing, sub];
    await fs.writeFile(SUBSCRIPTIONS_PATH, JSON.stringify(merged, null, 2));
  } catch (err) {
    console.error('Subscribe error:', err);
  }
}

export async function sendPushToAll(message: string) {
  try {
    const subscriptions = await readSubscriptions();
    const payload = JSON.stringify({
      title: 'Новое уведомление',
      body: message
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(sub, payload);
      } catch (err) {
        console.error('Push error', err);
      }
    }
  } catch (err) {
    console.error('Send push failed', err);
  }
}

async function readSubscriptions(): Promise<PushSubscription[]> {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export const getVapidPublicKey = () => vapidKeys.publicKey;
