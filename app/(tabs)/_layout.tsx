// tabs.tsx
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import FinanceScreen from "./finance";
import HistoryScreen from "./history";
import HomeScreen from "./index";
import OrderScreen from "./orders";
import SettingsScreen from "./settings";

export default function TabsLayout() {
  const [activeTab, setActiveTab] = useState("home");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname?.includes("/orders")) setActiveTab("orders");
    else if (pathname?.includes("/map")) setActiveTab("map");
    else if (pathname?.includes("/history")) setActiveTab("history");
    else if (pathname?.includes("/finance")) setActiveTab("finance");
    else if (pathname?.includes("/settings")) setActiveTab("settings");
    else setActiveTab("home");
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
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
      case "finance":
        router.push("/(tabs)/finance");
        break;
      case "settings":
        router.push("/(tabs)/settings");
        break;
    }
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen />;
      case "orders":
        return <OrderScreen />;
      case "history":
        return <HistoryScreen />;
      case "finance":
        return <FinanceScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
    </View>
  );
}