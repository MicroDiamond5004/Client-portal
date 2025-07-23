import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import api from 'src/store/api';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PushManagerModal({ open, onClose }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isIOSPrompt, setIsIOSPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = 'standalone' in navigator && (navigator as any).standalone;

    if (isIOS && !isStandalone) {
      setIsIOSPrompt(true);
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  const handleAllow = async () => {
    try {
      setIsSubscribing(true);

      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        console.log('🔔 Разрешение получено');
        await subscribeToPush();
        onClose();
      } else {
        console.warn('🚫 Уведомления не разрешены');

        // В случае, если браузер не показывает запрос (например, Яндекс/Сафари)
        alert(
          'Чтобы включить уведомления:\n\n' +
          '1. Нажмите на иконку 🔒 или [aA]/[Колокольчик] рядом с адресной строкой.\n' +
          '2. Найдите пункт "Уведомления".\n' +
          '3. Выберите "Разрешить" и перезагрузите страницу.'
        );
      }
    } catch (error) {
      console.error('❌ Ошибка при запросе разрешения:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE'
        ),
      });

      console.log('📬 Подписка:', subscription);

      await api.post(
        '/save-subscription/543e820c-e836-45f0-b177-057a584463b7',
        JSON.stringify(subscription)
      );

      console.log('✅ Подписка сохранена на сервере');
    } catch (err) {
      console.error('❌ Ошибка при подписке:', err);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  if (!isSupported || !open) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>🔔 Уведомления</DialogTitle>
      <DialogContent>
        {isIOSPrompt ? (
          <>
            <Typography mb={2}>
              Чтобы получать уведомления на iPhone, добавьте приложение на экран «Домой».
            </Typography>
            <Typography variant="body2">
              1. Нажмите <b>иконку «Поделиться»</b> внизу браузера. <br />
              2. Выберите <b>«На экран «Домой»»</b>. <br />
              3. Откройте приложение с иконки на главном экране. <br />
              4. Разрешите уведомления внутри PWA.
            </Typography>
          </>
        ) : permission === 'denied' ? (
          <>
            <Typography color="error" mb={2}>
              Вы запретили уведомления.
            </Typography>
            <Typography variant="body2">
              1. Нажмите на иконку 🔒 или [aA]/[🔔] рядом с адресной строкой. <br />
              2. Выберите «Разрешить» для уведомлений. <br />
              3. Перезагрузите страницу.
            </Typography>
          </>
        ) : permission === 'granted' ? (
          <Typography>✅ Уведомления уже включены. Спасибо!</Typography>
        ) : (
          <>
            <Typography mb={2}>
              Разрешите уведомления, чтобы не пропустить важные события.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Нажмите «Разрешить» и мы больше не будем спрашивать.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubscribing}>Закрыть</Button>
        {permission === 'default' && !isIOSPrompt && (
          <Button onClick={handleAllow} disabled={isSubscribing} variant="contained">
            Разрешить
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
