import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import RadioGroup from 'react-native-radio-buttons-group';
import dateToPostgresTimestamp from '../utils/date';
import { Ionicons } from '@expo/vector-icons';

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
          snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
              const transaction = change.doc.data();
              if (transaction.validated_at && !transaction.notification_seen) {
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

      return () => unsubscribe();
    }
  }, [user]);

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
      const transactionId = new Date().getTime();
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
      {loading && <ActivityIndicator size="large" color="#FFA500" />}

      <Text style={styles.label}>Montant</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="cash-outline" size={24} color="#FFA500" style={styles.icon} />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="Entrez le montant"
          placeholderTextColor="#888"
        />
      </View>

      <Text style={styles.label}>Type de transaction</Text>
      <RadioGroup
        radioButtons={[
          { id: 'deposit', label: 'Dépôt', value: 'deposit', color: '#FFA500', labelStyle: { color: '#FFF' } },
          { id: 'withdrawal', label: 'Retrait', value: 'withdrawal', color: '#FFA500', labelStyle: { color: '#FFF' } },
        ]}
        onPress={(value) => setTransactionType(value as 'deposit' | 'withdrawal')}
        selectedId={transactionType}
        layout="row"
        containerStyle={styles.radioGroup}
      />

      <TouchableOpacity style={styles.button} onPress={handleTransaction}>
        <Text style={styles.buttonText}>Confirmer la Transaction</Text>
      </TouchableOpacity>

      <Text style={styles.balance}>Solde actuel: {currentBalance} €</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: '#121212' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#FFA500' },
  label: { fontSize: 16, marginVertical: 8, color: '#FFF' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderColor: '#FFA500', borderWidth: 1, borderRadius: 5, marginBottom: 16 },
  icon: { marginHorizontal: 10 },
  input: { flex: 1, height: 40, color: '#FFF', paddingHorizontal: 10 },
  radioGroup: { marginBottom: 16 },
  button: { backgroundColor: '#FFA500', padding: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#121212', fontSize: 16, fontWeight: 'bold' },
  balance: { marginTop: 20, fontSize: 18, textAlign: 'center', fontWeight: 'bold', color: '#FFF' },
});

export default FormTransaction;