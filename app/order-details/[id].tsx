"use client"

import {
  apiAcceptOrder,
  apiCreateOrderNote,
  apiDeleteOrderNote,
  apiGetOrderNotes,
  apiOrderDetails,
  apiUpdateOrderStatus,
  CreateNoteRequest,
  DeliveryNote,
  getAuthToken,
  Order,
  OrderStatus,
  UpdateOrderStatusRequest,
} from "@/lib/mobile-auth"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

type StatusUpdateModalState = {
  visible: boolean
  selectedStatus: "DELAYED" | "REJECTED" | "CANCELLED" | "DELIVERED" | null
  reason: string
  commonReason: string
}

type DeliveryAttempt = {
  id: number
  orderId: number
  attemptNumber: number
  deliveryManId: number | null
  attemptedAt: string
  status: "TENTATIVE" | "ÉCHEC" | "RÉUSSIE" | "CLIENT_INDISPONIBLE" | "ADRESSE_ERRONÉE" | "REFUSÉ" | "AUTRE"
  reason: string | null
  notes: string | null
  location: string | null
}

type NoteModalState = {
  visible: boolean
  content: string
  isPrivate: boolean
  isSubmitting: boolean
}

const COMMON_REASONS = [
  "Client non disponible",
  "Client ne répond pas",
  "Problèmes d'adresse",
  "Refusé",
  "Adresse erronée",
  "Autre",
]

const OrderDetailsScreen = () => {
  const { id } = useLocalSearchParams()
  const router = useRouter()

  // States
  const [statusModal, setStatusModal] = useState<StatusUpdateModalState>({
    visible: false,
    selectedStatus: null,
    reason: "",
    commonReason: "",
  })

  const [noteModal, setNoteModal] = useState<NoteModalState>({
    visible: false,
    content: "",
    isPrivate: false,
    isSubmitting: false,
  })

  const [order, setOrder] = useState<Order | null>(null)
  const [deliveryAttempts, setDeliveryAttempts] = useState<DeliveryAttempt[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cachedOrders, setCachedOrders] = useState<Record<number, Order>>({})
  const [isRefreshingNotes, setIsRefreshingNotes] = useState(false)

  // Refs for keyboard handling
  const scrollViewRef = useRef<ScrollView>(null)
  const reasonInputRef = useRef<TextInput>(null)
  const noteInputRef = useRef<TextInput>(null)

  useEffect(() => {
    const orderId = Number.parseInt(Array.isArray(id) ? id[0] : id, 10)
    if (cachedOrders[orderId]) {
      setOrder(cachedOrders[orderId])
      setIsLoading(false)
    } else if (isInitialLoad) {
      fetchOrderDetails()
    }
  }, [id, cachedOrders, isInitialLoad])

  // Reset initial load state when navigating away
  useEffect(() => {
    return () => {
      setIsInitialLoad(true)
    }
  }, [])

  const fetchOrderDetails = async () => {
    const orderId = Number.parseInt(Array.isArray(id) ? id[0] : id, 10)
    try {
      setIsLoading(true)
      setError(null)
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Aucun jeton d'authentification trouvé")
      }
      if (!Number.isFinite(orderId)) {
        throw new Error("ID de commande invalide")
      }

      // Fetch order details
      const response = await apiOrderDetails(token, orderId)
      setOrder(response.order)

      // Set notes from order response if available
      if (response.order.deliveryNotes) {
        setDeliveryNotes(response.order.deliveryNotes)
      } else {
        // Try to fetch notes separately if not included in order response
        try {
          const notesData = await apiGetOrderNotes(token, orderId)
          setDeliveryNotes(notesData.notes || [])
        } catch (err) {
          console.error("Error fetching notes:", err)
          // If API fails, set empty array
          setDeliveryNotes([])
        }
      }

      // Fetch delivery attempts
      try {
        const attemptsResponse = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}/attempts`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (attemptsResponse.ok) {
          const attemptsData = await attemptsResponse.json()
          setDeliveryAttempts(attemptsData.attempts || [])
        }
      } catch (err) {
        console.error("Error fetching attempts:", err)
      }

      setCachedOrders(prev => ({
        ...prev,
        [orderId]: response.order
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la récupération des détails de la commande")
      console.error("Erreur lors de la récupération des détails de la commande:", err)
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }


  const fetchDeliveryNotes = async (token: string, orderId: number) => {
    try {
      const notesData = await apiGetOrderNotes(token, orderId)
      setDeliveryNotes(notesData.notes || [])
    } catch (err) {
      console.error("Error fetching notes:", err)
    }
  }

  const getApiBaseUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL
    if (envUrl) return envUrl.replace(/\/$/, "")
    return "https://dash.sonixpress.ma"
  }

  // Function to make a phone call
  const handleCallCustomer = async () => {
    if (!order?.customerPhone) {
      Alert.alert("Erreur", "Numéro de téléphone non disponible")
      return
    }

    const phoneNumber = order.customerPhone.replace(/\s+/g, '')
    const phoneUrl = `tel:${phoneNumber}`

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl)
      if (canOpen) {
        await Linking.openURL(phoneUrl)
      } else {
        Alert.alert("Erreur", "Impossible d'ouvrir l'application téléphone")
      }
    } catch (error) {
      console.error("Erreur lors de l'appel:", error)
      Alert.alert("Erreur", "Impossible de passer l'appel")
    }
  }

  // Function to open WhatsApp
  const handleOpenWhatsApp = async () => {
    if (!order?.customerPhone) {
      Alert.alert("Erreur", "Numéro de téléphone non disponible")
      return
    }

    const phoneNumber = order.customerPhone.replace(/\s+/g, '')

    // Remove leading 0 and add country code if needed
    let formattedNumber = phoneNumber
    if (phoneNumber.startsWith('0')) {
      formattedNumber = '212' + phoneNumber.substring(1) // Morocco country code
    }

    // Create message with order information
    const orderInfo = `Bonjour,\n\nInformations sur la commande:\n`
    const details = `📦 Commande: ${order.orderCode}\n👤 Client: ${order.customerName}\n📍 Adresse: ${order.address}\n💰 Total: MAD ${order.totalPrice.toFixed(2)}\n📅 Date: ${formatDate(order.createdAt)}\n\nMerci !`
    const message = encodeURIComponent(orderInfo + details)
    const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=${message}`

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl)
      if (canOpen) {
        await Linking.openURL(whatsappUrl)
      } else {
        // If WhatsApp is not installed, try web version
        const webWhatsappUrl = `https://wa.me/${formattedNumber}?text=${message}`
        await Linking.openURL(webWhatsappUrl)
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de WhatsApp:", error)
      Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp")
    }
  }

  const getStatusAppearance = (status: OrderStatus): {
    label: string;
    color: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    gradient: readonly string[]
  } => {
    switch (status) {
      case "PENDING":
        return {
          label: "En attente",
          color: "#FFA500",
          icon: "clock-outline",
          gradient: ["#FFF7E6", "#FFF2D9"] as const
        }
      case "ACCEPTED":
      case "ASSIGNED_TO_DELIVERY":
        return {
          label: "Assignée",
          color: "#0f8fd5",
          icon: "truck-fast",
          gradient: ["#E3F2FD", "#EBF5FF"] as const
        }
      case "DELAYED":
        return {
          label: "Retardée",
          color: "#FFA500",
          icon: "clock-alert-outline",
          gradient: ["#FFF7E6", "#FFE4B5"] as const
        }
      case "DELIVERED":
        return {
          label: "Livrée",
          color: "#28a745",
          icon: "check-circle",
          gradient: ["#E8F5E9", "#E0F0E3"] as const
        }
      case "CANCELLED":
      case "REJECTED":
        return {
          label: "Annulée",
          color: "#dc3545",
          icon: "close-circle",
          gradient: ["#FDEDED", "#FBEBEB"] as const
        }
      default:
        return {
          label: status,
          color: "#666",
          icon: "help-circle",
          gradient: ["#F0F0F0", "#E8E8E8"] as const
        }
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getAttemptStatusInfo = (status: DeliveryAttempt['status']) => {
    switch (status) {
      case "RÉUSSIE":
        return { label: "Succès", color: "#28a745", icon: "check-circle" as const }
      case "ÉCHEC":
        return { label: "Échec", color: "#dc3545", icon: "close-circle" as const }
      case "CLIENT_INDISPONIBLE":
        return { label: "Client non disponible", color: "#FFA500", icon: "account-off" as const }
      case "ADRESSE_ERRONÉE":
        return { label: "Adresse erronée", color: "#FFA500", icon: "map-marker-alert" as const }
      case "REFUSÉ":
        return { label: "Refusé", color: "#dc3545", icon: "cancel" as const }
      case "AUTRE":
        return { label: "Autre", color: "#666", icon: "alert-circle" as const }
      case "TENTATIVE":
      default:
        return { label: "Tentative", color: "#0f8fd5", icon: "clock-outline" as const }
    }
  }

  const handleAcceptOrder = async () => {
    if (!order) return
    try {
      setActionLoading(true)
      const token = await getAuthToken()
      if (!token) throw new Error("Aucun jeton d'authentification trouvé")
      await apiAcceptOrder(token, order.id)
      await fetchOrderDetails()
      Alert.alert("Succès", "Commande acceptée et assignée pour livraison.")
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'acceptation.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenStatusModal = () => {
    setStatusModal({ visible: true, selectedStatus: null, reason: "", commonReason: "" })
  }

  const handleCloseStatusModal = () => {
    setStatusModal({ visible: false, selectedStatus: null, reason: "", commonReason: "" })
    Keyboard.dismiss()
  }

  const handleStatusChange = (status: "DELAYED" | "REJECTED" | "CANCELLED" | "DELIVERED") => {
    setStatusModal(prev => ({ ...prev, selectedStatus: status }))
  }

  const handleCommonReasonChange = (reason: string) => {
    setStatusModal(prev => ({
      ...prev,
      commonReason: reason,
      reason: reason === "Autre" ? "" : reason
    }))
  }

  const handleReasonChange = (reason: string) => {
    setStatusModal(prev => ({
      ...prev,
      reason,
      commonReason: prev.commonReason === reason ? prev.commonReason : "Autre"
    }))
  }

  const canSubmitStatusUpdate = () => {
    if (!statusModal.selectedStatus) return false
    if (statusModal.selectedStatus === "DELIVERED") return true
    if (statusModal.selectedStatus === "DELAYED") {
      // Delay requires a reason
      return statusModal.reason.trim().length > 0
    }
    return statusModal.reason.trim().length > 0
  }

  const handleSubmitStatusUpdate = async () => {
    if (!order || !statusModal.selectedStatus || !canSubmitStatusUpdate()) return

    try {
      setActionLoading(true)
      const token = await getAuthToken()
      if (!token) throw new Error("Aucun jeton d'authentification trouvé")

      const updateData: UpdateOrderStatusRequest = {
        status: statusModal.selectedStatus,
        ...(statusModal.selectedStatus !== "DELIVERED" && { reason: statusModal.reason.trim() }),
      }

      await apiUpdateOrderStatus(token, order.id, updateData)
      await fetchOrderDetails()
      handleCloseStatusModal()

      // Show appropriate success message
      if (statusModal.selectedStatus === "DELAYED") {
        Alert.alert("Succès", "Retard enregistré. La commande reste en cours de livraison.")
      } else {
        Alert.alert("Succès", `Statut de la commande mis à jour.`)
      }
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de la mise à jour.")
    } finally {
      setActionLoading(false)
    }
  }

  // Note Functions
  const handleOpenNoteModal = () => {
    setNoteModal({
      visible: true,
      content: "",
      isPrivate: false,
      isSubmitting: false,
    })
    setTimeout(() => {
      noteInputRef.current?.focus()
    }, 300)
  }

  const handleCloseNoteModal = () => {
    setNoteModal({
      visible: false,
      content: "",
      isPrivate: false,
      isSubmitting: false,
    })
    Keyboard.dismiss()
  }

  const handleCreateNote = async () => {
    if (!order || !noteModal.content.trim()) return

    try {
      setNoteModal(prev => ({ ...prev, isSubmitting: true }))
      const token = await getAuthToken()
      if (!token) throw new Error("Aucun jeton d'authentification trouvé")

      const noteData: CreateNoteRequest = {
        content: noteModal.content.trim(),
        isPrivate: noteModal.isPrivate,
      }

      const response = await apiCreateOrderNote(token, order.id, noteData)

      // Add new note to the beginning of the list
      const newNote = {
        ...response.note,
        deliveryMan: {
          user: {
            id: response.note.deliveryMan.user.id,
            name: response.note.deliveryMan.user.name,
            image: response.note.deliveryMan.user.image
          }
        }
      }

      setDeliveryNotes(prev => [newNote, ...prev])

      handleCloseNoteModal()
      Alert.alert("Succès", "Note ajoutée avec succès")
    } catch (err) {
      console.error("Create note error:", err)
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'ajout de la note")
    } finally {
      setNoteModal(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!order) return

    Alert.alert(
      "Supprimer la note",
      "Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getAuthToken()
              if (!token) throw new Error("Aucun jeton d'authentification trouvé")

              await apiDeleteOrderNote(token, order.id, noteId)

              // Remove note from the list
              setDeliveryNotes(prev => prev.filter(note => note.id !== noteId))

              Alert.alert("Succès", "Note supprimée avec succès")
            } catch (err) {
              Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de la suppression")
            }
          }
        }
      ]
    )
  }

  const refreshNotes = async () => {
    if (!order) return

    try {
      setIsRefreshingNotes(true)
      const token = await getAuthToken()
      if (!token) throw new Error("Aucun jeton d'authentification trouvé")

      await fetchDeliveryNotes(token, order.id)
    } catch (err) {
      console.error("Error refreshing notes:", err)
    } finally {
      setIsRefreshingNotes(false)
    }
  }

  const formatNoteDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "À l'instant"
      if (diffMins < 60) return `Il y a ${diffMins} min`
      if (diffHours < 24) return `Il y a ${diffHours} h`
      if (diffDays < 7) return `Il y a ${diffDays} j`

      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch (error) {
      return "Date inconnue"
    }
  }

  const isFinalStatus = order ? ["REJECTED", "CANCELLED", "DELIVERED"].includes(order.status) : false
  const canAcceptOrder = order?.status === "ACCEPTED"
  // Can update status if assigned to delivery OR if it's already delayed (to allow more attempts)
  const canUpdateStatus = order?.status === "ASSIGNED_TO_DELIVERY" || order?.status === "DELAYED"

  // In your OrderDetailsScreen component, update the skeleton loading section:
  if (isLoading && isInitialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chargement...</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status Card Skeleton */}
          <View style={[styles.statusCard, { marginBottom: 20 }]}>
            <View style={styles.skeletonHeader}>
              <View style={styles.skeletonIcon} />
              <View>
                <View style={[styles.skeletonText, { width: 150, height: 24, marginBottom: 8 }]} />
                <View style={[styles.skeletonText, { width: 120, height: 20 }]} />
              </View>
            </View>
          </View>

          {/* Order Info Skeleton */}
          <View style={[styles.section, { marginBottom: 20 }]}>
            <View style={{ marginBottom: 16 }}>
              <View style={[styles.skeletonText, { width: 120, height: 20 }]} />
            </View>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonInfoRow}>
                <View style={[styles.skeletonText, { width: 24, height: 24, borderRadius: 12 }]} />
                <View style={[styles.skeletonText, { flex: 1, height: 18, marginLeft: 12 }]} />
              </View>
            ))}
          </View>

          {/* Products Skeleton */}
          <View style={styles.section}>
            <View style={{ marginBottom: 16 }}>
              <View style={[styles.skeletonText, { width: 100, height: 20 }]} />
            </View>
            {[1, 2].map((i) => (
              <View key={i} style={[styles.skeletonProductCard, { marginBottom: 12 }]}>
                <View style={[styles.skeletonImage, { width: 60, height: 60, borderRadius: 8 }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={[styles.skeletonText, { width: '70%', height: 18, marginBottom: 4 }]} />
                  <View style={[styles.skeletonText, { width: '50%', height: 16 }]} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#dc3545" />
          <Text style={styles.errorText}>{error || "Commande introuvable."}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderDetails}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { label: statusLabel, color: statusColor, icon: statusIcon, gradient: statusGradient } = getStatusAppearance(order.status);

  // Notes Section Component
  const NotesSection = () => {
    const getAuthorName = (note: DeliveryNote) => {
      if (note.deliveryMan?.user?.name) {
        return note.deliveryMan.user.name
      }
      return "Livreur"
    }

    const getAuthorImage = (note: DeliveryNote) => {
      return note.deliveryMan?.user?.image || undefined
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Notes</Text>
          <View style={styles.notesHeaderActions}>
            <TouchableOpacity
              onPress={refreshNotes}
              disabled={isRefreshingNotes}
              style={styles.refreshNotesButton}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={isRefreshingNotes ? "#999" : "#0f8fd5"}
              />
            </TouchableOpacity>
            {!isFinalStatus && (
              <TouchableOpacity
                style={styles.addNoteButton}
                onPress={handleOpenNoteModal}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addNoteButtonText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {deliveryNotes.length === 0 ? (
          <View style={styles.emptyNotesContainer}>
            <MaterialCommunityIcons name="note-text-outline" size={40} color="#E0E0E0" />
            <Text style={styles.emptyNotesText}>Aucune note pour cette commande</Text>
            <Text style={styles.emptyNotesSubText}>
              Ajoutez des notes pour garder une trace des détails importants
            </Text>
            {!isFinalStatus && (
              <TouchableOpacity
                style={styles.addFirstNoteButton}
                onPress={handleOpenNoteModal}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addFirstNoteButtonText}>Ajouter une note</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.notesList}>
            {deliveryNotes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteAuthor}>
                    <View style={styles.avatarContainer}>
                      {getAuthorImage(note) ? (
                        <Image
                          source={{ uri: getAuthorImage(note) }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {getAuthorName(note).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.authorInfo}>
                      <Text style={styles.authorName}>{getAuthorName(note)}</Text>
                      <Text style={styles.noteTime}>{formatNoteDate(note.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.noteActions}>
                    {note.isPrivate && (
                      <View style={styles.privateBadge}>
                        <MaterialCommunityIcons
                          name="lock-outline"
                          size={14}
                          color="#FFA500"
                        />
                        <Text style={styles.privateText}>Privée</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteNote(note.id)}
                      style={styles.deleteNoteButton}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.noteContent}>{note.content}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{order.orderCode}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Notes Section at the TOP */}
        <NotesSection />

        <LinearGradient colors={statusGradient} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusColor }]}>
              <MaterialCommunityIcons name={statusIcon} size={32} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.statusCardTitle}>Statut de la commande</Text>
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.statusDate}>Dernière mise à jour : {formatDate(order.updatedAt)}</Text>
        </LinearGradient>

        {/* Historique des tentatives de livraison */}
        {deliveryAttempts.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Historique des tentatives</Text>
              <Text style={styles.attemptCount}>{deliveryAttempts.length} tentative(s)</Text>
            </View>
            {deliveryAttempts.map((attempt, index) => {
              const statusInfo = getAttemptStatusInfo(attempt.status)
              return (
                <View key={attempt.id} style={styles.attemptCard}>
                  <View style={styles.attemptHeader}>
                    <View style={styles.attemptNumberContainer}>
                      <Text style={styles.attemptNumber}>Tentative #{attempt.attemptNumber}</Text>
                    </View>
                    <View style={[styles.attemptStatusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                      <MaterialCommunityIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
                      <Text style={[styles.attemptStatusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.attemptTime}>
                    {formatTime(attempt.attemptedAt)} - {formatDate(attempt.attemptedAt)}
                  </Text>

                  {attempt.reason && (
                    <View style={styles.attemptReasonContainer}>
                      <MaterialCommunityIcons name="message-text-outline" size={16} color="#666" />
                      <Text style={styles.attemptReasonText}>{attempt.reason}</Text>
                    </View>
                  )}

                  {attempt.notes && (
                    <View style={styles.attemptNotesContainer}>
                      <MaterialCommunityIcons name="note-text-outline" size={16} color="#666" />
                      <Text style={styles.attemptNotesText}>{attempt.notes}</Text>
                    </View>
                  )}

                  {index < deliveryAttempts.length - 1 && (
                    <View style={styles.attemptDivider} />
                  )}
                </View>
              )
            })}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Client et Livraison</Text>
            {order.customerPhone && (
              <View style={styles.contactButtonsContainer}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={handleCallCustomer}
                >
                  <MaterialCommunityIcons name="phone-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.contactButtonText}>Appeler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, styles.whatsappButton]}
                  onPress={handleOpenWhatsApp}
                >
                  <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.contactButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoRowVertical}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} color="#0f8fd5" />
            <View>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
          </View>
          <View style={styles.infoRowVertical}>
            <MaterialCommunityIcons name="phone-outline" size={20} color="#0f8fd5" />
            <View>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <TouchableOpacity onPress={handleCallCustomer}>
                <Text style={[styles.infoValue, styles.phoneNumber]}>{order.customerPhone}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoRowVertical}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#0f8fd5" />
            <View>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>
                {order.address}
                {order.city && typeof order.city === 'object' && (order.city as any).name && `, ${(order.city as any).name}`}
                {order.city && typeof order.city === 'string' && `, ${order.city}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contenu de la commande</Text>
          {order.orderItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              {item.product.image && (
                <Image source={{ uri: item.product.image }} style={styles.productImage} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemDetails}>SKU: {item.product.sku || 'N/A'}</Text>
              </View>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
          ))}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total à Payer</Text>
            <Text style={styles.totalPrice}>MAD {order.totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <MaterialCommunityIcons name={order.paymentMethod === 'COD' ? 'cash-multiple' : 'credit-card'} size={18} color="#666" />
            <Text style={styles.paymentMethod}>Paiement {order.paymentMethod === 'COD' ? 'à la livraison' : 'en ligne'}</Text>
          </View>
        </View>

        {order.note && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Instructions</Text>
            <View style={styles.instructionBox}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#0f8fd5" />
              <Text style={styles.instructionText}>{order.note}</Text>
            </View>
          </View>
        )}

        {isFinalStatus && (
          <View style={styles.finalStatusCard}>
            <MaterialCommunityIcons name="check-circle-outline" size={24} color="#28a745" />
            <Text style={styles.finalStatusText}>Cette commande est terminée.</Text>
          </View>
        )}

      </ScrollView>

      {!isFinalStatus && (
        <View style={styles.footer}>
          {canAcceptOrder && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptOrder}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Accepter la livraison</Text>
              )}
            </TouchableOpacity>
          )}
          {canUpdateStatus && (
            <TouchableOpacity
              style={[styles.actionButton, styles.updateStatusButton]}
              onPress={handleOpenStatusModal}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>
                {order.status === "DELAYED" ? "Mettre à jour le statut (Retardée)" : "Mettre à jour le statut"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status Update Modal */}
      <Modal
        visible={statusModal.visible}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.modalScrollContent}
                >
                  <Text style={styles.modalTitle}>Changer le statut</Text>

                  <View style={styles.statusSelector}>
                    {/* Option RETARD */}
                    {/* <TouchableOpacity
                      style={[
                        styles.statusOption,
                        statusModal.selectedStatus === "DELAYED" && styles.statusOptionSelected,
                        styles.delayedOption
                      ]}
                      onPress={() => handleStatusChange("DELAYED")}
                    >
                      <MaterialCommunityIcons
                        name="clock-alert-outline"
                        size={24}
                        color={statusModal.selectedStatus === "DELAYED" ? "#FFA500" : "#666"}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        statusModal.selectedStatus === "DELAYED" && styles.delayedOptionTextSelected
                      ]}>
                        Retard
                      </Text>
                    </TouchableOpacity> */}

                    {/* Option LIVRÉE */}
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        statusModal.selectedStatus === "DELIVERED" && styles.statusOptionSelected,
                        styles.deliveredOption
                      ]}
                      onPress={() => handleStatusChange("DELIVERED")}
                    >
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={24}
                        color={statusModal.selectedStatus === "DELIVERED" ? "#28a745" : "#666"}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        statusModal.selectedStatus === "DELIVERED" && styles.deliveredOptionTextSelected
                      ]}>
                        Livrée
                      </Text>
                    </TouchableOpacity>

                    {/* Option ANNULÉE */}
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        statusModal.selectedStatus === "CANCELLED" && styles.statusOptionSelected,
                        styles.cancelledOption
                      ]}
                      onPress={() => handleStatusChange("CANCELLED")}
                    >
                      <MaterialCommunityIcons
                        name="cancel"
                        size={24}
                        color={statusModal.selectedStatus === "CANCELLED" ? "#dc3545" : "#666"}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        statusModal.selectedStatus === "CANCELLED" && styles.cancelledOptionTextSelected
                      ]}>
                        Annulée
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Message pour le statut RETARD */}
                  {statusModal.selectedStatus === "DELAYED" && (
                    <View style={styles.delayMessage}>
                      <MaterialCommunityIcons name="information-outline" size={18} color="#FFA500" />
                      <Text style={styles.delayMessageText}>
                        La commande reste en cours. Vous pouvez réessayer plus tard.
                      </Text>
                    </View>
                  )}

                  {/* Champ de raison pour RETARD et ANNULÉE */}
                  {statusModal.selectedStatus &&
                    statusModal.selectedStatus !== "DELIVERED" && (
                      <View>
                        <Text style={styles.modalLabel}>
                          Raison {statusModal.selectedStatus === "DELAYED" ? "(pour le retard)" : "(pour l'annulation)"}
                        </Text>
                        <View style={styles.commonReasonsContainer}>
                          {COMMON_REASONS.map((reason) => (
                            <TouchableOpacity
                              key={reason}
                              style={[
                                styles.commonReasonButton,
                                statusModal.commonReason === reason && styles.commonReasonButtonSelected,
                                statusModal.selectedStatus === "DELAYED" && styles.delayReasonButton
                              ]}
                              onPress={() => {
                                handleCommonReasonChange(reason)
                                setTimeout(() => {
                                  reasonInputRef.current?.focus()
                                }, 100)
                              }}
                            >
                              <Text style={[
                                styles.commonReasonText,
                                statusModal.commonReason === reason && styles.commonReasonTextSelected
                              ]}>
                                {reason}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          ref={reasonInputRef}
                          style={[
                            styles.reasonInput,
                            statusModal.selectedStatus === "DELAYED" && styles.delayReasonInput
                          ]}
                          placeholder={
                            statusModal.selectedStatus === "DELAYED"
                              ? "Expliquez pourquoi le client n'est pas disponible..."
                              : "Expliquez pourquoi la commande doit être annulée..."
                          }
                          value={statusModal.reason}
                          onChangeText={handleReasonChange}
                          multiline
                          blurOnSubmit={false}
                          onSubmitEditing={() => {
                            if (canSubmitStatusUpdate()) {
                              handleSubmitStatusUpdate()
                            }
                          }}
                        />
                      </View>
                    )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalButtonCancel} onPress={handleCloseStatusModal}>
                    <Text style={styles.modalButtonTextCancel}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButtonSubmit,
                      (!canSubmitStatusUpdate() || actionLoading) && styles.modalButtonSubmitDisabled,
                      statusModal.selectedStatus === "DELAYED" && styles.delaySubmitButton
                    ]}
                    onPress={handleSubmitStatusUpdate}
                    disabled={!canSubmitStatusUpdate() || actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonTextSubmit}>
                        {statusModal.selectedStatus === "DELAYED" ? "Enregistrer le retard" : "Confirmer"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Note Creation Modal */}
      <Modal
        visible={noteModal.visible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseNoteModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.noteModalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.noteModalOverlay}>
              <View style={styles.noteModalDialog}>
                <View style={styles.noteModalHeader}>
                  <Text style={styles.noteModalTitle}>Ajouter une note</Text>
                  <TouchableOpacity
                    onPress={handleCloseNoteModal}
                    style={styles.noteModalCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.noteModalBody}>
                  <Text style={styles.modalLabel}>Contenu de la note</Text> {/* Add Text component */}
                  <TextInput
                    ref={noteInputRef}
                    style={styles.noteModalInput}
                    placeholder="Écrivez votre note ici... (ex: Client demande une livraison après 18h)"
                    value={noteModal.content}
                    onChangeText={(text) => setNoteModal(prev => ({ ...prev, content: text }))}
                    multiline
                    textAlignVertical="top"
                    maxLength={1000}
                    autoFocus={true}
                  />
                  <Text style={styles.noteModalCharCount}>
                    {noteModal.content.length}/1000 caractères
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.noteModalPrivacyToggle,
                      noteModal.isPrivate && styles.noteModalPrivacyToggleActive
                    ]}
                    onPress={() => setNoteModal(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                  >
                    <MaterialCommunityIcons
                      name={noteModal.isPrivate ? "lock" : "lock-open-outline"}
                      size={20}
                      color={noteModal.isPrivate ? "#FFA500" : "#666"}
                    />
                    <View style={styles.noteModalPrivacyTextContainer}>
                      <Text style={[
                        styles.noteModalPrivacyText,
                        noteModal.isPrivate && styles.noteModalPrivacyTextActive
                      ]}>
                        Note privée
                      </Text>
                      <Text style={styles.noteModalPrivacySubText}>
                        {noteModal.isPrivate
                          ? "Seulement vous pouvez voir cette note"
                          : "Tous les livreurs peuvent voir cette note"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.noteModalFooter}>
                  <TouchableOpacity
                    style={styles.noteModalButtonCancel}
                    onPress={handleCloseNoteModal}
                    disabled={noteModal.isSubmitting}
                  >
                    <Text style={styles.noteModalButtonTextCancel}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.noteModalButtonSubmit,
                      (!noteModal.content.trim() || noteModal.isSubmitting) && styles.noteModalButtonSubmitDisabled
                    ]}
                    onPress={handleCreateNote}
                    disabled={!noteModal.content.trim() || noteModal.isSubmitting}
                  >
                    {noteModal.isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.noteModalButtonTextSubmit}>Enregistrer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "center",
    flex: 1,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
  },
  statusIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  statusCardTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 22,
    fontWeight: "bold",
  },
  statusDate: {
    fontSize: 13,
    color: "#666",
    fontWeight: '500'
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  notesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshNotesButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contactButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    flex: 1,
  },
  attemptCount: {
    fontSize: 14,
    color: "#0f8fd5",
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attemptCard: {
    marginBottom: 16,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attemptNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attemptNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  attemptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 6,
  },
  attemptStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attemptTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  attemptReasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  attemptReasonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  attemptNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7E6',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
    gap: 8,
  },
  attemptNotesText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  attemptDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginTop: 16,
    marginBottom: 16,
  },
  infoRowVertical: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
    gap: 15,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: '600'
  },
  phoneNumber: {
    color: '#0f8fd5',
    textDecorationLine: 'underline',
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 15,
    backgroundColor: "#F0F0F0",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: "#666",
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  totalLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: '600'
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f8fd5",
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 10
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  instructionBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 15,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: "#0f8fd5",
    lineHeight: 20,
  },
  finalStatusCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  finalStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  actionButton: {
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  updateStatusButton: {
    backgroundColor: "#0f8fd5",
    marginTop: 10
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  noteModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  noteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 20,
    textAlign: 'center'
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: "#333",
    marginBottom: 12,
  },
  statusSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    width: '30%',
    gap: 8,
  },
  statusOptionSelected: {
    borderColor: '#0f8fd5',
    backgroundColor: '#E3F2FD'
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  delayedOption: {
    borderColor: '#FFA500',
  },
  delayedOptionTextSelected: {
    color: '#FFA500',
  },
  deliveredOption: {
    borderColor: '#28a745',
  },
  deliveredOptionTextSelected: {
    color: '#28a745',
  },
  cancelledOption: {
    borderColor: '#dc3545',
  },
  cancelledOptionTextSelected: {
    color: '#dc3545',
  },
  delayMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  delayMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '500',
  },
  commonReasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15
  },
  commonReasonButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  commonReasonButtonSelected: {
    backgroundColor: '#0f8fd5',
  },
  delayReasonButton: {
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  commonReasonText: {
    color: '#333',
    fontSize: 13,
  },
  commonReasonTextSelected: {
    color: '#FFFFFF'
  },
  reasonInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 15,
    padding: 15,
    minHeight: 100,
    fontSize: 15,
    textAlignVertical: 'top',
    color: '#1A1A1A'
  },
  delayReasonInput: {
    backgroundColor: '#FFF7E6',
    borderColor: '#FFE4B5',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    alignItems: 'center'
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666'
  },
  modalButtonSubmit: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#0f8fd5',
    alignItems: 'center'
  },
  modalButtonSubmitDisabled: {
    opacity: 0.5,
  },
  delaySubmitButton: {
    backgroundColor: '#FFA500',
  },
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e1e5eb',
    marginRight: 12,
  },
  skeletonText: {
    backgroundColor: '#e1e5eb',
    borderRadius: 4,
  },
  skeletonProgressBar: {
    height: 8,
    backgroundColor: '#e1e5eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skeletonProgressFill: {
    height: '100%',
    backgroundColor: '#c1c9d6',
  },
  skeletonInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  skeletonImage: {
    backgroundColor: '#e1e5eb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: "#dc3545",
    textAlign: "center",
    fontWeight: '600'
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 30,
    paddingVertical: 14,
    backgroundColor: "#0f8fd5",
    borderRadius: 15,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Note Section Styles
  emptyNotesContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyNotesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyNotesSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addFirstNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addFirstNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notesList: {
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: '#0f8fd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  noteTime: {
    fontSize: 12,
    color: '#666',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  privateText: {
    fontSize: 11,
    color: '#FFA500',
    fontWeight: '600',
  },
  deleteNoteButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },

  // Note Modal Styles
  noteModalScroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    fontSize: 16,
    textAlignVertical: 'top',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 20,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  privacyToggleActive: {
    backgroundColor: '#FFF7E6',
    borderColor: '#FFE4B5',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  privacyTextActive: {
    color: '#FFA500',
  },
  privacySubText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  noteModalContainer: {
    flex: 1,
  },
  noteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noteModalDialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  noteModalCloseButton: {
    padding: 4,
  },
  noteModalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  noteModalInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    fontSize: 16,
    textAlignVertical: 'top',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  noteModalCharCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 20,
  },
  noteModalPrivacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  noteModalPrivacyToggleActive: {
    backgroundColor: '#FFF7E6',
    borderColor: '#FFE4B5',
  },
  noteModalPrivacyTextContainer: {
    flex: 1,
  },
  noteModalPrivacyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  noteModalPrivacyTextActive: {
    color: '#FFA500',
  },
  noteModalPrivacySubText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  noteModalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  noteModalButtonCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    alignItems: 'center'
  },
  noteModalButtonSubmit: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#28a745',
    alignItems: 'center'
  },
  noteModalButtonSubmitDisabled: {
    opacity: 0.5,
  },
  noteModalButtonTextCancel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666'
  },
  noteModalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
})

export default OrderDetailsScreen