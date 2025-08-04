import { useEffect, useState, useCallback } from 'react';
import { Fab, Zoom } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PushManagerModal from './PushManagerModal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { setSubscription } from 'src/store/slices/authSlice';
import { selectSubscription, selectClientId, selecttClientEmail } from 'src/store/selectors/authSelector';
import api from 'src/store/api';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any)?.MSStream;
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

const VAPID_PUBLIC_KEY = '...'; // Твой VAPID ключ

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function PushManagerFloatingButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const dispatch = useAppDispatch();

  const reduxSubscription = useAppSelector(selectSubscription);
  const clientId = useAppSelector(selectClientId);
  const email = useAppSelector(selecttClientEmail);

  const checkCondition = useCallback(async () => {
    const hasAPIs = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    const ios = isIOS(), safari = isSafari(), pwa = isPWA();
    const isIosPwa = ios && safari && pwa;
    const isNormal = hasAPIs && !ios;

    console.log({ hasAPIs, ios, safari, pwa, isIosPwa, reduxSubscription });

    if (!(isNormal || isIosPwa)) {
      setShouldShow(false);
      return;
    }

    const permission = Notification.permission;
    const registration = await navigator.serviceWorker.register('/sw.js');
    const sub = await registration.pushManager.getSubscription();

    if (sub) {
      dispatch(setSubscription(JSON.stringify(sub)));
      if (sub.endpoint && clientId && email) {
        try {
          await api.post('/change-subscription', {
            endpoint: sub.endpoint,
            newUserId: clientId,
            newEmail: email,
          });
        } catch (e) {
          console.warn('Ошибка сохранения подписки:', e);
        }
      }
      setShouldShow(false);
      return;
    }

    setShouldShow(permission === 'default');
  }, [dispatch, clientId, email, reduxSubscription]);

  useEffect(() => {
    checkCondition();
  }, [checkCondition]);

  const handleCloseModal = () => {
    setModalOpen(false);
    checkCondition();
  };

  if (!shouldShow) return null;

  return (
    <>
      <Zoom in={shouldShow}>
        <Fab color="primary" size="medium" onClick={() => setModalOpen(true)}
             sx={{ position: 'fixed', bottom: 24, right: 24 }}>
          <NotificationsIcon />
        </Fab>
      </Zoom>
      <PushManagerModal open={modalOpen} onClose={handleCloseModal} />
    </>
  );
}
