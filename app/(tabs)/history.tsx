"use client"

import { useAuth } from "@/lib/auth-provider"
import {
  apiOrderHistory,
  apiOrderStats,
  HistoryOrderStatus,
  OrderHistory,
  OrderStatsResponse
} from "@/lib/mobile-auth"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { useRouter } from "expo-router"
import { CustomTopNav } from "./custom-top-nav"

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Define the filter types - frontend filters
type FilterStatus = "All" | "Delivered" | "Cancelled" | "Delayed" | "PENDING" | "DELIVERED" | "CANCELLED" | "DELAYED"

const HistoryScreen = () => {
  const router = useRouter()
  const { user, token } = useAuth()
  const [filter, setFilter] = useState<FilterStatus>("All")
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderHistory[]>([])
  const [stats, setStats] = useState<OrderStatsResponse['stats'] | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const take = 10

  const scrollY = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  const firstName = user?.name?.split(" ")[0] || "Utilisateur"
  const userCity = user?.deliveryMan?.city || "Ville inconnue"

  // Map frontend filter labels to backend status values
  const getBackendStatus = (filter: FilterStatus): HistoryOrderStatus | undefined => {
    switch (filter) {
      case "Delivered":
      case "DELIVERED":
        return "DELIVERED"
      case "Cancelled":
      case "CANCELLED":
        return "CANCELLED"
      case "Delayed":
      case "DELAYED":
        return "DELAYED"
      case "PENDING":
        return "PENDING"
      case "All":
      default:
        return undefined
    }
  }

  // Load stats once on initial mount
  useEffect(() => {
    const loadStats = async () => {
      if (!token) return
      
      try {
        console.log('Loading stats...')
        const statsResponse = await apiOrderStats(token)
        console.log('Stats loaded:', statsResponse)
        setStats(statsResponse.stats)
      } catch (error: any) {
        console.error("Error loading stats:", error)
      }
    }
    
    loadStats()
  }, [token])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start()
  }, [])

  const loadData = useCallback(async (isRefresh = false, currentFilter?: FilterStatus) => {
    if (!token) {
      console.log('No token available')
      return
    }

    try {
      const filterToUse = currentFilter !== undefined ? currentFilter : filter
      console.log('Loading data, isRefresh:', isRefresh, 'filter:', filterToUse)
      
      if (isRefresh) {
        setRefreshing(true)
      } else if (!isRefresh && orders.length === 0) {
        setLoading(true)
      }

      // Get the backend status from current filter
      const backendStatus = getBackendStatus(filterToUse)
      const currentSkip = isRefresh ? 0 : skip
      
      console.log('Loading history with status:', {
        frontendFilter: filterToUse,
        backendStatus: backendStatus,
        take,
        skip: currentSkip
      })
      
      const historyResponse = await apiOrderHistory(token, {
        status: backendStatus,
        take,
        skip: currentSkip
      })
      
      console.log('History response:', {
        ordersCount: historyResponse.orders.length,
        hasMore: historyResponse.hasMore,
        totalCount: historyResponse.totalCount,
        firstOrderStatus: historyResponse.orders[0]?.status
      })

      if (isRefresh || currentSkip === 0) {
        setOrders(historyResponse.orders)
        setSkip(historyResponse.orders.length)
      } else {
        setOrders(prev => [...prev, ...historyResponse.orders])
        setSkip(prev => prev + historyResponse.orders.length)
      }

      setHasMore(historyResponse.hasMore)
      
      console.log('Data loaded successfully')
      
    } catch (error: any) {
      console.error("Error loading data:", error)
      Alert.alert(
        "Erreur",
        error.message || "Impossible de charger l'historique",
        [{ text: "OK" }]
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
      setFilterLoading(false)
    }
  }, [token, filter, skip, orders.length])

  // Initial load
  useEffect(() => {
    console.log('Initial load effect triggered')
    if (token) {
      loadData()
    }
  }, [token])

  const onRefresh = () => {
    console.log('Pull to refresh triggered')
    setSkip(0)
    loadData(true)
  }

  const loadMore = () => {
    if (!loadingMore && hasMore && !filterLoading) {
      console.log('Loading more orders...')
      setLoadingMore(true)
      loadData()
    }
  }

  const handleFilterChange = (newFilter: FilterStatus) => {
    console.log('Filter changed to:', newFilter)
    setFilter(newFilter)
    setSkip(0)
    setOrders([])
    setHasMore(true)
    setFilterLoading(true)
    
    // Load data immediately with the new filter
    setTimeout(() => {
      loadData(true, newFilter)
    }, 100)
  }

  const getStatusStyle = (status: HistoryOrderStatus) => {
    switch (status) {
      case "DELIVERED":
        return { 
          backgroundColor: "rgba(76, 175, 80, 0.1)", 
          color: "#4CAF50",
          iconColor: "#4CAF50",
          icon: "check-circle" 
        }
      case "CANCELLED":
      case "REJECTED":
        return { 
          backgroundColor: "rgba(244, 67, 54, 0.1)", 
          color: "#F44336",
          iconColor: "#F44336",
          icon: "cancel" 
        }
      case "DELAYED":
        return { 
          backgroundColor: "rgba(255, 152, 0, 0.1)", 
          color: "#FF9800",
          iconColor: "#FF9800",
          icon: "alert-circle" 
        }
      case "ASSIGNED_TO_DELIVERY":
        return { 
          backgroundColor: "rgba(33, 150, 243, 0.1)", 
          color: "#2196F3",
          iconColor: "#2196F3",
          icon: "clock" 
        }
      case "ACCEPTED":
        return { 
          backgroundColor: "rgba(156, 39, 176, 0.1)", 
          color: "#9C27B0",
          iconColor: "#9C27B0",
          icon: "check" 
        }
      case "PENDING":
        return { 
          backgroundColor: "rgba(158, 158, 158, 0.1)", 
          color: "#9E9E9E",
          iconColor: "#9E9E9E",
          icon: "clock-outline" 
        }
      default:
        return { 
          backgroundColor: "#E3F2FD", 
          color: "#757575",
          iconColor: "#757575",
          icon: "clock" 
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getStatusPercentage = () => {
    if (!stats) return { delivered: 0, cancelled: 0, delayed: 0 }
    
    const total = stats.totalOrders || 1
    return {
      delivered: (stats.delivered / total) * 100,
      cancelled: (stats.cancelled / total) * 100,
      delayed: (stats.delayed / total) * 100
    }
  }

  // Render skeleton loader for orders
  const renderOrderSkeleton = () => {
    return (
      <View style={styles.skeletonOrderCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonStatusBadge} />
          <View style={styles.skeletonOrderId} />
          <View style={styles.skeletonAmount} />
        </View>
        
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonCustomerName} />
          <View style={styles.skeletonAddress} />
          
          <View style={styles.skeletonMetaInfo}>
            <View style={styles.skeletonMetaItem} />
            <View style={styles.skeletonMetaItem} />
            <View style={styles.skeletonMetaItem} />
          </View>
        </View>
      </View>
    )
  }

  const renderStatsCard = () => {
    if (!stats) return (
      <View style={[styles.statsCard, styles.skeletonStatsCard]}>
        <View style={styles.skeletonStatsGradient}>
          <View style={styles.skeletonStatsHeader}>
            <View>
              <View style={styles.skeletonStatsTitle} />
              <View style={styles.skeletonStatsSubtitle} />
            </View>
            <View style={styles.skeletonStatsIcon} />
          </View>
          <View style={styles.skeletonStatsGrid}>
            <View style={styles.skeletonStatItem}>
              <View style={styles.skeletonStatNumber} />
              <View style={styles.skeletonStatLabel} />
            </View>
            <View style={styles.skeletonStatDivider} />
            <View style={styles.skeletonStatItem}>
              <View style={styles.skeletonStatNumber} />
              <View style={styles.skeletonStatLabel} />
            </View>
            <View style={styles.skeletonStatDivider} />
            <View style={styles.skeletonStatItem}>
              <View style={styles.skeletonStatNumber} />
              <View style={styles.skeletonStatLabel} />
            </View>
          </View>
          <View style={styles.skeletonProgressContainer}>
            <View style={styles.skeletonProgressBar} />
            <View style={styles.skeletonProgressLabels}>
              <View style={styles.skeletonProgressLabel} />
              <View style={styles.skeletonProgressLabel} />
              <View style={styles.skeletonProgressLabel} />
            </View>
          </View>
        </View>
      </View>
    )
    
    const percentages = getStatusPercentage()
    
    return (
      <Animated.View 
        style={[
          styles.statsCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsGradient}
        >
          <View style={styles.statsHeader}>
            <View>
              <Text style={styles.statsTitle}>Performance</Text>
              <Text style={styles.statsSubtitle}>{stats.month}</Text>
            </View>
            <MaterialCommunityIcons name="chart-line" size={28} color="#FFF" />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.successRate}%</Text>
              <Text style={styles.statLabel}>Taux de succès</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Jours consécutifs</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${percentages.delivered}%`,
                    backgroundColor: '#4CAF50'
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${percentages.delayed}%`,
                    backgroundColor: '#FF9800'
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${percentages.cancelled}%`,
                    backgroundColor: '#F44336'
                  }
                ]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <View style={styles.progressLabel}>
                <View style={[styles.colorDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.progressText}>Livrées</Text>
              </View>
              <View style={styles.progressLabel}>
                <View style={[styles.colorDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.progressText}>Signalées</Text>
              </View>
              <View style={styles.progressLabel}>
                <View style={[styles.colorDot, { backgroundColor: '#F44336' }]} />
                <Text style={styles.progressText}>Annulées</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    )
  }

  const renderMiniStats = () => {
    if (!stats) return (
      <View style={styles.miniStatsContainer}>
        <View style={[styles.miniStatCard, styles.skeletonMiniStatCard]}>
          <View style={styles.skeletonMiniStatIcon} />
          <View>
            <View style={styles.skeletonMiniStatValue} />
            <View style={styles.skeletonMiniStatLabel} />
          </View>
        </View>
        <View style={[styles.miniStatCard, styles.skeletonMiniStatCard]}>
          <View style={styles.skeletonMiniStatIcon} />
          <View>
            <View style={styles.skeletonMiniStatValue} />
            <View style={styles.skeletonMiniStatLabel} />
          </View>
        </View>
      </View>
    )
    
    return (
      <Animated.View 
        style={[
          styles.miniStatsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity style={[styles.miniStatCard, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="cash-multiple" size={20} color="#4CAF50" />
          <View>
            <Text style={[styles.miniStatValue, { color: '#4CAF50' }]}>
              MAD {stats.totalEarnings.toFixed(2)}
            </Text>
            <Text style={styles.miniStatLabel}>Gains totaux</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.miniStatCard, { backgroundColor: '#E3F2FD' }]}>
          <MaterialCommunityIcons name="timer-sand" size={20} color="#2196F3" />
          <View>
            <Text style={[styles.miniStatValue, { color: '#2196F3' }]}>{stats.avgDeliveryTime}</Text>
            <Text style={styles.miniStatLabel}>Temps moyen</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  const renderHistoryItem = ({ item, index }: { item: OrderHistory; index: number }) => {
    const statusStyle = getStatusStyle(item.status)
    const isSelected = selectedOrder === item.id.toString()
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }
          ]
        }}
      >
        <TouchableOpacity 
          style={[
            styles.orderCard,
            isSelected && styles.orderCardSelected
          ]}
          activeOpacity={0.7}
          onPress={() => setSelectedOrder(isSelected ? null : item.id.toString())}
        >
          <View style={styles.cardHeader}>
            <View style={styles.orderIdContainer}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                <MaterialCommunityIcons 
                  name={statusStyle.icon} 
                  size={16} 
                  color={statusStyle.iconColor} 
                />
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {item.status === "DELIVERED" ? "Livrée" : 
                   item.status === "CANCELLED" ? "Annulée" : 
                   item.status === "REJECTED" ? "Rejetée" :
                   item.status === "DELAYED" ? "Signalée" : 
                   item.status === "ASSIGNED_TO_DELIVERY" ? "Affectée" :
                   item.status === "ACCEPTED" ? "Acceptée" : "En attente"}
                </Text>
              </View>
              <Text style={styles.orderId}>#{item.orderCode}</Text>
            </View>
            <Text style={styles.amount}>MAD {item.totalPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.customerInfo}>
              <MaterialCommunityIcons name="account" size={16} color="#666" />
              <Text style={styles.customerName}>{item.customerName}</Text>
            </View>
            
            <View style={styles.addressContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
              <Text style={styles.address} numberOfLines={1}>{item.deliveryAddress}</Text>
            </View>

            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar" size={14} color="#888" />
                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#888" />
                <Text style={styles.metaText}>{formatTime(item.createdAt)}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="package-variant" size={14} color="#888" />
                <Text style={styles.metaText}>{item.itemsCount} pièce{item.itemsCount !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>

          {isSelected && (
            <Animated.View 
              style={[
                styles.expandedContent,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.expandedActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialCommunityIcons name="phone" size={18} color="#2196F3" />
                  <Text style={[styles.actionText, { color: '#2196F3' }]}>
                    {item.customerPhone}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialCommunityIcons name="cash" size={18} color="#4CAF50" />
                  <Text style={[styles.actionText, { color: '#4CAF50' }]}>
                    {item.paymentMethod === "COD" ? "Paiement à la livraison" : "Prépayé"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    )
  }


  const renderFooter = () => {
    if (!loadingMore) return null
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    )
  }

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* User info section with CustomTopNav */}
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
          </View>

          {/* Top Navigation Bar */}
          <CustomTopNav
            activeTab="history"
            onTabChange={(tab) => {
              if (tab === "home") {
                router.push("/(tabs)")
              } else if (tab === "orders") {
                router.push("/(tabs)/orders")
              } else if (tab === "settings") {
                router.push("/(tabs)/settings")
              }
            }}
          />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Chargement de l'historique...</Text>
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
        </View>

        {/* Top Navigation Bar */}
        <CustomTopNav
          activeTab="history"
          onTabChange={(tab) => {
            if (tab === "home") {
              router.push("/(tabs)")
            } else if (tab === "orders") {
              router.push("/(tabs)/orders")
            } else if (tab === "settings") {
              router.push("/(tabs)/settings")
            }
          }}
        />
      </View>

      <FlatList
        data={orders}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3", "#4CAF50", "#FF9800"]}
            tintColor="#2196F3"
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeaderContainer}>
            {renderStatsCard()}
            {renderMiniStats()}
          </View>
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          filterLoading ? (
            <View style={styles.skeletonListContainer}>
              {[1, 2, 3].map((_, index) => (
                <View key={index}>
                  {renderOrderSkeleton()}
                </View>
              ))}
            </View>
          ) : (
            <Animated.View 
              style={[
                styles.emptyContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <MaterialCommunityIcons name="inbox-multiple" size={80} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Aucune commande</Text>
              <Text style={styles.emptyText}>
                {filter === "All" 
                  ? "Aucune commande dans votre historique" 
                  : `Aucune commande ${filter === "Delivered" ? "livrée" : 
                     filter === "Cancelled" ? "annulée" : 
                     "signalée"}`}
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
                <Text style={styles.emptyButtonText}>Actualiser</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  userInfoContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 30,
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
    backgroundColor: "#0f8fd5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  greeting: {
    color: "#1A1A1A",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  location: {
    color: "#808080",
    fontSize: 14,
  },
  listHeaderContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  statsCard: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
  },
  statsGradient: {
    padding: 24,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  miniStatsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  miniStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  miniStatLabel: {
    fontSize: 12,
    color: "#666",
  },
  orderCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  orderCardSelected: {
    borderColor: "#2196F3",
    borderWidth: 2,
    shadowColor: "#2196F3",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderIdContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  amount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2196F3",
  },
  cardContent: {
    gap: 12,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  address: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  metaInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#888",
  },
  expandedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  expandedActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    gap: 8,
    flex: 1,
    minWidth: 100,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 48,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },
  skeletonListContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  skeletonOrderCard: {
    backgroundColor: "#FFF",
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  skeletonStatusBadge: {
    width: 80,
    height: 28,
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
  },
  skeletonOrderId: {
    width: 100,
    height: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonAmount: {
    width: 70,
    height: 24,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonContent: {
    gap: 12,
  },
  skeletonCustomerName: {
    width: 120,
    height: 18,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonAddress: {
    width: "100%",
    height: 16,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonMetaInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 4,
  },
  skeletonMetaItem: {
    width: 70,
    height: 14,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonStatsCard: {
    backgroundColor: "#E0E0E0",
  },
  skeletonStatsGradient: {
    padding: 24,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderRadius: 24,
  },
  skeletonStatsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  skeletonStatsTitle: {
    width: 100,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonStatsSubtitle: {
    width: 80,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  skeletonStatsIcon: {
    width: 28,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 14,
  },
  skeletonStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  skeletonStatItem: {
    alignItems: "center",
    flex: 1,
  },
  skeletonStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  skeletonStatNumber: {
    width: 60,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonStatLabel: {
    width: 70,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  skeletonProgressContainer: {
    marginTop: 8,
  },
  skeletonProgressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
  },
  skeletonProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  skeletonProgressLabel: {
    width: 60,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  skeletonMiniStatCard: {
    backgroundColor: "#F0F0F0",
  },
  skeletonMiniStatIcon: {
    width: 20,
    height: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
  },
  skeletonMiniStatValue: {
    width: 70,
    height: 24,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 2,
  },
  skeletonMiniStatLabel: {
    width: 60,
    height: 14,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
})

export default HistoryScreen