import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/src/api";
import type { Expense, Summary } from "@/src/types";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { formatMoney, monthYearLabel } from "@/src/lib";
import { useCategories } from "@/src/categories";
import ExpenseRow from "@/src/components/ExpenseRow";

const EMPTY_IMG = "https://images.unsplash.com/photo-1585435465945-bef5a93f8849?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMG1pbmltYWxpc3QlMjBkZXNrJTIwcGxhbm5lciUyMHRvcCUyMHZpZXd8ZW58MHx8fHwxNzg3NzU4MzExfDA&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { metaFor } = useCategories();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([api.summary("month"), api.listExpenses()]);
      setSummary(s);
      setRecent(list.slice(0, 6));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const topCat = summary?.by_category?.[0];
  const topProj = summary?.by_project?.[0];
  const isEmpty = !loading && recent.length === 0 && (summary?.count ?? 0) === 0;
  const catMeta = metaFor(topCat?.category);

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Easy Expense</Text>
            <Text style={styles.month}>{monthYearLabel()}</Text>
          </View>
          <Pressable testID="home-settings" onPress={() => router.push("/categories")} style={styles.logoDot}>
            <Ionicons name="options-outline" size={20} color={colors.onSurfaceInverse} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>
        ) : isEmpty ? (
          <EmptyHome onScan={() => router.push("/scan")} />
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.heroWrap}>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>TOTAL PENGELUARAN · BULAN INI</Text>
                <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(summary?.total ?? 0)}</Text>
                <View style={styles.heroFooter}>
                  <View style={styles.heroPill}>
                    <Ionicons name="receipt-outline" size={13} color={colors.onSurfaceInverse} />
                    <Text style={styles.heroPillText}>{summary?.count ?? 0} transaksi</Text>
                  </View>
                  {topProj ? (
                    <View style={styles.heroPill}>
                      <Ionicons name="folder-outline" size={13} color={colors.onSurfaceInverse} />
                      <Text style={styles.heroPillText} numberOfLines={1}>{topProj.name}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Animated.View>

            <View style={styles.bento}>
              <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[styles.bentoCard, { flex: 1 }]}>
                <View style={[styles.bentoIcon, { backgroundColor: catMeta.color + "18" }]}>
                  <Ionicons name={topCat ? catMeta.icon : "pie-chart-outline"} size={18} color={topCat ? catMeta.color : colors.muted} />
                </View>
                <Text style={styles.bentoLabel}>Kategori Teratas</Text>
                <Text style={styles.bentoValue} numberOfLines={1}>{topCat?.category ?? "—"}</Text>
                <Text style={styles.bentoSub}>{topCat ? formatMoney(topCat.amount) : "Rp 0"}</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(140)} style={[styles.bentoCard, { flex: 1 }]}>
                <View style={[styles.bentoIcon, { backgroundColor: colors.brandTertiary + "18" }]}>
                  <Ionicons name="folder-open-outline" size={18} color={colors.brandTertiary} />
                </View>
                <Text style={styles.bentoLabel}>Proyek Aktif</Text>
                <Text style={styles.bentoValue}>{summary?.by_project?.length ?? 0}</Text>
                <Text style={styles.bentoSub}>dengan pengeluaran</Text>
              </Animated.View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
              <Pressable testID="see-all-expenses" onPress={() => router.push("/expenses")}>
                <Text style={styles.seeAll}>Lihat semua</Text>
              </Pressable>
            </View>

            <View style={styles.listCard}>
              {recent.map((e, i) => (
                <View key={e.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <ExpenseRow expense={e} onPress={() => router.push(`/expense/${e.id}`)} />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {!isEmpty && !loading && (
        <Pressable testID="home-scan-cta" onPress={() => router.push("/scan")} style={[styles.scanCta, { bottom: spacing.lg }]}>
          <Ionicons name="scan" size={18} color={colors.onSurfaceInverse} />
          <Text style={styles.scanCtaText}>Scan Struk</Text>
        </Pressable>
      )}
    </View>
  );
}

function EmptyHome({ onScan }: { onScan: () => void }) {
  return (
    <View style={styles.empty}>
      <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
      <Text style={styles.emptyTitle}>Belum ada pengeluaran</Text>
      <Text style={styles.emptyText}>Foto struk pertamamu dan biarkan AI mengisi detailnya secara otomatis.</Text>
      <Pressable testID="empty-scan-cta" onPress={onScan} style={styles.emptyBtn}>
        <Ionicons name="scan" size={18} color={colors.onSurfaceInverse} />
        <Text style={styles.emptyBtnText}>Scan struk pertama</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  greeting: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  month: { fontFamily: fonts.medium, fontSize: type.base, color: colors.muted, marginTop: 2, textTransform: "capitalize" },
  logoDot: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  loader: { paddingVertical: spacing.xxxl },
  heroWrap: { paddingHorizontal: spacing.lg },
  hero: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: spacing.xl, ...shadow.card },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, color: "#8A8A8D" },
  heroAmount: { fontFamily: fonts.display, fontSize: 40, color: colors.onSurfaceInverse, marginTop: spacing.sm },
  heroFooter: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, maxWidth: 180 },
  heroPillText: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.onSurfaceInverse },
  bento: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  bentoCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: 4 },
  bentoIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  bentoLabel: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.muted },
  bentoValue: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  bentoSub: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  seeAll: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.brandTertiary },
  listCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 72 },
  scanCta: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, ...shadow.fab },
  scanCtaText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  emptyImg: { width: 200, height: 200, borderRadius: radius.lg, marginBottom: spacing.xl, opacity: 0.9 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: type.lg, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, marginTop: spacing.xl },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
