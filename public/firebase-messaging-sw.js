importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBQ0tzZKPAShrRu2lCrIgqxcQ_L7dOhQ6s',
  authDomain:        'duo-oc.firebaseapp.com',
  projectId:         'duo-oc',
  storageBucket:     'duo-oc.firebasestorage.app',
  messagingSenderId: '1023194083731',
  appId:             '1:1023194083731:web:cfde88338862ab218af866',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'WEEKLY', {
    body: body ?? '',
    icon: '/icon.png',
  });
});
