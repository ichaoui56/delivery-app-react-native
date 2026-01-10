// user-info-header.tsx
import { useAuth } from "@/lib/auth-provider"
import { LinearGradient } from "expo-linear-gradient"
import { useState } from "react"
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Svg, { Path } from "react-native-svg"
import { CustomTopNav } from "@/app/(tabs)/custom-top-nav"


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

interface UserInfoHeaderProps {
  activeTab: string
  onRefresh?: () => Promise<void>
  refreshing?: boolean
}

export const UserInfoHeader: React.FC<UserInfoHeaderProps> = ({
  activeTab,
  onRefresh,
  refreshing = false,
}) => {
  const { user } = useAuth()
  const [localRefreshing, setLocalRefreshing] = useState(false)

  const firstName = user?.name?.split(" ")[0] || "Utilisateur"
  const userCity = user?.deliveryMan?.city || "Ville inconnue"

  const handleRefresh = async () => {
    if (onRefresh) {
      setLocalRefreshing(true)
      await onRefresh()
      setLocalRefreshing(false)
    }
  }

  return (
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
          {onRefresh && (
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing || localRefreshing} style={styles.iconButton}>
              {refreshing || localRefreshing ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <RefreshIcon color="#1A1A1A" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity>
            <BellIcon color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* <CustomTopNav activeTab={activeTab}  /> */}
    </View>
  )
}

const styles = StyleSheet.create({
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
})