import { useEffect, useState } from 'react';
import { sendPushFromClient } from 'src/utils/pushManager';

export const usePushNotifications = () => {
  const [shouldAskPermission, setShouldAskPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isYandex = /YaBrowser/i.test(navigator.userAgent);

    const supported = 'Notification' in window &&
                      'serviceWorker' in navigator &&
                      'PushManager' in window &&
                      !isSafari && !isYandex;

    setIsSupported(supported);

    if (!supported) return;

    const checkPermission = async () => {
      const permission = Notification.permission;
      if (permission === 'default' || permission === 'denied') {
        setShouldAskPermission(true);
      }
    };

    checkPermission();
  }, []);

  const subscribe = async () => {
    try {
      await sendPushFromClient("Вы подписались на уведомления");
      setShouldAskPermission(false);
    } catch (err) {
      console.error("Ошибка при подписке на push", err);
    }
  };

  return {
    shouldAskPermission,
    subscribe,
    isSupported,
  };
};
