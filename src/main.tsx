// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { Suspense } from 'react';
import { CustomizerContextProvider } from './context/CustomizerContext';
import ReactDOM from 'react-dom/client';
import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';


async function deferRender() {
  const { worker } = await import("./api/mocks/browser");
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/mockServiceWorker.js')
      .then(() => console.log('✅ Service Worker зарегистрирован'))
      .catch((err) => console.error('❌ Ошибка регистрации SW:', err));
  });
}

deferRender().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <CustomizerContextProvider>
      <Suspense fallback={<Spinner />}>
        <App />
      </Suspense>
    </CustomizerContextProvider>,
  )
})
