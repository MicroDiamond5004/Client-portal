self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json(); // парсим JSON
      const { title, body, icon } = data;

      self.registration.showNotification(title || 'Уведомление', {
        body,
        icon: icon || '/logo-square.png',
      });
    } catch (err) {
      console.error('Ошибка при разборе push-сообщения:', err);
    }
  }
});
