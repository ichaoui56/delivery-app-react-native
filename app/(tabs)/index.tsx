"use client"

import { useAuth } from "@/lib/auth-provider"
import { apiLatestOrders, OrderStatus as ApiOrderStatus, Order } from "@/lib/mobile-auth"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import Svg, { Circle, Path } from "react-native-svg"
import { CustomTopNav } from "./custom-top-nav"

// --- SVG Icons ---
const BellIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
      fill={color}
    />
  </Svg>
)

const RefreshIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
      fill={color}
    />
  </Svg>
)

const SearchIcon = ({ size = 20, color = "#A0A0A0" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z"
      fill={color}
    />
  </Svg>
)

const MapPinIcon = ({ size = 16, color = "#FFFFFF" }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
)

// --- Interfaces ---
type ShipmentStatus = "Tous" | "En attente" | "En cours" | "Livré" | "Annulé" | "Reporté"

// --- Light Theme Colors ---
const LIGHT_COLORS = {
  background: "#F0F4F8",
  text: "#1A1A1A",
  icon: "#808080",
  card: "#FFFFFF",
  border: "#E0E0E0",
  primary: "#0f8fd5",
  secondary: "#F3F4F6",
}

// Helper function to map API status to display status
const mapApiStatusToDisplayStatus = (status: ApiOrderStatus): ShipmentStatus => {
  switch (status) {
    case "PENDING":
    case "ACCEPTED":
      return "En attente"
    case "ASSIGNED_TO_DELIVERY":
      return "En cours"
    case "DELIVERED":
      return "Livré"
    case "CANCELLED":
      return "Annulé"
    case "DELAYED":
      return "Reporté"
    default:
      return "En attente"
  }
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Aujourd\'hui, ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
  } else if (diffDays === 1) {
    return `Hier, ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
  } else {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }
}

// Helper function to get product names from order
const getOrderProductNames = (order: Order): string => {
  const productNames = order.orderItems.map((item) => item.product.name)
  if (productNames.length === 0) return "Commande"
  if (productNames.length === 1) return productNames[0]
  return `${productNames[0]} +${productNames.length - 1} autres`
}

// --- Main Component ---
export default function HomeScreen() {
  const router = useRouter()
  const { user, status, token } = useAuth()
  const styles = createStyles()

  const [activeFilter, setActiveFilter] = useState<ShipmentStatus>("Tous")
  const [searchQuery, setSearchQuery] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstName = user?.name?.split(" ")[0] || "Utilisateur"
  const userCity = (() => {
    const rawCity = user?.deliveryMan?.city
    if (!rawCity) return "Ville inconnue"
    if (typeof rawCity === "string") return rawCity
    if (typeof rawCity === "object" && "name" in rawCity && typeof (rawCity as any).name === "string") {
      return (rawCity as any).name
    }
    return "Ville inconnue"
  })()

  useEffect(() => {
    if (status !== "signedIn" || !token) {
      setOrders([])
      setError(null)
      setLoading(false)
      return
    }

    void fetchOrders()
  }, [status, token])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        setOrders([])
        return
      }

      const response = await apiLatestOrders(token)
      setOrders(response.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
      console.error("Error fetching orders:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError(null)

      if (!token) {
        setOrders([])
        return
      }

      const response = await apiLatestOrders(token)
      setOrders(response.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
      console.error("Error fetching orders:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const displayStatus = mapApiStatusToDisplayStatus(order.status)
    const matchesFilter = activeFilter === "Tous" || displayStatus === activeFilter
    const productNames = getOrderProductNames(order)
    const matchesSearch =
      productNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const renderOrderItem = ({ item }: { item: Order }) => {
    const displayStatus = mapApiStatusToDisplayStatus(item.status)
    const productNames = getOrderProductNames(item)
    const productImage = item.orderItems.length > 0 ? item.orderItems[0].product.image : null

    return (
      <TouchableOpacity style={styles.shipmentItem} onPress={() => router.push(`/order-details/${item.id}`)}>
        <LinearGradient
          colors={
            displayStatus === "Livré"
              ? ["#34C759", "#2C9F4F"]
              : displayStatus === "Annulé"
                ? ["#FF3B30", "#C62828"]
                : ["#FFFFFF", "#F9F9F9"]
          }
          style={styles.shipmentItemGradient}
        >
          <View style={styles.shipmentItemHeader}>
            <View style={styles.shipmentItemHeaderLeft}>
              <Text
                style={[
                  styles.shipmentName,
                  (displayStatus === "Livré" || displayStatus === "Annulé") && styles.shipmentNameLight,
                ]}
                numberOfLines={1}
              >
                {productNames}
              </Text>
              <Text
                style={[
                  styles.shipmentTrackingId,
                  (displayStatus === "Livré" || displayStatus === "Annulé") && styles.shipmentTrackingIdLight,
                ]}
              >
                N°: {item.orderCode}
              </Text>
            </View>
            {productImage && <Image source={{ uri: productImage }} style={styles.productImage} />}
          </View>
          <View style={styles.shipmentItemBody}>
            <Text
              style={[
                styles.shipmentAddress,
                (displayStatus === "Livré" || displayStatus === "Annulé") && styles.shipmentAddressLight,
              ]}
              numberOfLines={1}
            >
              {item.customerName} - {item.address}, {item.city}
            </Text>
          </View>
          <View style={styles.shipmentItemFooter}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    displayStatus === "Livré" || displayStatus === "Annulé" ? "rgba(255,255,255,0.2)" : "#E0E0E0",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      displayStatus === "Livré" || displayStatus === "Annulé"
                        ? "#FFFFFF"
                        : getStatusColor(displayStatus),
                  },
                ]}
              >
                {displayStatus}
              </Text>
            </View>
            <Text
              style={[
                styles.shipmentDate,
                (displayStatus === "Livré" || displayStatus === "Annulé") && styles.shipmentDateLight,
              ]}
            >
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  const getStatusColor = (status: ShipmentStatus): string => {
    switch (status) {
      case "En cours":
        return "#0f8fd5"
      case "En attente":
        return "#FFA500"
      case "Livré":
        return "#4CAF50"
      case "Annulé":
        return "#f44336"
      case "Reporté":
        return "#ff9800"
      default:
        return "#808080"
    }
  }

  const currentShipment = orders.find((o) => mapApiStatusToDisplayStatus(o.status) === "En cours")

  return (
    <SafeAreaView style={styles.container}>
      {/* White background section for user info */}
      <View style={styles.userInfoContainer}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.userTextInfo}>
              <Text style={styles.greeting}>Bonjour, {firstName}</Text>
              <Text style={styles.location}>{userCity}</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing} style={styles.iconButton}>
              {refreshing ? (
                <ActivityIndicator size="small" color={LIGHT_COLORS.primary} />
              ) : (
                <RefreshIcon color={LIGHT_COLORS.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity>
              <BellIcon color={LIGHT_COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <CustomTopNav
          activeTab="home"
          onTabChange={(tab) => {
            if (tab !== "home") {
              // Navigate to the corresponding route
              if (tab === "orders") {
                router.push("/(tabs)/orders");
              } else if (tab === "history") {
                router.push("/(tabs)/history");
              } else if (tab === "settings") {
                router.push("/(tabs)/settings");
              }
            }
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LIGHT_COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des commandes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            <View style={styles.listHeaderContainer}>
              <Text style={styles.sectionTitle}>Livraison en cours</Text>
              {currentShipment ? (
                <TouchableOpacity onPress={() => router.push(`/order-details/${currentShipment.id}`)}>
                  <LinearGradient colors={["#1E3A8A", "#0f8fd5"]} style={styles.creativeCard}>
                    <View style={styles.creativeCardHeader}>
                      <View>
                        <Text style={styles.creativeCardTitle}>{getOrderProductNames(currentShipment)}</Text>
                        <Text style={styles.creativeCardSubtitle}>#{currentShipment.orderCode}</Text>
                      </View>
                      {currentShipment.orderItems.length > 0 &&
                        currentShipment.orderItems[0].product.image && (
                          <Image
                            source={{ uri: currentShipment.orderItems[0].product.image }}
                            style={styles.creativeCardImage}
                          />
                        )}
                    </View>
                    <View style={styles.creativeCardBody}>
                      <Text style={styles.creativeCardCustomer}>{currentShipment.customerName}</Text>
                      <View style={styles.creativeCardLocation}>
                        <MapPinIcon color="#FFFFFF" />
                        <Text style={styles.creativeCardAddress} numberOfLines={1}>
                          {currentShipment.address}, {currentShipment.city}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.creativeCardFooter}>
                      <Text style={styles.creativeCardStatus}>En Cours de Livraison</Text>
                      <View style={styles.arrowButton}>
                        <Text style={styles.arrowIconWhite}>{">"}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.noShipmentCard}>
                  <Text style={styles.noShipmentText}>Aucune livraison en cours</Text>
                </View>
              )}

              <View style={styles.recentShipmentHeader}>
                <Text style={styles.sectionTitle}>Livraisons récentes</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
                  <Text style={styles.viewMore}>Voir plus</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchBar}>
                <SearchIcon color={LIGHT_COLORS.icon} />
                <TextInput
                  placeholder="Rechercher une commande..."
                  placeholderTextColor={LIGHT_COLORS.icon}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                {(["Tous", "En attente", "En cours", "Livré", "Annulé", "Reporté"] as ShipmentStatus[]).map(
                  (status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterButton, activeFilter === status && styles.activeFilterButton]}
                      onPress={() => setActiveFilter(status)}
                    >
                      <Text style={[styles.filterText, activeFilter === status && styles.activeFilterText]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </View>
          }
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune livraison trouvée</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  )
}

// --- Styles ---
const createStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: LIGHT_COLORS.background,
    },
    userInfoContainer: {
      backgroundColor: "#FFFFFF",
      paddingTop: 30, // Added top padding
      paddingBottom: 10,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 15,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    userTextInfo: {
      marginLeft: 15,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    avatarPlaceholder: {
      backgroundColor: LIGHT_COLORS.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "bold",
    },
    greeting: {
      color: LIGHT_COLORS.text,
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 2,
    },
    location: {
      color: LIGHT_COLORS.icon,
      fontSize: 14,
    },
    headerIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    iconButton: {
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    listHeaderContainer: {
      paddingHorizontal: 20,
      paddingBottom: 10,
      paddingTop: 10,
    },
    sectionTitle: {
      color: LIGHT_COLORS.text,
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
    },

    creativeCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    creativeCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 15,
    },
    creativeCardTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "bold",
      maxWidth: "80%",
    },
    creativeCardSubtitle: {
      color: "#FFFFFF",
      fontSize: 14,
      opacity: 0.8,
      marginTop: 4,
    },
    creativeCardImage: {
      width: 60,
      height: 60,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.5)",
    },
    creativeCardBody: {
      marginBottom: 20,
    },
    creativeCardCustomer: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 8,
    },
    creativeCardLocation: {
      flexDirection: "row",
      alignItems: "center",
    },
    creativeCardAddress: {
      color: "#FFFFFF",
      fontSize: 14,
      marginLeft: 8,
      flex: 1,
    },
    creativeCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    creativeCardStatus: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
      overflow: "hidden",
    },
    arrowButton: {
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: "center",
      alignItems: "center",
    },
    arrowIconWhite: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
    },
    recentShipmentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    viewMore: {
      color: "#0f8fd5",
      fontSize: 14,
      fontWeight: "600",
    },
    searchBar: {
      flexDirection: "row",
      backgroundColor: LIGHT_COLORS.card,
      borderRadius: 15,
      paddingHorizontal: 15,
      alignItems: "center",
      marginTop: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: LIGHT_COLORS.border,
    },
    searchInput: {
      flex: 1,
      color: LIGHT_COLORS.text,
      marginLeft: 10,
      height: 50,
      fontSize: 16,
    },
    filterContainer: {
      marginTop: 10,
      marginBottom: 10,
    },
    filterButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 10,
      backgroundColor: LIGHT_COLORS.card,
      borderWidth: 1,
      borderColor: LIGHT_COLORS.border,
    },
    activeFilterButton: {
      backgroundColor: "#0f8fd5",
      borderColor: "#0f8fd5",
    },
    filterText: {
      color: LIGHT_COLORS.text,
      fontWeight: "600",
      fontSize: 14,
    },
    activeFilterText: {
      color: "#FFFFFF",
      fontWeight: "bold",
    },
    shipmentItem: {
      marginHorizontal: 20,
      marginBottom: 15,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    shipmentItemGradient: {
      borderRadius: 20,
      padding: 15,
    },
    shipmentItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    shipmentItemHeaderLeft: {
      flex: 1,
      marginRight: 10,
    },
    shipmentName: {
      color: LIGHT_COLORS.text,
      fontSize: 16,
      fontWeight: "bold",
    },
    shipmentNameLight: {
      color: "#FFFFFF",
    },
    shipmentTrackingId: {
      color: LIGHT_COLORS.icon,
      fontSize: 13,
      marginTop: 2,
    },
    shipmentTrackingIdLight: {
      color: "rgba(255,255,255,0.8)",
    },
    productImage: {
      width: 45,
      height: 45,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
    },
    shipmentItemBody: {
      marginBottom: 10,
    },
    shipmentAddress: {
      color: LIGHT_COLORS.text,
      fontSize: 14,
    },
    shipmentAddressLight: {
      color: "rgba(255,255,255,0.9)",
    },
    shipmentItemFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 5,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 15,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "bold",
    },
    shipmentDate: {
      color: LIGHT_COLORS.icon,
      fontSize: 12,
      fontWeight: "500",
    },
    shipmentDateLight: {
      color: "rgba(255,255,255,0.8)",
    },
    noShipmentCard: {
      backgroundColor: LIGHT_COLORS.card,
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 120,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: LIGHT_COLORS.border,
    },
    noShipmentText: {
      color: LIGHT_COLORS.icon,
      fontSize: 16,
      textAlign: "center",
    },
    emptyContainer: {
      padding: 20,
      alignItems: "center",
      marginTop: 50,
    },
    emptyText: {
      color: LIGHT_COLORS.icon,
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 10,
      color: LIGHT_COLORS.icon,
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    errorText: {
      color: "#FF0000",
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: LIGHT_COLORS.primary,
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: 20,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
    },
  })
}
