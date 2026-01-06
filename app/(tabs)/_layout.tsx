import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { CustomBottomNav, type NavItem } from "./custom-bottom-nav"; // Import the type
import HistoryScreen from "./history";
import HomeScreen from "./index";
import MapScreen from "./map";
import OrderScreen from "./orders";
import SettingsScreen from "./settings";

export default function TabsLayout() {
  const [activeTab, setActiveTab] = useState("home")
  const pathname = usePathname()
  const router = useRouter()

  const tabToPath = {
    home: "/",
    orders: "/orders",
    map: "/map",
    history: "/history",
    settings: "/settings",
  } as const

  useEffect(() => {
    if (pathname?.includes("/orders")) setActiveTab("orders")
    else if (pathname?.includes("/map")) setActiveTab("map")
    else if (pathname?.includes("/history")) setActiveTab("history")
    else if (pathname?.includes("/settings")) setActiveTab("settings")
    else setActiveTab("home")
  }, [pathname])

  const navItems: NavItem[] = [
    { name: "home", label: "Accueil", icon: "home" as keyof typeof Ionicons.glyphMap },
    { name: "orders", label: "Commandes", icon: "list" as keyof typeof Ionicons.glyphMap },
    { name: "history", label: "Historique", icon: "time" as keyof typeof Ionicons.glyphMap },
    { name: "settings", label: "Paramètres", icon: "settings" as keyof typeof Ionicons.glyphMap },
  ]

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen />
      case "orders":
        return <OrderScreen />
      case "history":
        return <HistoryScreen />
      case "settings":
        return <SettingsScreen />
      default:
        return <HomeScreen />
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      <CustomBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          const next = tabToPath[tab as keyof typeof tabToPath] ?? "/"
          router.replace(next)
        }}
        navItems={navItems}
      />
    </View>
  )
}