"use client"

import {
    apiAcceptOrder,
    apiOrderDetails,
    apiUpdateOrderStatus,
    getAuthToken,
    Order,
    OrderStatus,
    UpdateOrderStatusRequest,
} from "@/lib/mobile-auth"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState, useRef } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native"

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
  const [statusModal, setStatusModal] = useState<StatusUpdateModalState>({
    visible: false,
    selectedStatus: null,
    reason: "",
    commonReason: "",
  })
  const [order, setOrder] = useState<Order | null>(null)
  const [deliveryAttempts, setDeliveryAttempts] = useState<DeliveryAttempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cachedOrders, setCachedOrders] = useState<Record<number, Order>>({})
  
  // Refs for keyboard handling
  const scrollViewRef = useRef<ScrollView>(null)
  const reasonInputRef = useRef<TextInput>(null)

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
      const response = await apiOrderDetails(token, orderId)
      setOrder(response.order)
      
      // Fetch delivery attempts
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

  const getApiBaseUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL
    if (envUrl) return envUrl.replace(/\/$/, "")
    return "https://dash.sonixpress.ma"
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

  const isFinalStatus = order ? ["REJECTED", "CANCELLED", "DELIVERED"].includes(order.status) : false
  const canAcceptOrder = order?.status === "ACCEPTED"
  // Can update status if assigned to delivery OR if it's already delayed (to allow more attempts)
  const canUpdateStatus = order?.status === "ASSIGNED_TO_DELIVERY" || order?.status === "DELAYED"

  if (isLoading && isInitialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header Skeleton */}
          <View style={[styles.header, { marginBottom: 20 }]}>
            <View style={styles.skeletonHeader}>
              <View style={styles.skeletonIcon} />
              <View>
                <View style={[styles.skeletonText, { width: 150, height: 24, marginBottom: 8 }]} />
                <View style={[styles.skeletonText, { width: 120, height: 20 }]} />
              </View>
            </View>
          </View>

          {/* Status Card Skeleton */}
          <View style={[styles.statusCard, { marginBottom: 20 }]}>
            <View style={[styles.skeletonText, { width: '70%', height: 22, marginBottom: 16 }]} />
            <View style={styles.skeletonProgressBar}>
              <View style={[styles.skeletonProgressFill, { width: '60%' }]} />
            </View>
            <View style={[styles.skeletonText, { width: '50%', height: 18, marginTop: 12 }]} />
          </View>

          {/* Order Info Skeleton */}
          <View style={[styles.section, { marginBottom: 20 }]}>
            <View style={[styles.skeletonText, { width: 120, height: 20, marginBottom: 16 }]} />
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonInfoRow}>
                <View style={[styles.skeletonText, { width: 24, height: 24, borderRadius: 12 }]} />
                <View style={[styles.skeletonText, { flex: 1, height: 18, marginLeft: 12 }]} />
              </View>
            ))}
          </View>

          {/* Products Skeleton */}
          <View style={styles.section}>
            <View style={[styles.skeletonText, { width: 100, height: 20, marginBottom: 16 }]} />
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
          <Text style={styles.cardTitle}>Client et Livraison</Text>
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
              <Text style={styles.infoValue}>{order.customerPhone}</Text>
            </View>
          </View>
          <View style={styles.infoRowVertical}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#0f8fd5" />
            <View>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{order.address}, {order.city}</Text>
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
                    <TouchableOpacity
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
                    </TouchableOpacity>

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
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
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
})

export default OrderDetailsScreen