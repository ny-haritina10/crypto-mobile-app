import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import Camera from '../app/tabs/camera';
import Dashboard from '../app/screen/Dashboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationManager from '../app/tabs/notification';
import CryptoChart from '../app/screen/CryptoCours';
import CryptoTransactions from '../app/screen/CryptoTransactions';
import FormTransaction  from '../app/screen/FormTransaction';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ id?: string; user_name?: string } | null>(null);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (parsedUser.id) {
          const cloudName = 'dusy7wuv7';
          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa('635563665527585:pc_ZWhMK3jRCGVvqBn-mQ8o_fvE')}`, 
            },
          });

          const data = await response.json();

          
          const images = data.resources.filter((image: any) => {
            const fileNamePrefix = image.public_id.split('_')[0]; // Extraire la partie avant le premier '_'
            return fileNamePrefix == Number(parsedUser.id); // Comparer avec l'id de l'utilisateur
          });

          if (images.length > 0) {
            // Trier les images par date de création (la plus récente en premier)
            images.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Récupérer l'URL de la dernière image
            const mostRecentImage = images[0];
            const cloudinaryUrl = mostRecentImage.secure_url;
            setStoredImageUrl(cloudinaryUrl);
          } else {
            setStoredImageUrl(null);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données utilisateur :", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleImagePress = () => {
    props.navigation.navigate('Camera');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@user_data'); 
      props.navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], 
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.drawerContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#103a8e']} tintColor="#103a8e" />
      }
    >
      <View style={styles.drawerHeader}>
        <View style={styles.userInfoSection}>
          <TouchableOpacity onPress={handleImagePress}>
            <View style={styles.userAvatar}>
              <Image 
                source={storedImageUrl ? { uri: storedImageUrl } : require('../assets/icon.png')}
                style={styles.userImage}
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.user_name || "Non connecté"}</Text>
        </View>
      </View>
      <View style={styles.drawerItems}>
        <DrawerItemList {...props} />
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="white" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#000000',
        drawerStyle: { backgroundColor: '#ffffff', width: 240 },
        drawerLabelStyle: { fontWeight: '500' },
        drawerActiveBackgroundColor: '#103a8e',
        drawerActiveTintColor: '#ffffff',
        drawerInactiveTintColor: '#000000',
      }}
      drawerContent={(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="home-outline" size={size} color={focused ? '#ffffff' : '#000000'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Notification"
        component={NotificationManager}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="notifications-outline" size={size} color={focused ? '#ffffff' : '#000000'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Crypto cours"
        component={CryptoChart}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="analytics-outline" size={size} color={focused ? '#ffffff' : '#000000'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Historique des transactions"
        component={CryptoTransactions}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="wallet-outline" size={size} color={focused ? '#ffffff' : '#000000'} />
          ),
        }}
      />
      <Drawer.Screen
        name="cash transaction"
        component={FormTransaction}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="logo-bitcoin" size={size} color={focused ? '#ffffff' : '#000000'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Camera"
        component={Camera}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#ffffff' },
  drawerHeader: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  userInfoSection: { alignItems: 'center', marginTop: 10 },
  userAvatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  userImage: { width: '100%', height: '100%', borderRadius: 50, borderWidth: 3, borderColor: '#103a8e', resizeMode: 'cover' },
  userName: { color: '#000000', fontSize: 18, marginTop: 12, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  balance: { color: '#4CAF50', fontSize: 16, fontWeight: '500', marginTop: 5 }, // Style pour le solde
  drawerItems: { flex: 1, marginTop: 15 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D9534F',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default DrawerNavigator;
