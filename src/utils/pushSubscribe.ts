import { useEffect } from 'react';

export default function PushManagerComponent() {
  useEffect(() => {
    // Проверяем, поддерживает ли браузер пуши и service worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      askPermissionAndSubscribe();
      console.log('Проверяем, поддерживает ли браузер пуши и service worker');
    }
  }, []);

  async function askPermissionAndSubscribe() {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('🔔 Пользователь разрешил уведомления');
      await subscribeUserToPush();
    } else {
      console.warn('❌ Уведомления запрещены пользователем');
    }
  }

  async function subscribeUserToPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE'), // замените на ваш публичный ключ
            }).then((subscription) => {
            console.log('Подписка на уведомления:', subscription);
             console.log('📬 Подписка:', subscription);
            console.log(PushManager.arguments);
        
            //  Отправь на сервер
            fetch('http://${window.location.host}:3001/api/save-subscription/543e820c-e836-45f0-b177-057a584463b7', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            }).catch((error) => {
            console.error('Ошибка при подписке на уведомления:', error);
            });

        });
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }

  return null;
}
