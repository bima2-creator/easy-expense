import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { api, projectPdfUrl, API_KEY_HEADERS } from "@/src/api";
import type { Project, WorkOrder } from "@/src/types";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { formatMoney } from "@/src/lib";
import InputModal from "@/src/components/InputModal";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useToast } from "@/src/components/Toast";

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [addWO, setAddWO] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, wos] = await Promise.all([api.getProject(id!), api.workOrders(id!)]);
      setProject(p);
      setWorkOrders(wos);
    } catch { toast("Gagal memuat proyek", "error"); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = workOrders.reduce((s, w) => s + (w.total || 0), 0);

  const createWO = async (name: string) => {
    try { await api.createWorkOrder(id!, name); Haptics.selectionAsync(); setAddWO(false); load(); }
    catch { toast("Gagal membuat work order", "error"); }
  };
  const rename = async (name: string) => {
    try { await api.updateProject(id!, { name }); setRenaming(false); load(); }
    catch { toast("Gagal mengubah", "error"); }
  };
  const remove = async () => {
    try {
      await api.deleteProject(id!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Proyek dihapus", "success");
      router.back();
    } catch { toast("Gagal menghapus", "error"); }
  };

  const exportPdf = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = projectPdfUrl(id!);
    if (Platform.OS === "web") { window.open(url, "_blank"); return; }
    setExporting(true);
    try {
      const target = FileSystem.cacheDirectory + `laporan_${Date.now()}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target, { headers: API_KEY_HEADERS });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Laporan Proyek" });
      } else { toast("PDF tersimpan di perangkat", "success"); }
    } catch { toast("Gagal ekspor PDF", "error"); }
    finally { setExporting(false); }
  };

  if (loading || !project) {
    return <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="project-back" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable testID="project-rename" onPress={() => setRenaming(true)} style={styles.headerBtn}>
            <Ionicons name="pencil" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="project-delete" onPress={() => setConfirmDel(true)} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <Ionicons name="folder" size={22} color="#fff" style={{ opacity: 0.7 }} />
          <Text style={styles.projName} numberOfLines={2}>{project.name}</Text>
          {project.client ? <Text style={styles.projClient}>{project.client}</Text> : null}
          <Text style={styles.totalLabel}>TOTAL PENGELUARAN</Text>
          <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(total)}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Work Order</Text>
          <Pressable testID="add-wo" onPress={() => setAddWO(true)} style={styles.addWoBtn}>
            <Ionicons name="add" size={16} color={colors.onSurfaceInverse} />
            <Text style={styles.addWoText}>WO</Text>
          </Pressable>
        </View>

        {workOrders.length === 0 ? (
          <View style={styles.emptyWo}>
            <Ionicons name="construct-outline" size={32} color={colors.borderStrong} />
            <Text style={styles.emptyWoText}>Belum ada work order.{"\n"}Buat WO untuk mulai mencatat pengeluaran.</Text>
          </View>
        ) : (
          <View style={styles.woList}>
            {workOrders.map((w) => (
              <Pressable key={w.id} testID={`wo-card-${w.id}`} onPress={() => router.push(`/workorder/${w.id}`)} style={styles.woCard}>
                <View style={styles.woIcon}><Ionicons name="construct" size={18} color={colors.brandTertiary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.woName} numberOfLines={1}>{w.name}</Text>
                  <Text style={styles.woMeta}>{w.expense_count ?? 0} transaksi</Text>
                </View>
                <Text style={styles.woTotal}>{formatMoney(w.total ?? 0)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable testID="export-pdf" onPress={exportPdf} disabled={exporting} style={styles.pdfBtn}>
          {exporting ? <ActivityIndicator color={colors.onSurfaceInverse} /> : (
            <>
              <Ionicons name="document-text-outline" size={18} color={colors.onSurfaceInverse} />
              <Text style={styles.pdfText}>Ekspor Laporan PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      <InputModal visible={addWO} title="Work Order Baru" placeholder="mis. WO-001 Instalasi" confirmLabel="Buat" onClose={() => setAddWO(false)} onSubmit={createWO} />
      <InputModal visible={renaming} title="Ubah Nama Proyek" placeholder="Nama proyek" initialValue={project.name} confirmLabel="Simpan" onClose={() => setRenaming(false)} onSubmit={rename} />
      <ConfirmModal visible={confirmDel} title="Hapus proyek?" message="Semua work order akan dihapus. Pengeluaran akan dilepas dari proyek ini." onClose={() => setConfirmDel(false)} onConfirm={remove} />
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
  projName: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurfaceInverse, marginTop: spacing.sm },
  projClient: { fontFamily: fonts.regular, fontSize: type.base, color: "#8A8A8D", marginTop: 2 },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, color: "#8A8A8D", marginTop: spacing.lg },
  totalAmount: { fontFamily: fonts.display, fontSize: 36, color: colors.onSurfaceInverse, marginTop: spacing.xs },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  addWoBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill },
  addWoText: { fontFamily: fonts.semibold, fontSize: type.sm, color: colors.onSurfaceInverse },
  emptyWo: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyWoText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, textAlign: "center", lineHeight: 22 },
  woList: { gap: spacing.md },
  woCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  woIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.brandTertiary + "18", alignItems: "center", justifyContent: "center" },
  woName: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  woMeta: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  woTotal: { fontFamily: fonts.display, fontSize: type.base, color: colors.onSurface },
  bottomBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  pdfBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brand, height: 52, borderRadius: radius.md },
  pdfText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
