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
import FormTransaction from '../app/screen/FormTransaction';

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
            const fileNamePrefix = image.public_id.split('_')[0]; 
            return fileNamePrefix == Number(parsedUser.id); 
          });

          if (images.length > 0) {
            images.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
      props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.drawerContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f7931a']} tintColor="#f7931a" />}
    >
      <View style={styles.drawerHeader}>
        <TouchableOpacity onPress={handleImagePress} style={styles.userAvatarContainer}>
          <Image 
            source={storedImageUrl ? { uri: storedImageUrl } : require('../assets/icon.png')}
            style={styles.userImage}
          />
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.user_name || "Non connecté"}</Text>
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
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#f7931a',
        drawerStyle: { backgroundColor: '#1e1e1e', width: 250 },
        drawerLabelStyle: { fontWeight: '500', color: '#fff' },
        drawerActiveBackgroundColor: '#f7931a',
        drawerActiveTintColor: '#121212',
        drawerInactiveTintColor: '#bbb',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="home-outline" size={size} color={focused ? '#121212' : '#f7931a'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationManager}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="notifications-outline" size={size} color={focused ? '#121212' : '#f7931a'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Crypto Prix"
        component={CryptoChart}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="analytics-outline" size={size} color={focused ? '#121212' : '#f7931a'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Crypto transactions"
        component={CryptoTransactions}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="wallet-outline" size={size} color={focused ? '#121212' : '#f7931a'} />
          ),
        }}
      />
      <Drawer.Screen
        name="Cash transactions"
        component={FormTransaction}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Ionicons name="cash-outline" size={size} color={focused ? '#121212' : '#f7931a'} />
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
  drawerContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  drawerHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  userAvatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f7931a',
    overflow: 'hidden',
  },
  userImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    resizeMode: 'cover',
  },
  userName: {
    color: '#f7931a',
    fontSize: 18,
    marginTop: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  drawerItems: {
    flex: 1,
    marginTop: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d9534f',
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