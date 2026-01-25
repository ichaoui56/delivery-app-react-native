"use client"

import { useAuth } from "@/lib/auth-provider"
import { apiFinanceData, CODOrder, DeliveredOrder, FinanceData, MoneyTransfer } from "@/lib/mobile-auth"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image as RNImage,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Svg, { Path } from "react-native-svg"
import { CustomTopNav } from "./custom-top-nav"

const { width } = Dimensions.get("window")

// --- Light Theme Colors ---
const LIGHT_COLORS = {
  background: "#F8FAFC",
  text: "#1A1A1A",
  icon: "#64748B",
  card: "#FFFFFF",
  border: "#E2E8F0",
  primary: "#0f8fd5",
  primaryLight: "#E1F0FA",
  secondary: "#F1F5F9",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  successLight: "#D1FAE5",
  warningLight: "#FEF3C7",
  errorLight: "#FEE2E2",
  primaryText: "#0C4A6E",
}

// --- SVG Icons ---
const WalletIcon = ({ size = 24, color = "#000000" }) => (
  <Ionicons name="wallet" size={size} color={color} />
)

const TrendingUpIcon = ({ size = 24, color = "#000000" }) => (
  <Ionicons name="trending-up" size={size} color={color} />
)

const CashIcon = ({ size = 24, color = "#000000" }) => (
  <Ionicons name="cash" size={size} color={color} />
)

const StatsIcon = ({ size = 24, color = "#000000" }) => (
  <Ionicons name="stats-chart" size={size} color={color} />
)

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

// --- Skeleton Loading Component ---
const SkeletonCard = ({ height = 80, width = "100%" }: { height?: number; width?: number | string }) => (
  <View style={[styles.skeletonCard, { height, width: typeof width === 'number' ? width : undefined }]}>
    <View style={styles.skeletonAnimation} />
  </View>
)

const FinanceSkeleton = () => (
  <SafeAreaView style={styles.container}>
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Header Skeleton */}
      <View style={styles.userInfoContainer}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, styles.avatarPlaceholder, styles.skeletonAvatar]} />
            <View style={styles.userTextInfo}>
              <SkeletonCard height={20} width={120} />
              <SkeletonCard height={14} width={80} />
            </View>
          </View>
          <View style={styles.headerIcons}>
            <SkeletonCard height={24} width={24} />
            <SkeletonCard height={24} width={24} />
          </View>
        </View>
        <View style={styles.tabNavContainer}>
          <SkeletonCard height={50} />
        </View>
      </View>

      {/* Status Cards Skeleton */}
      <View style={styles.statusCardsContainer}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.skeletonStatusCard}>
            <View style={styles.skeletonStatusContent}>
              <SkeletonCard height={24} width={24} />
              <SkeletonCard height={20} width="70%" />
              <SkeletonCard height={14} width="50%" />
            </View>
          </View>
        ))}
      </View>

      {/* Statistics Skeleton */}
      <View style={styles.sectionContainer}>
        <SkeletonCard height={24} width={120} />
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.skeletonStatCard}>
              <View style={styles.skeletonStatContent}>
                <SkeletonCard height={30} width={30} />
                <SkeletonCard height={18} width="80%" />
                <SkeletonCard height={14} width="60%" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
)

// --- Main Finance Screen ---
export default function FinanceScreen() {
  const { status, token, user } = useAuth()
  const router = useRouter()
  const [financeData, setFinanceData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract user info for header
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

  const fetchFinanceData = async () => {
    try {
      setError(null)
      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await apiFinanceData(token)
      if (response.success) {
        setFinanceData(response.data)
      } else {
        throw new Error("Failed to fetch finance data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch finance data")
      console.error("Error fetching finance data:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status !== "signedIn" || !token) {
      setLoading(false)
      return
    }

    fetchFinanceData()
  }, [status, token])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchFinanceData()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non livré"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} MAD`
  }

  const StatusCard = ({ icon, title, value, color, trend }: {
    icon: React.ReactNode
    title: string
    value: string
    color: string
    trend?: number
  }) => (
    <LinearGradient 
      colors={[color, color + "DD"]} 
      style={styles.statusCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.statusCardHeader}>
        <View style={styles.statusIcon}>
          {icon}
        </View>
        {trend !== undefined && (
          <View style={[styles.trendBadge, trend > 0 ? styles.trendUp : styles.trendDown]}>
            <Ionicons 
              name={trend > 0 ? "trending-up" : "trending-down"} 
              size={10} 
              color="#FFFFFF" 
            />
            <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </LinearGradient>
  )

  const StatCard = ({ icon, label, value, iconColor, bgColor }: {
    icon: React.ReactNode
    label: string
    value: string | number
    iconColor: string
    bgColor: string
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
          {icon}
        </View>
        <Text style={styles.statValue} numberOfLines={1}>
          {typeof value === 'number' && !Number.isInteger(value) ? formatCurrency(value) : value}
        </Text>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  )

  const OrderCard = ({ order, type }: { order: CODOrder | DeliveredOrder, type: "cod" | "delivered" }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderCode}>{order.orderCode}</Text>
          <Text style={styles.orderDate}>
            {formatDate(order.deliveredAt)}
          </Text>
        </View>
        <View style={styles.orderAmount}>
          <Text style={styles.orderPrice}>{formatCurrency(order.totalPrice)}</Text>
          <View style={[
            styles.paymentBadge,
            type === "cod" ? styles.codBadge : styles.prepaidBadge
          ]}>
            <Text style={styles.paymentBadgeText}>
              {type === "cod" ? "COD" : "Prépayé"}
            </Text>
          </View>
        </View>
      </View>
      {'customerName' in order && (
        <View style={styles.orderDetails}>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <Text style={styles.customerAddress}>{order.address}</Text>
          <Text style={styles.merchantName}>{order.merchantName}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const TransferCard = ({ transfer }: { transfer: MoneyTransfer }) => (
    <View style={styles.transferCard}>
      <View style={styles.transferHeader}>
        <View style={styles.transferIcon}>
          <Ionicons name="swap-vertical" size={20} color={LIGHT_COLORS.primary} />
        </View>
        <View style={styles.transferInfo}>
          <Text style={styles.transferAmount}>{formatCurrency(transfer.amount)}</Text>
          <Text style={styles.transferDate}>
            {formatDate(transfer.transferDate)}
          </Text>
        </View>
      </View>
      <Text style={styles.transferNote}>{transfer.note}</Text>
    </View>
  )

  if (loading) {
    return <FinanceSkeleton />
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={LIGHT_COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFinanceData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* White background section for user info */}
      <View style={styles.userInfoContainer}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {user?.image ? (
              <RNImage source={{ uri: user.image }} style={styles.avatar} />
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

        <View style={styles.tabNavContainer}>
          <CustomTopNav
            activeTab="finance"
            onTabChange={(tab: string) => {
              if (tab !== "finance") {
                switch (tab) {
                  case "home":
                    router.push("/(tabs)");
                    break;
                  case "orders":
                    router.push("/(tabs)/orders");
                    break;
                  case "history":
                    router.push("/(tabs)/history");
                    break;
                  case "settings":
                    router.push("/(tabs)/settings");
                    break;
                }
              }
            }}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={LIGHT_COLORS.primary}
            colors={[LIGHT_COLORS.primary]}
          />
        }
      >
        {financeData && (
          <>
            {/* Status Cards */}
            <View style={styles.statusCardsContainer}>
              <StatusCard
                icon={<CashIcon size={20} color="#FFFFFF" />}
                title="Solde Disponible"
                value={formatCurrency(financeData.currentStatus.availableBalance)}
                color={LIGHT_COLORS.success}
              />
              <StatusCard
                icon={<TrendingUpIcon size={20} color="#FFFFFF" />}
                title="Gains Totaux"
                value={formatCurrency(financeData.currentStatus.totalEarned)}
                color={LIGHT_COLORS.primary}
              />
              <StatusCard
                icon={<WalletIcon size={20} color="#FFFFFF" />}
                title="COD Collecté"
                value={formatCurrency(financeData.currentStatus.collectedCOD)}
                color={LIGHT_COLORS.warning}
              />
              <StatusCard
                icon={<StatsIcon size={20} color="#FFFFFF" />}
                title="Gains En Attente"
                value={formatCurrency(financeData.currentStatus.pendingEarnings)}
                color={LIGHT_COLORS.error}
              />
            </View>

            {/* Statistics */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Statistiques</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  icon={<Ionicons name="cube" size={20} color={LIGHT_COLORS.primary} />}
                  label="Total Livraisons"
                  value={financeData.statistics.totalDeliveries}
                  iconColor={LIGHT_COLORS.primary}
                  bgColor={LIGHT_COLORS.primaryLight}
                />
                <StatCard
                  icon={<Ionicons name="checkmark-circle" size={20} color={LIGHT_COLORS.success} />}
                  label="Livraisons Réussies"
                  value={financeData.statistics.successfulDeliveries}
                  iconColor={LIGHT_COLORS.success}
                  bgColor={LIGHT_COLORS.successLight}
                />
                <StatCard
                  icon={<Ionicons name="cash" size={20} color={LIGHT_COLORS.warning} />}
                  label="Commandes COD"
                  value={financeData.statistics.codOrdersCount}
                  iconColor={LIGHT_COLORS.warning}
                  bgColor={LIGHT_COLORS.warningLight}
                />
                <StatCard
                  icon={<Ionicons name="wallet" size={20} color={LIGHT_COLORS.primary} />}
                  label="Montant Total COD"
                  value={financeData.statistics.totalCODAmount}
                  iconColor={LIGHT_COLORS.primary}
                  bgColor={LIGHT_COLORS.primaryLight}
                />
                <StatCard
                  icon={<Ionicons name="trending-up" size={20} color={LIGHT_COLORS.success} />}
                  label="Gains des Commandes"
                  value={financeData.statistics.totalEarningsFromOrders}
                  iconColor={LIGHT_COLORS.success}
                  bgColor={LIGHT_COLORS.successLight}
                />
                <StatCard
                  icon={<Ionicons name="swap-horizontal" size={20} color={LIGHT_COLORS.error} />}
                  label="Total Transféré"
                  value={financeData.statistics.totalTransferred}
                  iconColor={LIGHT_COLORS.error}
                  bgColor={LIGHT_COLORS.errorLight}
                />
              </View>
            </View>

            {/* Money Transfers */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transferts d'Argent</Text>
                {financeData.moneyTransfers.length > 3 && (
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>Voir tout</Text>
                  </TouchableOpacity>
                )}
              </View>
              {financeData.moneyTransfers.length > 0 ? (
                financeData.moneyTransfers.slice(0, 3).map((transfer) => (
                  <TransferCard key={transfer.id} transfer={transfer} />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="swap-horizontal-outline" size={48} color={LIGHT_COLORS.icon} />
                  <Text style={styles.emptyText}>Aucun transfert récent</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_COLORS.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: LIGHT_COLORS.background,
  },
  userInfoContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 30,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  tabNavContainer: {
    paddingHorizontal: 10,
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
  statusCardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
    marginTop: 10,
  },
  statusCard: {
    width: (width - 56) / 2,
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skeletonStatusCard: {
    width: (width - 56) / 2,
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 20,
    padding: 20,
  },
  skeletonStatusContent: {
    alignItems: "center",
    gap: 8,
  },
  statusCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendUp: {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
  trendDown: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  trendText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 2,
  },
  statusValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: LIGHT_COLORS.text,
    fontSize: 20,
    fontWeight: "bold",
  },
  seeAllText: {
    color: LIGHT_COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  statCard: {
    width: (width - 56) / 3,
  },
  skeletonStatCard: {
    width: (width - 56) / 3,
  },
  statCardContent: {
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonStatContent: {
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    color: LIGHT_COLORS.primaryText,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  statLabel: {
    color: LIGHT_COLORS.icon,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 16,
  },
  orderCard: {
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  orderCode: {
    color: LIGHT_COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  orderDate: {
    color: LIGHT_COLORS.icon,
    fontSize: 12,
    marginTop: 2,
  },
  orderAmount: {
    alignItems: "flex-end",
  },
  orderPrice: {
    color: LIGHT_COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  codBadge: {
    backgroundColor: LIGHT_COLORS.warning,
  },
  prepaidBadge: {
    backgroundColor: LIGHT_COLORS.success,
  },
  paymentBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: LIGHT_COLORS.border,
    paddingTop: 10,
  },
  customerName: {
    color: LIGHT_COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  customerAddress: {
    color: LIGHT_COLORS.icon,
    fontSize: 12,
    marginBottom: 2,
  },
  merchantName: {
    color: LIGHT_COLORS.icon,
    fontSize: 12,
  },
  transferCard: {
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transferHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  transferIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  transferInfo: {
    flex: 1,
  },
  transferAmount: {
    color: LIGHT_COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  transferDate: {
    color: LIGHT_COLORS.icon,
    fontSize: 12,
    marginTop: 2,
  },
  transferNote: {
    color: LIGHT_COLORS.icon,
    fontSize: 13,
    fontStyle: "italic",
  },
  emptyContainer: {
    backgroundColor: LIGHT_COLORS.card,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: LIGHT_COLORS.icon,
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    color: LIGHT_COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: LIGHT_COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: LIGHT_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Skeleton styles
  skeletonCard: {
    backgroundColor: LIGHT_COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  skeletonAnimation: {
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
})