import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { api, csvUrl, API_KEY_HEADERS } from "@/src/api";
import type { Summary } from "@/src/types";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { formatMoney, MONTH_ID } from "@/src/lib";
import { useCategories } from "@/src/categories";
import { useToast } from "@/src/components/Toast";

const PERIODS = [
  { key: "week", label: "Minggu" },
  { key: "month", label: "Bulan" },
  { key: "quarter", label: "Kuartal" },
  { key: "year", label: "Tahun" },
];

export default function Reports() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { metaFor } = useCategories();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try { setSummary(await api.summary(p)); }
    catch { setSummary(null); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(period); }, [period, load]));

  const onExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = csvUrl();
    if (Platform.OS === "web") { window.open(url, "_blank"); return; }
    setExporting(true);
    try {
      const target = FileSystem.cacheDirectory + `pengeluaran_${Date.now()}.csv`;
      const { uri } = await FileSystem.downloadAsync(url, target, { headers: API_KEY_HEADERS });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Ekspor Pengeluaran" });
      } else { toast("CSV tersimpan di perangkat", "success"); }
    } catch { toast("Gagal ekspor. Coba lagi.", "error"); }
    finally { setExporting(false); }
  };

  const maxTrend = Math.max(1, ...(summary?.trend?.map((t) => t.amount) ?? [1]));
  const barData = (summary?.trend ?? []).map((t) => ({
    value: t.amount,
    label: MONTH_ID[t.label] || t.label,
    frontColor: colors.brandTertiary,
    onPress: () => toast(`${MONTH_ID[t.label] || t.label}: ${formatMoney(t.amount)}`, "info"),
  }));
  const maxCat = Math.max(1, ...(summary?.by_category?.map((c) => c.amount) ?? [1]));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Laporan</Text>
        <View style={styles.segment}>
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <Pressable key={p.key} testID={`period-${p.key}`} onPress={() => { Haptics.selectionAsync(); setPeriod(p.key); }} style={[styles.segItem, active && styles.segItemActive]}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>
      ) : !summary || summary.count === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.emptyTitle}>Data belum cukup</Text>
          <Text style={styles.emptyText}>Tambahkan pengeluaran untuk melihat ringkasan periode ini.</Text>
        </View>
      ) : (
        <ScrollView testID="reports-scroll" contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Pressable testID="reports-total" onPress={() => router.push("/expenses")} style={styles.totalCard}>
            <Text style={styles.totalLabel}>TOTAL PENGELUARAN</Text>
            <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(summary.total)}</Text>
            <Text style={styles.totalMeta}>{summary.count} transaksi</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Tren 6 Bulan</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={barData}
              barWidth={22}
              spacing={(width - spacing.lg * 2 - 40 - 22 * 6) / 6}
              roundedTop
              noOfSections={3}
              maxValue={Math.ceil(maxTrend * 1.2)}
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              hideYAxisText
              xAxisLabelTextStyle={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 11 }}
              disableScroll
            />
          </View>

          <Text style={styles.sectionTitle}>Per Kategori</Text>
          <View style={styles.catCard}>
            {summary.by_category.map((c, i) => {
              const meta = metaFor(c.category);
              return (
                <Pressable
                  key={c.category}
                  testID={`report-category-${c.category}`}
                  onPress={() => router.push(`/expenses?category=${encodeURIComponent(c.category)}`)}
                  style={[styles.catItem, i > 0 && styles.catItemBorder]}
                >
                  <View style={styles.catTop}>
                    <View style={styles.catLeft}>
                      <View style={[styles.catDot, { backgroundColor: meta.color }]} />
                      <Text style={styles.catName} numberOfLines={1}>{c.category}</Text>
                    </View>
                    <Text style={styles.catAmount} numberOfLines={1}>{formatMoney(c.amount)}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${(c.amount / maxCat) * 100}%`, backgroundColor: meta.color }]} /></View>
                </Pressable>
              );
            })}
          </View>

          {summary.by_project.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Per Proyek</Text>
              <View style={styles.catCard}>
                {summary.by_project.map((p, i) => (
                  <Pressable
                    key={p.id}
                    testID={`report-project-${p.id}`}
                    onPress={() => router.push(`/project/${p.id}`)}
                    style={[styles.projItem, i > 0 && styles.catItemBorder]}
                  >
                    <View style={styles.projIcon}><Ionicons name="folder-outline" size={16} color={colors.brandTertiary} /></View>
                    <Text style={styles.catName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.catAmount} numberOfLines={1}>{formatMoney(p.amount)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <View style={[styles.exportBar, { paddingBottom: spacing.md }]}>
        <Pressable testID="export-csv" onPress={onExport} disabled={exporting} style={styles.exportBtn}>
          {exporting ? <ActivityIndicator color={colors.onSurfaceInverse} /> : (
            <>
              <Ionicons name="download-outline" size={18} color={colors.onSurfaceInverse} />
              <Text style={styles.exportText}>Ekspor CSV</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 3, marginTop: spacing.md },
  segItem: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.sm },
  segItemActive: { backgroundColor: colors.surfaceSecondary, ...shadow.card },
  segText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.muted },
  segTextActive: { color: colors.onSurface, fontFamily: fonts.semibold },
  loader: { paddingVertical: spacing.xxxl },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface, marginTop: spacing.sm },
  emptyText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, textAlign: "center" },
  totalCard: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: spacing.xl, ...shadow.card },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, color: "#8A8A8D" },
  totalAmount: { fontFamily: fonts.display, fontSize: 36, color: colors.onSurfaceInverse, marginTop: spacing.sm },
  totalMeta: { fontFamily: fonts.medium, fontSize: type.base, color: "#8A8A8D", marginTop: spacing.sm },
  sectionTitle: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  chartCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, paddingRight: spacing.sm, overflow: "hidden" },
  catCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  catItem: { paddingVertical: spacing.md, gap: spacing.sm },
  catItemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  catTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, flexShrink: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface, flex: 1, flexShrink: 1, marginRight: spacing.sm },
  catAmount: { fontFamily: fonts.display, fontSize: type.base, color: colors.onSurface, flexShrink: 0 },
  projItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  projIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.brandTertiary + "18", alignItems: "center", justifyContent: "center" },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  exportBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brand, height: 52, borderRadius: radius.md },
  exportText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
