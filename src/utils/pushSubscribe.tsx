// src/components/notifications/PushManagerModal.tsx
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

const VAPID_PUBLIC_KEY = 'BIyUd7eREfLOnyukFMR9DuezE8uXAnOwp_-Rr7YxIX-RIxm2IRW6uJ90vB1OBn51o0rGAf8k4SQGR-ZfuutHmiE';

export default function PushManagerModal({ open, onClose }: Props) {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }

    setPermissionState(Notification.permission);
  }, []);

  const handleAllow = async () => {
    try {
      setIsSubscribing(true);

      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        console.log('🔔 Разрешение получено, подписываем...');
        await subscribeToPush();
      } else {
        console.warn('🚫 Пользователь отказался от уведомлений.');
      }

      onClose();
    } catch (error) {
      console.error('❌ Ошибка при запросе разрешения:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

      console.log('📬 Подписка:', subscription);



      await api.post(
        '/save-subscription/543e820c-e836-45f0-b177-057a584463b7',
        JSON.stringify(subscription)
      );

      console.log('✅ Подписка отправлена на сервер');
    } catch (err) {
      console.error('❌ Ошибка при подписке на push:', err);
    }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  if (!isSupported) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>🔔 Уведомления</DialogTitle>
      <DialogContent>
        {permissionState === 'default' && (
          <>
            <Typography mb={2}>
              Разрешите уведомления, чтобы получать оповещения о новых событиях.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Нажмите «Разрешить», и мы больше не будем спрашивать.
            </Typography>
          </>
        )}

        {permissionState === 'denied' && (
          <>
            <Typography color="error" mb={2}>
              Вы запретили уведомления. Чтобы включить их снова:
            </Typography>
            <Typography variant="body2" component="div">
              1. Нажмите на иконку 🔒 рядом с адресной строкой. <br />
              2. Найдите «Уведомления» и выберите «Разрешить». <br />
              3. Перезагрузите страницу.
            </Typography>
          </>
        )}

        {permissionState === 'granted' && (
          <>
            <Typography>
              Уведомления уже включены. Спасибо! 🔔
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubscribing}>
          Закрыть
        </Button>

        {permissionState === 'default' && (
          <Button onClick={handleAllow} disabled={isSubscribing} variant="contained" autoFocus>
            Разрешить
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
