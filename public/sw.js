self.addEventListener('push', function(event) {
  const data = event.data?.text() || 'Push без данных';

  console.log(data, 'dataaaa');
  
  event.waitUntil(
    self.registration.showNotification('📢 Уведомление', {
      body: data,
      // icon: '/icon.png', // если есть иконка
      tag: 'simple-push-demo',
    })
  );
});
