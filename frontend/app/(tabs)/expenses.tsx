import React, { useCallback, useState } from "react";
import { View, Text, FlatList, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api";
import type { Expense } from "@/src/types";
import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { formatMoney } from "@/src/lib";
import { useCategories } from "@/src/categories";
import ExpenseRow from "@/src/components/ExpenseRow";

const EMPTY_IMG = "https://images.unsplash.com/photo-1585435465945-bef5a93f8849?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMG1pbmltYWxpc3QlMjBkZXNrJTIwcGxhbm5lciUyMHRvcCUyMHZpZXd8ZW58MHx8fHwxNzg3NzU4MzExfDA&ixlib=rb-4.1.0&q=85";

export default function Expenses() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories } = useCategories();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const chips = ["Semua", ...categories.map((c) => c.name)];

  const load = useCallback(async (cat: string, q: string) => {
    setLoading(true);
    try { setExpenses(await api.listExpenses({ category: cat, search: q })); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(category, search); }, [category, search, load]));

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Pengeluaran</Text>
          <View style={styles.actionsRow}>
            <View style={styles.totalBadge}><Text style={styles.totalText}>{formatMoney(total)}</Text></View>
            <Pressable testID="expenses-add" onPress={() => router.push("/add")} style={styles.addBtn}>
              <Ionicons name="add" size={22} color={colors.onSurfaceInverse} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            testID="expenses-search"
            value={search}
            onChangeText={setSearch}
            placeholder="Cari vendor / toko"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable testID="clear-search" onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll}>
          {chips.map((c) => {
            const active = category === c;
            return (
              <Pressable key={c} testID={`filter-chip-${c}`} onPress={() => setCategory(c)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>
      ) : expenses.length === 0 ? (
        <View style={styles.empty}>
          <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
          <Text style={styles.emptyTitle}>Tidak ada pengeluaran</Text>
          <Text style={styles.emptyText}>
            {category !== "Semua" || search ? "Coba hapus filter." : "Scan struk untuk memulai."}
          </Text>
          {(category !== "Semua" || search) && (
            <Pressable testID="clear-filters" onPress={() => { setCategory("Semua"); setSearch(""); }} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Hapus filter</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          testID="expenses-list"
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: spacing.xl }}
          renderItem={({ item, index }) => (
            <View style={styles.rowWrap}>
              {index > 0 && <View style={styles.divider} />}
              <ExpenseRow expense={item} onPress={() => router.push(`/expense/${item.id}`)} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  totalBadge: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
  totalText: { fontFamily: fonts.display, fontSize: type.base, color: colors.onSurface },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, marginTop: spacing.md },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface },
  chipScroll: { marginTop: spacing.md, marginHorizontal: -spacing.lg },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, height: 36, alignItems: "center" },
  chip: { flexShrink: 0, height: 36, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onSurfaceInverse },
  loader: { paddingVertical: spacing.xxxl },
  rowWrap: { marginHorizontal: spacing.lg },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 60 },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  emptyImg: { width: 160, height: 160, borderRadius: radius.lg, marginBottom: spacing.xl, opacity: 0.9 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
  clearBtn: { marginTop: spacing.lg, backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  clearBtnText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
});
