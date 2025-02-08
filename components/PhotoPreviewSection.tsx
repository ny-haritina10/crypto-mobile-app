import React, { useState, useEffect } from 'react';
import { TouchableOpacity, SafeAreaView, Image, StyleSheet, View, Alert } from 'react-native';
import { Fontisto } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

const CLOUDINARY_URL_KEY = '@cloudinary_url';
const USER_DATA_KEY = '@user_data';

interface PhotoPreviewProps {
  photo: {
    uri: string;
    base64?: string;
  };
  handleRetakePhoto: () => void;
  onSaveSuccess?: (url: string) => void;
  onClose: () => void;
}

const PhotoPreviewSection: React.FC<PhotoPreviewProps> = ({ 
  photo, 
  handleRetakePhoto,
  onSaveSuccess,
  onClose
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem(USER_DATA_KEY);
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur :", error);
      }
    };
    fetchUserData();
  }, []);

  const updateFirestoreProfile = async (imageUrl: string) => {
    if (!userId) {
      console.error("Erreur : ID utilisateur non disponible");
      Alert.alert("Erreur", "Impossible de mettre à jour le profil : ID utilisateur introuvable.");
      return;
    }
  
    try {
      console.log("Mise à jour du Firestore pour l'utilisateur :", userId);
  
      const querySnapshot = await firestore()
        .collection('users')
        .where('id', '==', userId)
        .get();
  
      if (querySnapshot.empty) {
        console.error("Aucun utilisateur trouvé avec cet ID.");
        Alert.alert("Erreur", "Utilisateur introuvable.");
        return;
      }
  
      querySnapshot.forEach(async (doc) => {
        await doc.ref.update({ pdp: imageUrl });
      });
  
      console.log("Mise à jour réussie !");
    } catch (error) {
      console.error("Erreur lors de la mise à jour Firestore :", error);
      Alert.alert("Erreur", "Échec de la mise à jour de la photo de profil.");
    }
  };
  
  const uploadToCloudinary = async () => {
    if (!userId) {
      Alert.alert('Erreur', "Utilisateur non identifié");
      return;
    }
  
    try {
      setIsSaving(true);
      const cloudName = 'dusy7wuv7';
      const uploadPreset = 'react_native_upload';
      
      // Générer un nom de fichier unique
      const dateString = new Date().toISOString();
      const fileName = `${userId}_profil_${dateString}.jpg`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
  
      formData.append('upload_preset', uploadPreset);
  
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
  
      const data = await response.json();
      const secureUrl = data.secure_url;
  
      // Mettre à jour Firestore
      await updateFirestoreProfile(fileName);
  
      // 🟢 Mettre à jour la session utilisateur
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        user.pdp = fileName; // 🔹 Met à jour seulement le champ `pdp`
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user)); // 🔄 Sauvegarde des nouvelles données
      }
  
      Alert.alert('Succès', 'Photo de profil mise à jour avec succès');
      onSaveSuccess?.(secureUrl);
  
      return secureUrl;
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
      Alert.alert('Erreur', "Échec de la mise à jour de la photo de profil");
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.box}>
        <Image
          style={styles.previewContainer}
          source={{uri: 'data:image/jpg;base64,' + photo.base64}}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleRetakePhoto}>
          <Fontisto name='trash' size={36} color='black' />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={uploadToCloudinary} disabled={isSaving}>
          <Fontisto name='save' size={36} color='black' />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Fontisto name='close' size={36} color='black' />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    borderRadius: 15,
    padding: 1,
    width: '95%',
    backgroundColor: 'darkgray',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '95%',
    height: '85%',
    borderRadius: 15,
  },
  buttonContainer: {
    marginTop: '4%',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    backgroundColor: 'gray',
    borderRadius: 25,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
});

export default PhotoPreviewSection;