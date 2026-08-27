import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { api, workOrderPdfUrl } from "@/src/api";
import type { Expense, WorkOrder } from "@/src/types";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { formatMoney } from "@/src/lib";
import ExpenseRow from "@/src/components/ExpenseRow";
import InputModal from "@/src/components/InputModal";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useToast } from "@/src/components/Toast";

export default function WorkOrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, list] = await Promise.all([api.getWorkOrder(id!), api.listExpenses({ work_order_id: id! })]);
      setWo(w);
      setExpenses(list);
    } catch { toast("Gagal memuat work order", "error"); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const rename = async (name: string) => {
    try { await api.updateWorkOrder(id!, name); setRenaming(false); load(); }
    catch { toast("Gagal mengubah", "error"); }
  };
  const remove = async () => {
    try {
      await api.deleteWorkOrder(id!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Work order dihapus", "success");
      router.back();
    } catch { toast("Gagal menghapus", "error"); }
  };

  const goAdd = () => router.push(`/add?project_id=${wo?.project_id}&work_order_id=${id}`);
  const goScan = () => router.push(`/scan?project_id=${wo?.project_id}&work_order_id=${id}`);

  const exportPdf = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = workOrderPdfUrl(id!);
    if (Platform.OS === "web") { window.open(url, "_blank"); return; }
    setExporting(true);
    try {
      const target = FileSystem.cacheDirectory + `laporan_wo_${Date.now()}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Laporan Work Order" });
      } else { toast("PDF tersimpan di perangkat", "success"); }
    } catch { toast("Gagal ekspor PDF", "error"); }
    finally { setExporting(false); }
  };

  if (loading || !wo) {
    return <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="wo-back" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable testID="wo-rename" onPress={() => setRenaming(true)} style={styles.headerBtn}>
            <Ionicons name="pencil" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="wo-delete" onPress={() => setConfirmDel(true)} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <Ionicons name="construct" size={20} color="#fff" style={{ opacity: 0.7 }} />
          <Text style={styles.woName} numberOfLines={2}>{wo.name}</Text>
          <Text style={styles.totalLabel}>TOTAL PENGELUARAN</Text>
          <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(total)}</Text>
        </View>

        <View style={styles.quickRow}>
          <Pressable testID="wo-scan" onPress={goScan} style={[styles.quickBtn, styles.quickPrimary]}>
            <Ionicons name="scan" size={18} color={colors.onSurfaceInverse} />
            <Text style={styles.quickPrimaryText}>Scan Struk</Text>
          </Pressable>
          <Pressable testID="wo-add" onPress={goAdd} style={[styles.quickBtn, styles.quickSecondary]}>
            <Ionicons name="create-outline" size={18} color={colors.onSurface} />
            <Text style={styles.quickSecondaryText}>Manual</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Pengeluaran</Text>
        {expenses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={32} color={colors.borderStrong} />
            <Text style={styles.emptyText}>Belum ada pengeluaran di work order ini.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {expenses.map((e, i) => (
              <View key={e.id}>
                {i > 0 && <View style={styles.divider} />}
                <ExpenseRow expense={e} onPress={() => router.push(`/expense/${e.id}`)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable testID="wo-export-pdf" onPress={exportPdf} disabled={exporting} style={styles.pdfBtn}>
          {exporting ? <ActivityIndicator color={colors.onSurfaceInverse} /> : (
            <>
              <Ionicons name="document-text-outline" size={18} color={colors.onSurfaceInverse} />
              <Text style={styles.pdfText}>Ekspor Laporan PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      <InputModal visible={renaming} title="Ubah Nama Work Order" placeholder="Nama work order" initialValue={wo.name} confirmLabel="Simpan" onClose={() => setRenaming(false)} onSubmit={rename} />
      <ConfirmModal visible={confirmDel} title="Hapus work order?" message="Pengeluaran akan dilepas dari work order ini (tetap tersimpan)." onClose={() => setConfirmDel(false)} onConfirm={remove} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row" },
  totalCard: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: spacing.xl, ...shadow.card },
  woName: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurfaceInverse, marginTop: spacing.sm },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, color: "#8A8A8D", marginTop: spacing.lg },
  totalAmount: { fontFamily: fonts.display, fontSize: 36, color: colors.onSurfaceInverse, marginTop: spacing.xs },
  quickRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 50, borderRadius: radius.md },
  quickPrimary: { backgroundColor: colors.brand },
  quickPrimaryText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurfaceInverse },
  quickSecondary: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  quickSecondaryText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  sectionTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  emptyWrap: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl },
  emptyText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, textAlign: "center" },
  listCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 72 },
  bottomBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  pdfBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brand, height: 52, borderRadius: radius.md },
  pdfText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
