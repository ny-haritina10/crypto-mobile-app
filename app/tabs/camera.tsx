import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Button, StyleSheet, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhotoPreviewSection from '../../components/PhotoPreviewSection';

const CLOUDINARY_URL_KEY = '@cloudinary_url';

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    loadStoredImage();
  }, []);

  const loadStoredImage = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem(CLOUDINARY_URL_KEY);
      setStoredImageUrl(savedUrl);
    } catch (error) {
      console.error("Error loading stored image:", error);
    }
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      try {
        const takenPhoto = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
          exif: false,
        });
        
        setPhoto(takenPhoto);
      } catch (error) {
        console.error("Error taking photo:", error);
      }
    }
  };

  const handleRetakePhoto = () => setPhoto(null);

  // New method to close the camera preview
  const handleCloseCamera = () => setPhoto(null);

  if (photo) {
    return <PhotoPreviewSection 
      photo={photo} 
      handleRetakePhoto={handleRetakePhoto}
      onSaveSuccess={(url) => setStoredImageUrl(url)}
      onClose={handleCloseCamera} // Added onClose prop
    />;
  }

  if (storedImageUrl) {
    return (
      <View style={styles.profileContainer}>
        <Image 
          source={{ uri: storedImageUrl }} 
          style={styles.profileImage} 
        />
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={() => setStoredImageUrl(null)}
        >
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing} 
        ref={cameraRef}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
          >
            <AntDesign name='retweet' size={44} color='black' />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleTakePhoto}
          >
            <AntDesign name='camera' size={44} color='black' />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: 'gray',
    borderRadius: 10,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  uploadButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
  },
});