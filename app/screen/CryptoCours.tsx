import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const CryptoCours = () => {
  const [cryptoData, setCryptoData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set()); // Favoris (id_crypto)
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
    fetchCryptoData();
  }, []);

  // Récupérer l'ID utilisateur
  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserId(parsedUser.id);
        fetchFavorites(parsedUser.id); // Charger les favoris après avoir récupéré l'utilisateur
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur :", error);
    }
  };

  // Récupérer les favoris de l'utilisateur depuis Firestore
  const fetchFavorites = async (userId: string) => {
    try {
      const favSnapshot = await firestore()
        .collection('favori')
        .where('id_users', '==', userId)
        .get();

      const favSet = new Set(favSnapshot.docs.map(doc => doc.data().id_crypto));
      setFavorites(favSet);
    } catch (error) {
      console.error("Erreur lors de la récupération des favoris :", error);
    }
  };

  const fetchCryptoData = async () => {
    try {
      const querySnapshot = await firestore().collection('crypto_cours').get();
      const latestData = new Map();

      querySnapshot.docs.forEach(doc => {
        const docData = doc.data();
        const dateCours = new Date(docData.date_cours);
        
        if (!latestData.has(docData.id_crypto) || dateCours > new Date(latestData.get(docData.id_crypto).date)) {
          latestData.set(docData.id_crypto, {
            id_crypto: docData.id_crypto,
            cours: docData.cours,
            date: docData.date_cours,
          });
        }
      });
      
      const data: any[] = [];
      for (const [id_crypto, crypto] of latestData.entries()) {
        const cryptoDoc = await firestore().collection('crypto').doc(id_crypto.toString()).get();
        const cryptoName = cryptoDoc.data()?.label;

        if (cryptoName) {
          data.push({ ...crypto, crypto_name: cryptoName });
        }
      }
      
      setCryptoData(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des données de crypto-monnaies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter ou retirer une crypto des favoris
  const toggleFavorite = async (cryptoId: number) => {
    if (!userId) {
      Alert.alert('Erreur', "Utilisateur non identifié");
      return;
    }

    try {
      const favRef = firestore()
        .collection('favori')
        .where('id_users', '==', userId)
        .where('id_crypto', '==', cryptoId);

      const favSnapshot = await favRef.get();

      if (!favSnapshot.empty) {
        // Supprimer des favoris
        favSnapshot.forEach(doc => doc.ref.delete());
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(cryptoId);
          return newFavorites;
        });
      } else {
        // Ajouter aux favoris
        await firestore().collection('favori').add({
          id_users: userId,
          id_crypto: cryptoId,
        });

        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.add(cryptoId);
          return newFavorites;
        });
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris :', error);
      Alert.alert('Erreur', "Impossible de mettre à jour les favoris");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Text style={styles.title}>Cours des Cryptos</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Nom Crypto</Text>
            <Text style={styles.headerText}>Cours</Text>
            <Text style={styles.headerText}>Actions</Text>
          </View>
  
          {cryptoData.map((crypto) => (
            <View key={crypto.id_crypto} style={styles.tableRow}>
              <Text style={styles.rowText}>{crypto.crypto_name}</Text>
              <Text style={styles.rowText}>{crypto.cours} USD</Text>
              <TouchableOpacity onPress={() => toggleFavorite(crypto.id_crypto)}>
                <Ionicons
                  name={favorites.has(crypto.id_crypto) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={favorites.has(crypto.id_crypto) ? 'red' : 'black'}
                />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  rowText: {
    fontSize: 14,
  },
});

export default CryptoCours;
