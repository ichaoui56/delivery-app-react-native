import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export interface NavItem {
  name: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

interface CustomBottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  navItems: NavItem[]
}

export const CustomBottomNav: React.FC<CustomBottomNavProps> = ({
  activeTab,
  onTabChange,
  navItems,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = activeTab === item.name

          return (
            <TouchableOpacity
              key={item.name}
              style={styles.navItem}
              onPress={() => onTabChange(item.name)}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive ? "#0f8fd5" : "#A0A0A0"}
                />
              </View>

              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconContainer: {
    backgroundColor: "#E1F5FF",
  },
  label: {
    fontSize: 11,
    color: "#A0A0A0",
    marginTop: 4,
    fontWeight: "500",
  },
  activeLabel: {
    color: "#0f8fd5",
    fontWeight: "bold",
  },
})

export default CustomBottomNav