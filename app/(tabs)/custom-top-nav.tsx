// custom-top-nav.tsx
import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export interface NavItem {
  name: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

interface CustomTopNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export const CustomTopNav: React.FC<CustomTopNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const navItems: NavItem[] = [
    { name: "home", label: "Accueil", icon: "home" as keyof typeof Ionicons.glyphMap },
    { name: "orders", label: "Commandes", icon: "list" as keyof typeof Ionicons.glyphMap },
    { name: "history", label: "Historique", icon: "time" as keyof typeof Ionicons.glyphMap },
    { name: "finance", label: "Finances", icon: "wallet" as keyof typeof Ionicons.glyphMap },
    { name: "settings", label: "Paramètres", icon: "settings" as keyof typeof Ionicons.glyphMap },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = activeTab === item.name

          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.activeNavItem]}
              onPress={() => onTabChange(item.name)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? "#0f8fd5" : "#A0A0A0"}
                style={styles.icon}
              />
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 0,
    position: "relative",
    flex: 1,
    minWidth: 0,
  },
  activeNavItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: "#A0A0A0",
    fontWeight: "500",
  },
  activeLabel: {
    color: "#0f8fd5",
    fontWeight: "bold",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -2,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 3,
    backgroundColor: "#0f8fd5",
    borderRadius: 1.5,
  },
})

export default CustomTopNav