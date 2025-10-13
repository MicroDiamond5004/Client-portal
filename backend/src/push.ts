import webPush from 'web-push';
import fs from 'fs/promises';
import path from 'path';
import { PushSubscription } from 'web-push';
import { VAPID_KEYS } from './const';
import { deleteUserSubscriptionByEndpoint } from './data/mongodbStorage';

const SUBSCRIPTIONS_PATH = './server/subscriptions.json';

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

export const getVapidPublicKey = () => VAPID_KEYS.publicKey;

export function sendPushNotifications(subscriptions: any[], title: string, message: string) {
  const payload = JSON.stringify({
    title,
    body: message,
  });

  subscriptions?.forEach(async (subscription: any) => {
    try {
      await webPush.sendNotification(subscription, payload);
    } catch (error: any) {
      const endpoint = subscription.endpoint;

      const errMessage = error?.body || error?.message || '';

      const isGone =
        errMessage.includes('unsubscribed') ||
        errMessage.includes('expired') ||
        error?.statusCode === 410; // 410 = Gone

      if (isGone && endpoint) {
        // console.warn(`⚠ Подписка больше неактивна, удаляем: ${endpoint}`);
        deleteUserSubscriptionByEndpoint(endpoint);
      } else {
        // // console.error('❌ Ошибка отправки уведомления:', error);
      }
    }
  });
}

