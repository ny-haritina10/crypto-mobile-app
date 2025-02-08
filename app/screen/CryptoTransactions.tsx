import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Définir un type pour une transaction
type Transaction = {
  id: number;
  id_user: number;
  id_crypto: number;
  is_sale: boolean;
  is_purchase: boolean;
  quantity: number;
  date_transaction: string; // Date sous forme de chaîne
  cryptoLabel: string;
};

const CryptoTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]); // Spécifier le type de `transactions`
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<{ id?: string; user_name?: string } | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Charger les données utilisateur depuis AsyncStorage
        const userData = await AsyncStorage.getItem('@user_data');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          if (parsedUser.id) fetchCryptoTransactions(parsedUser.id); // Charger les transactions si l'utilisateur est connecté
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur', error);
      }
    };

    loadUserData();
  }, []);

  // Fonction pour récupérer les transactions de crypto
  const fetchCryptoTransactions = async (userId: number) => { 
    try {
      console.log('user id: ', userId)
      const transactionsSnapshot = await firestore()
        .collection('crypto_transactions')
        .where('id_user', '==', Number(userId))
        .get();

      const transactionsList: Transaction[] = [];
      // Parcourir toutes les transactions et récupérer les informations
      for (let doc of transactionsSnapshot.docs) {
        const transaction = doc.data();
        const cryptoSnapshot = await firestore()
          .collection('crypto')
          .doc(transaction.id_crypto.toString()) // Assurez-vous que l'id_crypto est converti en chaîne
          .get();

        const crypto = cryptoSnapshot.data();

        transactionsList.push({
          id: transaction.id, // Ajouter l'ID de la transaction
          id_user: transaction.id_user,
          id_crypto: transaction.id_crypto,
          is_sale: transaction.is_sale,
          is_purchase: transaction.is_purchase,
          quantity: transaction.quantity,
          date_transaction: transaction.date_transaction, // Conserver la chaîne de la date
          cryptoLabel: crypto?.label || '',
        });
      }

      setTransactions(transactionsList); // Mettre à jour l'état avec les transactions
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions crypto:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour rendre chaque item de la liste
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionRow}>
      {/* Colonne Crypto */}
      <Text style={[styles.tableCell, styles.tableHeader]}>{item.cryptoLabel}</Text>
      {/* Colonne Date */}
      {/* Colonne Quantité */}
      <Text style={[styles.tableCell, styles.tableHeader]}>
        {item.is_purchase ? 'Achat' : 'Vente'}: {item.quantity} 
      </Text>
      <Text style={[styles.tableCell, styles.tableHeader]}>{item.date_transaction}</Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      {/* En-tête de la table */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Crypto</Text>
        <Text style={styles.headerText}>Quantité</Text>
        <Text style={styles.headerText}>Date</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f4f4f4',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '33%',
    textAlign: 'center',
  },
  transactionRow: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'space-between',
  },
  tableCell: {
    fontSize: 14,
    flex: 1,
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  tableHeader: {
    fontWeight: 'bold',
  },
});

export default CryptoTransactions;
