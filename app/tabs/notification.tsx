import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

const notificationSound = new Sound(require('../../assets/audio/notify.mp3'), (error) => {
  if (error) {
    console.log('Erreur de chargement du son', error);
  }
});

// Définir un type strict pour les notifications
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

    const userData = await AsyncStorage.getItem('@user_data');
    if (!userData) {
      Alert.alert('Erreur', 'User not found');
      return;
    }

    // parse user data
    const user = JSON.parse(userData);

    if (enabled) {
      console.log('Authorization status:', authStatus);
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      
      try {
        await fetch('http://192.168.88.156:8099/front-office/api/users/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id, 
            fcmToken: token,
          }),
        });
        console.log('FCM token sent to server successfully');
      } catch (error) {
        console.error('Error sending FCM token to server:', error);
      }
      
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
        console.log('Received foreground message:', remoteMessage);

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
      <Text style={styles.title}>Notification</Text>
      <ScrollView>
        {notifications.map((notification, index) => (
          <View key={index} style={styles.notification}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationBody}>{notification.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Modal personnalisé pour afficher les notifications */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  notification: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
