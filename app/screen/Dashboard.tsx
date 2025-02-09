import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Dashboard = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="grid-outline" size={50} color="#f7931a" style={styles.icon} />
      <Text style={styles.title}>Tableau de bord</Text>
      <Text style={styles.subtitle}>Bienvenue sur votre tableau de bord !</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f7931a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default Dashboard;
