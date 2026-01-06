"use client"

import { useAuth } from "@/lib/auth-provider"
import { apiAllOrders, type Order, type OrderStatus } from "@/lib/mobile-auth"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"

type FilterStatus = "all" | OrderStatus

const OrdersScreen = () => {
  const router = useRouter()
  const { token } = useAuth()

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        // Simulate loading for better UX
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const res = await apiAllOrders(token)
        if (mounted) setOrders(res.orders || [])
      } catch (e) {
        console.error("Failed to fetch orders:", e)
        if (mounted) setOrders([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [token])

  const filteredOrders = useMemo(() => {
    let filtered = orders
    if (filterStatus !== "all") {
      filtered = filtered.filter((order) => order.status === filterStatus)
    }
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.orderCode.toLowerCase().includes(lowercasedQuery) ||
          order.customerName.toLowerCase().includes(lowercasedQuery) ||
          order.city.toLowerCase().includes(lowercasedQuery) ||
          (order.merchant?.companyName || "").toLowerCase().includes(lowercasedQuery)
      )
    }
    return filtered
  }, [orders, filterStatus, searchQuery])

  const getStatusLabel = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, string> = {
      PENDING: "En attente",
      ACCEPTED: "Acceptée",
      ASSIGNED_TO_DELIVERY: "Assignée",
      DELIVERED: "Livrée",
      CANCELLED: "Annulée",
      DELAY: "Signalée",
      REJECTED: "Rejetée",
    }
    return statusMap[status] || status
  }

  const getStatusAppearance = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return { color: "#FFA500", icon: "clock-outline", bgColor: "#FFF7E6" }
      case "ACCEPTED":
      case "ASSIGNED_TO_DELIVERY":
        return { color: "#0f8fd5", icon: "truck-fast", bgColor: "#E3F2FD" }
      case "DELIVERED":
        return { color: "#28a745", icon: "check-circle", bgColor: "#E8F5E9" }
      case "CANCELLED":
      case "REJECTED":
      case "DELAY":
        return { color: "#dc3545", icon: "close-circle", bgColor: "#FDEDED" }
      default:
        return { color: "#666", icon: "help-circle", bgColor: "#F0F0F0" }
    }
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const { color, icon, bgColor } = getStatusAppearance(order.status)
    const productNames = order.orderItems.map((item) => item.product.name).join(", ")
    const productImage = order.orderItems.length > 0 ? order.orderItems[0].product.image : null

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order-details/${order.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.orderCardHeader}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <MaterialCommunityIcons name="cube-outline" size={24} color="#999" />
            </View>
          )}
          <View style={styles.orderCardTitle}>
            <Text style={styles.orderCardProductName} numberOfLines={1}>
              {productNames || "Commande"}
            </Text>
            <Text style={styles.orderCardId}>{order.orderCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <MaterialCommunityIcons name={icon as any} size={14} color={color} />
            <Text style={[styles.statusText, { color }]}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>

        <View style={styles.orderCardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-circle-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {order.address}, {order.city}
            </Text>
          </View>
        </View>

        <View style={styles.orderCardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total:</Text>
            <Text style={styles.price}>{order.totalPrice.toFixed(2)} MAD</Text>
          </View>
          <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString("fr-FR")}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonTitleContainer}>
          <View style={styles.skeletonLineLg} />
          <View style={styles.skeletonLineSm} />
        </View>
      </View>
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLineMd} />
        <View style={styles.skeletonLineMd} />
      </View>
      <View style={styles.skeletonFooter}>
        <View style={styles.skeletonLineSm} />
        <View style={styles.skeletonLineSm} />
      </View>
    </View>
  )

  const ListHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Toutes les commandes</Text>
        <Text style={styles.headerSubtitle}>Suivez et gérez vos commandes</Text>
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
        <TextInput
          placeholder="Rechercher par #, client, ville..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {(["all", "PENDING", "ASSIGNED_TO_DELIVERY", "DELIVERED", "CANCELLED"] as FilterStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>
              {status === "all" ? "Toutes" : getStatusLabel(status as OrderStatus)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  )

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <>
          <ListHeader />
          <ScrollView contentContainerStyle={styles.ordersGrid}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
        </>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <OrderCard order={item} />}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant-closed" size={60} color="#D0D0D0" />
              <Text style={styles.emptyStateText}>Aucune commande trouvée</Text>
              <Text style={styles.emptyStateSubText}>Essayez d'ajuster vos filtres ou votre recherche.</Text>
            </View>
          }
          contentContainerStyle={styles.ordersGrid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 15,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: "#1A1A1A",
    marginLeft: 10,
    height: 50,
    fontSize: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  filterButtonActive: {
    backgroundColor: "#0f8fd5",
    borderColor: "#0f8fd5",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  ordersGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  orderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  orderCardTitle: {
    flex: 1,
  },
  orderCardProductName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  orderCardId: {
    fontSize: 12,
    color: "#0f8fd5",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  orderCardBody: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
  },
  orderCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  priceLabel: {
    fontSize: 13,
    color: "#666",
  },
  price: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  orderDate: {
    fontSize: 12,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 15,
    textAlign: "center",
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
    textAlign: "center",
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#E9ECEF",
  },
  skeletonTitleContainer: {
    flex: 1,
  },
  skeletonLineLg: {
    height: 16,
    width: "70%",
    marginBottom: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
  },
  skeletonLineMd: {
    height: 14,
    width: "90%",
    marginBottom: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
  },
  skeletonLineSm: {
    height: 12,
    width: "50%",
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
  },
  skeletonBody: {
    marginBottom: 12,
    paddingLeft: 4,
    gap: 4,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
})

export default OrdersScreen
