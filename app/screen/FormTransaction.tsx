import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import RadioGroup from 'react-native-radio-buttons-group';
import dateToPostgresTimestamp from '../utils/date';

const FormTransaction = () => {
  const [amount, setAmount] = useState<string>(''); 
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit'); 
  const [user, setUser] = useState<{ id?: string; user_name?: string } | null>(null); 
  const [currentBalance, setCurrentBalance] = useState<number>(0); 
  const [loading, setLoading] = useState<boolean>(false);

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('@user_data');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur', error);
      }
    };
    loadUserData();
  }, []);

  // Real-time Firestore listener for transactions
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = firestore()
        .collection('transactions')
        .where('id_user', '==', Number(user.id))
        .onSnapshot(snapshot => {
          // handle notifications
          snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
              const transaction = change.doc.data();
              if (transaction.validated_at && !transaction.notification_seen) {
                // Mark notification as seen
                firestore()
                  .collection('transactions')
                  .doc(change.doc.id)
                  .update({ notification_seen: true });
              }
            }
          });

          let totalDeposit = 0;
          let totalWithdrawal = 0;

          snapshot.forEach(doc => {
            const transaction = doc.data();
            const transactionDate = new Date(transaction.date_transaction);

            if (transactionDate <= new Date() && transaction.validated_at != null) {
              totalDeposit += transaction.deposit || 0;
              totalWithdrawal += transaction.withdrawal || 0;
            }
          });

          setCurrentBalance(totalDeposit - totalWithdrawal);
        });

      return () => unsubscribe(); // Cleanup listener on unmount
    }
  }, [user]); // Re-run when `user` changes

  // Function to handle new transactions
  const handleTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }
  
    const parsedAmount = parseFloat(amount);
  
    if (transactionType === 'withdrawal' && parsedAmount > currentBalance) {
      Alert.alert('Erreur', 'Vous ne pouvez pas retirer plus que votre solde actuel');
      return;
    }
  
    setLoading(true);
    try {
      const transactionId = new Date().getTime(); // Unique integer ID
      const transactionData = {
        id: transactionId,
        id_user: Number(user?.id),
        deposit: transactionType === 'deposit' ? parsedAmount : 0,
        withdrawal: transactionType === 'withdrawal' ? parsedAmount : 0,
        date_transaction: dateToPostgresTimestamp(new Date()),
        approved_by_admin: false,
        validated_at: null
      };
  
      await firestore().collection('transactions').doc(transactionId.toString()).set(transactionData);
  
      Alert.alert('Succès', 'Transaction enregistrée avec succès. En attente de validation.');
      setAmount('');
    } catch (error) {
      console.error("Erreur lors de l'insertion de la transaction:", error);
      Alert.alert('Erreur', 'Une erreur s\'est produite lors de la transaction');
    } finally {
      setLoading(false);
    }
  };  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nouvelle Transaction</Text>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      <Text style={styles.label}>Montant</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Type de transaction</Text>
      <RadioGroup
        radioButtons={[
          { id: 'deposit', label: 'Dépôt', value: 'deposit' },
          { id: 'withdrawal', label: 'Retrait', value: 'withdrawal' },
        ]}
        onPress={(value) => setTransactionType(value as 'deposit' | 'withdrawal')}
        selectedId={transactionType}
        layout="row"
      />

      <Button title="Confirmer la Transaction" onPress={handleTransaction} />

      <Text style={styles.balance}>Solde actuel: {currentBalance} €</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, marginVertical: 8 },
  input: { height: 40, borderColor: '#ddd', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, marginBottom: 16 },
  balance: { marginTop: 20, fontSize: 18, textAlign: 'center', fontWeight: 'bold' },
});

export default FormTransaction;