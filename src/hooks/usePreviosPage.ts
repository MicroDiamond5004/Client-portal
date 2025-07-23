import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

export const useItemFromLocation = (): string | null => {
  const location = useLocation();

  const item = useMemo(() => {
    // 1. Попробуем взять item из state
    if (location.state?.item) {
      return location.state.item;
    }

    // 2. Если нет — попробуем из search-параметров
    const params = new URLSearchParams(location.search);
    return params.get('item');
  }, [location]);

  return item;
};
