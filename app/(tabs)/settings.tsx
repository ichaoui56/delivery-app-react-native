"use client"

import { useAuth } from "@/lib/auth-provider"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useState } from "react"
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert } from "react-native"

const SettingsScreen = () => {
  const router = useRouter()
  const { user, signOut, status, updateProfile } = useAuth()
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarLoadedUri, setAvatarLoadedUri] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    vehicleType: user?.deliveryMan?.vehicleType || "",
    image: user?.image || null
  })
    
  const profileLoading = status === "loading" || avatarLoading

  const handleLogout = async () => {
    await signOut()
    router.replace("/(auth)/signin")
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form if canceling edit
      setFormData({
        name: user?.name || "",
        phone: user?.phone || "",
        vehicleType: user?.deliveryMan?.vehicleType || "",
        image: user?.image || null
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Erreur", "Le nom est obligatoire")
      return
    }

    setIsSubmitting(true)
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone || null,
        vehicleType: formData.vehicleType || null,
        image: formData.image || null
      })
      setIsEditing(false)
      Alert.alert("Succès", "Profil mis à jour avec succès")
    } catch (error) {
      Alert.alert("Erreur", "Échec de la mise à jour du profil")
      console.error("Profile update error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeImage = () => {
    // TODO: Implement image picker functionality
    Alert.alert("Info", "La fonctionnalité de changement de photo sera bientôt disponible")
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Profile Card */}
        <LinearGradient colors={["#0f8fd5", "#0a6ba8"]} style={styles.profileCard}>
          <TouchableOpacity onPress={handleChangeImage} style={styles.profileAvatarWrapper}>
            {profileLoading ? <View style={styles.profileAvatarSkeleton} /> : null}
            <Image
              source={user?.image ? user.image : require("../../assets/images/profil-icon.png")}
              style={styles.profilePicture}
              cachePolicy="disk"
              onLoadStart={() => {
                const uri = user?.image || null
                if (uri && uri === avatarLoadedUri) return
                setAvatarLoading(true)
              }}
              onLoadEnd={() => {
                setAvatarLoading(false)
                if (user?.image) setAvatarLoadedUri(user.image)
              }}
            />
            <View style={styles.cameraIconWrapper}>
              <MaterialCommunityIcons name="camera" size={16} color="#0f8fd5" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            {profileLoading ? (
              <>
                <View style={styles.profileTextSkeletonLg} />
                <View style={styles.profileTextSkeletonSm} />
              </>
            ) : isEditing ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Nom complet"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                />
                <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              </>
            ) : (
              <>
                <Text style={styles.profileName}>{user?.name || ""}</Text>
                <Text style={styles.profileEmail}>{user?.email || ""}</Text>
                {user?.deliveryMan ? (
                  <Text style={styles.profileMeta}>
                    {user.deliveryMan.city || ""}
                    {user.deliveryMan.vehicleType ? ` • ${user.deliveryMan.vehicleType}` : ""}
                  </Text>
                ) : null}
              </>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.editButton, isEditing && styles.editButtonActive]}
            onPress={handleEditToggle}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons 
              name={isEditing ? "close" : "pencil"} 
              size={16} 
              color={isEditing ? "#FF6B6B" : "#0f8fd5"} 
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Edit Form Section */}
        {isEditing && (
          <View style={styles.editSection}>
            <View style={styles.editForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom complet</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Entrez votre nom"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Téléphone</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="Entrez votre numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type de véhicule</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.vehicleType}
                  onChangeText={(text) => setFormData({...formData, vehicleType: text})}
                  placeholder="Ex: Moto, Voiture, Vélo"
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Text style={styles.saveButtonText}>Enregistrement...</Text>
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Account Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account" size={20} color="#0f8fd5" />
            <Text style={styles.sectionTitle}>Informations du compte</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || "Non renseigné"}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{user?.phone || "Non renseigné"}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ville</Text>
                <Text style={styles.infoValue}>{user?.deliveryMan?.city || "Non renseigné"}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="motorbike" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Véhicule</Text>
                <Text style={styles.infoValue}>{user?.deliveryMan?.vehicleType || "Non renseigné"}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cash" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tarif de base</Text>
                <Text style={styles.infoValue}>
                  {user?.deliveryMan?.baseFee ? `${user.deliveryMan.baseFee} DH` : "Non défini"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Settings - Only keep essential options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog" size={20} color="#0f8fd5" />
            <Text style={styles.sectionTitle}>Préférences</Text>
          </View>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="bell" size={20} color="#0f8fd5" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#A0A0A0" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="lock" size={20} color="#0f8fd5" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Sécurité</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#A0A0A0" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="information" size={20} color="#0f8fd5" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>À propos de l'application</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#A0A0A0" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 5,
  },
  profileAvatarWrapper: {
    position: "relative",
  },
  cameraIconWrapper: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f8fd5",
  },
  profileAvatarSkeleton: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  editInput: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  profileTextSkeletonLg: {
    width: 140,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    marginBottom: 8,
  },
  profileTextSkeletonSm: {
    width: 110,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: "#E3F2FD",
  },
  profileMeta: {
    fontSize: 12,
    color: "#E3F2FD",
    marginTop: 4,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  editButtonActive: {
    backgroundColor: "#FFEBEE",
  },
  editSection: {
    marginBottom: 20,
  },
  editForm: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A1A",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#A5D6A7",
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#FF6B6B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  spacer: {
    height: 20,
  },
})

export default SettingsScreen