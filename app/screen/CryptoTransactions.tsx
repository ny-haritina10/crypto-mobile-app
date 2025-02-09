import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Type for a transaction
type Transaction = {
  id: number;
  id_user: number;
  id_crypto: number;
  is_sale: boolean;
  is_purchase: boolean;
  quantity: number;
  date_transaction: string;
  cryptoLabel: string;
};

const CryptoTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<{ id?: string; user_name?: string } | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('@user_data');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          if (parsedUser.id) fetchCryptoTransactions(parsedUser.id);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const fetchCryptoTransactions = async (userId: number) => {
    try {
      const transactionsSnapshot = await firestore()
        .collection('crypto_transactions')
        .where('id_user', '==', Number(userId))
        .get();

      const transactionsList: Transaction[] = [];
      for (let doc of transactionsSnapshot.docs) {
        const transaction = doc.data();
        const cryptoSnapshot = await firestore()
          .collection('crypto')
          .doc(transaction.id_crypto.toString())
          .get();

        const crypto = cryptoSnapshot.data();

        transactionsList.push({
          id: transaction.id,
          id_user: transaction.id_user,
          id_crypto: transaction.id_crypto,
          is_sale: transaction.is_sale,
          is_purchase: transaction.is_purchase,
          quantity: transaction.quantity,
          date_transaction: transaction.date_transaction,
          cryptoLabel: crypto?.label || '',
        });
      }

      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error fetching crypto transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionRow}>
      <Ionicons
        name={item.is_purchase ? 'trending-up' : 'trending-down'}
        size={24}
        color={item.is_purchase ? '#10B981' : '#EF4444'}
        style={styles.icon}
      />
      <Text style={[styles.tableCell, styles.cryptoName]}>{item.cryptoLabel}</Text>
      <Text style={styles.tableCell}>
        {item.is_purchase ? '+' : '-'}{item.quantity}
      </Text>
      <Text style={styles.tableCell}>{item.date_transaction}</Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#F97316" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerText}>Type</Text>
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
    backgroundColor: '#1E1E1E',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F97316',
    textAlign: 'center',
    marginBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F97316',
    width: '25%',
    textAlign: 'center',
  },
  transactionRow: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    flex: 1,
  },
  cryptoName: {
    fontWeight: 'bold',
    color: '#FBBF24',
  },
  icon: {
    marginRight: 10,
  },
});

export default CryptoTransactions;