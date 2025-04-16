const VAPID_PUBLIC_KEY = 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE';

export async function sendPushFromClient(message: string, title: string | null = null) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push уведомления не поддерживаются этим браузером.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker зарегистрирован:', registration);

    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

    console.log('📬 Подписка получена:', subscription);

    const res = await fetch(`http://${window.location.hostname}:3001/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        message,
        title
      }),
    });

    if (res.ok) {
      console.log('✅ Уведомление отправлено');
    } else {
      console.error('❌ Ошибка при отправке уведомления');
    }
  } catch (error) {
    console.error('❌ Ошибка подписки:', error);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}
