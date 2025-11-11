import { useEffect } from 'react';

function useDynamicVh() {
  useEffect(() => {
    const MIN_HEIGHT = 500; // Можно подкорректировать под твои нужды

    const setAppHeight = () => {
      const height = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;


      if (height < MIN_HEIGHT) {
        // Игнорируем слишком маленькие значения (например, когда клавиатура открыта)
        return;
      }

      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    setAppHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setAppHeight);
    }
    window.addEventListener('resize', setAppHeight);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setAppHeight);
      }
      window.removeEventListener('resize', setAppHeight);
    };
  }, []);
}

export default useDynamicVh;
