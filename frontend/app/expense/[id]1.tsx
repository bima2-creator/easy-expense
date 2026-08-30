import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";

import { api, fileUrl, API_KEY_HEADERS } from "@/src/api";
import type { Expense } from "@/src/types";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { useCategories } from "@/src/categories";
import ExpenseForm, { FormState } from "@/src/components/ExpenseForm";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useToast } from "@/src/components/Toast";

export default function ExpenseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { metaFor } = useCategories();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const e = await api.getExpense(id!);
        setExpense(e);
        setForm({
          vendor: e.vendor,
          amount: String(Math.round(e.amount)),
          date: e.date,
          category: e.category,
          notes: e.notes || "",
          is_billable: e.is_billable,
          project_id: e.project_id || null,
          work_order_id: e.work_order_id || null,
        });
      } catch { toast("Gagal memuat", "error"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f));

  const save = async () => {
    if (!form) return;
    if (!form.amount || Number(form.amount) <= 0) { toast("Masukkan jumlah yang valid", "error"); return; }
    setSaving(true);
    try {
      await api.updateExpense(id!, {
        vendor: form.vendor.trim() || "Vendor Tidak Diketahui",
        amount: Number(form.amount),
        date: form.date,
        category: form.category,
        notes: form.notes,
        is_billable: form.is_billable,
        project_id: form.project_id,
        work_order_id: form.work_order_id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Perubahan disimpan", "success");
      router.back();
    } catch { toast("Gagal menyimpan", "error"); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    try {
      await api.deleteExpense(id!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Pengeluaran dihapus", "success");
      router.back();
    } catch { toast("Gagal menghapus", "error"); }
  };

  if (loading || !form || !expense) {
    return <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>;
  }

  const meta = metaFor(expense.category);
  const hasReceipt = !!expense.receipt_path;

  return (
    <View style={styles.screen}>
      <View style={styles.heroWrap}>
        {hasReceipt ? (
          <Image source={{ uri: fileUrl(expense.receipt_path), headers: API_KEY_HEADERS }} style={styles.hero} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder, { backgroundColor: meta.color + "22" }]}>
            <Ionicons name={meta.icon} size={56} color={meta.color} />
          </View>
        )}
        <LinearGradient colors={["rgba(28,28,30,0.75)", "transparent"]} style={styles.topScrim} />
        <View style={[styles.heroTop, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="detail-back" onPress={() => router.back()} style={styles.roundBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Pressable testID="detail-delete" onPress={() => setConfirmDelete(true)} style={styles.roundBtn}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView bottomOffset={90} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false} style={styles.sheet}>
        <ExpenseForm value={form} onChange={patch} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable testID="save-changes" onPress={save} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.saveText}>Simpan Perubahan</Text>}
          </Pressable>
        </View>
      </KeyboardStickyView>

      <ConfirmModal
        visible={confirmDelete}
        title="Hapus pengeluaran?"
        message="Pengeluaran ini dan struknya akan dihapus permanen."
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  heroWrap: { height: "34%", backgroundColor: colors.surfaceInverse },
  hero: { width: "100%", height: "100%" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  heroTop: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  sheet: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, marginTop: -spacing.lg },
  saveBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { height: 52, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", ...shadow.card },
  saveText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
