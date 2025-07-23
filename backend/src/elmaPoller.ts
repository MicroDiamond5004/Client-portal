import { ElmaData } from "./types";

export function startPolling(callback: (data: ElmaData) => void) {
  setInterval(() => {
    const mockData: ElmaData = {
      id: Date.now(),
      title: 'Поступил новый заказ',
      content: {
        text: 'Пожалуйста, проверьте ELMA',
        type: 'order'
      }
    };
    console.log('🌀 Новые данные:', mockData);
    callback(mockData);
  }, 10000); // 10 сек
}
