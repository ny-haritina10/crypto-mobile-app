import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Sound from 'react-native-sound';
import { Ionicons } from '@expo/vector-icons';

const notificationSound = new Sound(require('../../assets/audio/notify.mp3'), (error) => {
  if (error) {
    console.log('Erreur de chargement du son', error);
  }
});

type Notification = {
  title: string;
  body: string;
};

const initializePushNotifications = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return true;
    }
    console.log('Permission not granted:', authStatus);
    return false;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
};

initializePushNotifications();

export default function NotificationManager() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const playNotificationSound = () => {
      notificationSound.stop(() => {
        notificationSound.play();
      });
    };

    const showCustomAlert = (title: string, body: string) => {
      setCurrentNotification({ title, body });
      setModalVisible(true);
    };

    const setupNotificationListeners = async () => {
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification?.notification) {
        const { title, body } = initialNotification.notification;
        if (title && body) {
          setNotifications((prev) => [...prev, { title, body }]);
          showCustomAlert(title, body);
          playNotificationSound();
        }
      }

      messaging().onNotificationOpenedApp((remoteMessage) => {
        if (remoteMessage.notification) {
          const { title, body } = remoteMessage.notification;
          if (title && body) {
            setNotifications((prev) => [...prev, { title, body }]);
            showCustomAlert(title, body);
            playNotificationSound();
          }
        }
      });

      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        if (remoteMessage.notification) {
          console.log('Background message received:', remoteMessage.notification);
        }
        return Promise.resolve();
      });

      const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        if (remoteMessage.notification) {
          const { title, body } = remoteMessage.notification;
          if (title && body) {
            showCustomAlert(title, body);
            setNotifications((prev) => [...prev, { title, body }]);
            playNotificationSound();
          }
        }
      });

      return () => unsubscribe();
    };

    setupNotificationListeners();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Ionicons name="notifications-outline" size={24} color="#FFA500" /> Notifications
      </Text>
      <ScrollView>
        {notifications.map((notification, index) => (
          <View key={index} style={styles.notification}>
            <Ionicons name="notifications-circle-outline" size={20} color="#FFA500" style={styles.notificationIcon} />
            <View>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationBody}>{notification.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal personnalisé pour afficher les notifications */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="notifications-sharp" size={40} color="#FFA500" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>{currentNotification?.title}</Text>
            <Text style={styles.modalBody}>{currentNotification?.body}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFA500',
    textAlign: 'center',
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginBottom: 10,
  },
  notificationIcon: {
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  notificationBody: {
    fontSize: 14,
    color: '#888',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});