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
import { useEffect, useState } from "react"
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
} from "react-native"

type StatusUpdateModalState = {
  visible: boolean
  selectedStatus: "REPORTED" | "REJECTED" | "CANCELLED" | "DELIVERED" | null
  reason: string
  commonReason: string
}

const COMMON_REASONS = [
  "Customer not available",
  "Refused",
  "Wrong address",
  "Other",
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
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cachedOrders, setCachedOrders] = useState<Record<number, Order>>({})

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
        throw new Error("No authentication token found")
      }
      if (!Number.isFinite(orderId)) {
        throw new Error("Invalid order ID")
      }
      const response = await apiOrderDetails(token, orderId)
      setOrder(response.order)
      setCachedOrders(prev => ({
        ...prev,
        [orderId]: response.order
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch order details")
      console.error("Error fetching order details:", err)
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
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
      case "DELIVERED":
        return { 
          label: "Livrée", 
          color: "#28a745", 
          icon: "check-circle", 
          gradient: ["#E8F5E9", "#E0F0E3"] as const 
        }
      case "CANCELLED":
      case "REJECTED":
      case "REPORTED":
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

  const handleAcceptOrder = async () => {
    if (!order) return
    try {
      setActionLoading(true)
      const token = await getAuthToken()
      if (!token) throw new Error("No authentication token found")
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
  }

  const handleStatusChange = (status: "REPORTED" | "REJECTED" | "CANCELLED" | "DELIVERED") => {
    setStatusModal(prev => ({ ...prev, selectedStatus: status }))
  }
  
  const handleCommonReasonChange = (reason: string) => {
    setStatusModal(prev => ({ ...prev, commonReason: reason, reason: reason === "Other" ? "" : reason }))
  }
  
  const handleReasonChange = (reason: string) => {
    setStatusModal(prev => ({ ...prev, reason, commonReason: prev.commonReason === reason ? prev.commonReason : "Other" }))
  }

  const canSubmitStatusUpdate = () => {
    if (!statusModal.selectedStatus) return false
    if (statusModal.selectedStatus === "DELIVERED") return true
    return statusModal.reason.trim().length > 0
  }

  const handleSubmitStatusUpdate = async () => {
    if (!order || !statusModal.selectedStatus || !canSubmitStatusUpdate()) return

    try {
      setActionLoading(true)
      const token = await getAuthToken()
      if (!token) throw new Error("No authentication token found")

      const updateData: UpdateOrderStatusRequest = {
        status: statusModal.selectedStatus,
        ...(statusModal.selectedStatus !== "DELIVERED" && { reason: statusModal.reason.trim() }),
      }

      await apiUpdateOrderStatus(token, order.id, updateData)
      await fetchOrderDetails()
      handleCloseStatusModal()
      Alert.alert("Succès", `Statut de la commande mis à jour.`)
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de la mise à jour.")
    } finally {
      setActionLoading(false)
    }
  }

  const isFinalStatus = order ? ["REJECTED", "CANCELLED", "DELIVERED"].includes(order.status) : false
  const canAcceptOrder = order?.status === "ACCEPTED"
  const canUpdateStatus = order?.status === "ASSIGNED_TO_DELIVERY"

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

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptOrder} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionButtonText}>Accepter la livraison</Text>}
              </TouchableOpacity>
            )}
            {canUpdateStatus && (
              <TouchableOpacity style={[styles.actionButton, styles.updateStatusButton]} onPress={handleOpenStatusModal} disabled={actionLoading}>
                 {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionButtonText}>Mettre à jour le statut</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

      <Modal visible={statusModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le statut</Text>
            
            <View style={styles.statusSelector}>
                <TouchableOpacity
                  style={[ styles.statusOption, statusModal.selectedStatus === "DELIVERED" && styles.statusOptionSelected,]}
                  onPress={() => handleStatusChange("DELIVERED")}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={24} color={statusModal.selectedStatus === "DELIVERED" ? "#28a745" : "#666"}/>
                  <Text style={[styles.statusOptionText,statusModal.selectedStatus === "DELIVERED" && styles.statusOptionTextSelected, ]}>Livrée</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[ styles.statusOption, statusModal.selectedStatus === "CANCELLED" && styles.statusOptionSelected,]}
                   onPress={() => handleStatusChange("CANCELLED")}
                >
                  <MaterialCommunityIcons name="cancel" size={24} color={statusModal.selectedStatus === "CANCELLED" ? "#dc3545" : "#666"} />
                  <Text style={[ styles.statusOptionText, statusModal.selectedStatus === "CANCELLED" && styles.statusOptionTextSelected, ]}>Annulée</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[ styles.statusOption, statusModal.selectedStatus === "REPORTED" && styles.statusOptionSelected, ]}
                   onPress={() => handleStatusChange("REPORTED")}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color={statusModal.selectedStatus === "REPORTED" ? "#FFA500" : "#666"}/>
                  <Text style={[ styles.statusOptionText, statusModal.selectedStatus === "REPORTED" && styles.statusOptionTextSelected, ]}>Signalée</Text>
                </TouchableOpacity>
             </View>
            
            {statusModal.selectedStatus && statusModal.selectedStatus !== "DELIVERED" && (
              <View>
                <Text style={styles.modalLabel}>Raison</Text>
                 <View style={styles.commonReasonsContainer}>
                  {COMMON_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[ styles.commonReasonButton, statusModal.commonReason === reason && styles.commonReasonButtonSelected, ]}
                      onPress={() => handleCommonReasonChange(reason)}
                    >
                      <Text style={[ styles.commonReasonText, statusModal.commonReason === reason && styles.commonReasonTextSelected, ]}>{reason}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Expliquez pourquoi..."
                  value={statusModal.reason}
                  onChangeText={handleReasonChange}
                  multiline
                />
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={handleCloseStatusModal}>
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ styles.modalButtonSubmit, (!canSubmitStatusUpdate() || actionLoading) && styles.modalButtonSubmitDisabled, ]}
                onPress={handleSubmitStatusUpdate}
                disabled={!canSubmitStatusUpdate() || actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextSubmit}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 20,
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
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
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
   modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
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
  statusOptionTextSelected: {
    color: '#0f8fd5'
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
  commonReasonText: {
    color: '#333'
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
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
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
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
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