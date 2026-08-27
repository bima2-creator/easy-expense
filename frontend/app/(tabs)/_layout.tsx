import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Tabs, useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, spacing, shadow } from "@/src/theme";

type NavItem = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; path: string };

const LEFT: NavItem[] = [
  { key: "home", label: "Beranda", icon: "home", path: "/" },
  { key: "expenses", label: "Pengeluaran", icon: "receipt", path: "/expenses" },
];
const RIGHT: NavItem[] = [
  { key: "reports", label: "Laporan", icon: "bar-chart", path: "/reports" },
  { key: "projects", label: "Proyek", icon: "folder", path: "/projects" },
];

function TabButton({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable testID={`tab-${item.key}`} onPress={onPress} style={styles.tabItem}>
      <Ionicons
        name={active ? item.icon : (`${item.icon}-outline` as any)}
        size={23}
        color={active ? colors.brand : colors.muted}
      />
      <Text style={[styles.tabLabel, { color: active ? colors.brand : colors.muted }]}>{item.label}</Text>
    </Pressable>
  );
}

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const go = (path: string) => {
    Haptics.selectionAsync();
    router.push(path as any);
  };

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm), height: 64 + Math.max(insets.bottom, spacing.sm) }]}>
      {LEFT.map((it) => (
        <TabButton key={it.key} item={it} active={isActive(it.path)} onPress={() => go(it.path)} />
      ))}

      <View style={styles.fabSlot}>
        <Pressable
          testID="tab-scan-fab"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/scan");
          }}
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <Ionicons name="scan" size={26} color={colors.onSurfaceInverse} />
        </Pressable>
      </View>

      {RIGHT.map((it) => (
        <TabButton key={it.key} item={it} active={isActive(it.path)} onPress={() => go(it.path)} />
      ))}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="expenses" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="projects" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 3, paddingTop: 4 },
  tabLabel: { fontFamily: fonts.medium, fontSize: 11 },
  fabSlot: { width: 72, alignItems: "center" },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow.fab,
  },
});
