
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

const SettingsScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const router = useRouter();

  const toggleDarkMode = () => setIsDarkMode((previousState) => !previousState);
  const toggleNotifications = () => setNotificationsEnabled((previousState) => !previousState);

  const handleLogout = () => {
    // Implement logout logic here
    console.log('Logging out...');
    router.replace('/(auth)/signin');
  };

  return (
    <View style={isDarkMode ? styles.containerDark : styles.containerLight}>
      <View style={styles.header}>
        <Text style={isDarkMode ? styles.headerTitleDark : styles.headerTitleLight}>Settings</Text>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{ uri: 'https://sonic-delivery.up.railway.app/images/logo/logo.png' }} // Replace with actual profile picture
          style={styles.profilePicture}
        />
        <Text style={isDarkMode ? styles.profileNameDark : styles.profileNameLight}>John Doe</Text>
        <Text style={styles.profileEmail}>john.doe@example.com</Text>
      </View>

      <View style={styles.settingsSection}>
        <View style={styles.settingItem}>
          <Text style={isDarkMode ? styles.settingTextDark : styles.settingTextLight}>Dark Mode</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#0586b5' }}
            thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleDarkMode}
            value={isDarkMode}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={isDarkMode ? styles.settingTextDark : styles.settingTextLight}>Push Notifications</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#0586b5' }}
            thumbColor={notificationsEnabled ? '#f4f3f4' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleNotifications}
            value={notificationsEnabled}
          />
        </View>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={isDarkMode ? styles.settingTextDark : styles.settingTextLight}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={isDarkMode ? styles.settingTextDark : styles.settingTextLight}>Change Password</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  containerLight: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  containerDark: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  headerTitleLight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0586b5',
  },
  headerTitleDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0586b5',
  },
  profileSection: {
    alignItems: 'center',
    padding: 30,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  profileNameLight: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  profileNameDark: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  settingsSection: {
    marginTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingTextLight: {
    fontSize: 18,
    color: '#333',
  },
  settingTextDark: {
    fontSize: 18,
    color: '#fff',
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#0586b5',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
