import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { todayISO } from "@/src/lib";
import { useCategories } from "@/src/categories";
import ExpenseForm, { FormState } from "@/src/components/ExpenseForm";
import { useToast } from "@/src/components/Toast";

export default function AddExpense() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { categories } = useCategories();
  const params = useLocalSearchParams<{ project_id?: string; work_order_id?: string }>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    vendor: "", amount: "", date: todayISO(),
    category: categories[0]?.name || "Makan",
    notes: "", is_billable: false,
    project_id: params.project_id || null,
    work_order_id: params.work_order_id || null,
  });

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast("Masukkan jumlah yang valid", "error"); return; }
    setSaving(true);
    try {
      await api.createExpense({
        vendor: (form.vendor.trim() || "Vendor Tidak Diketahui").toUpperCase(),
        amount: Number(form.amount),
        date: form.date,
        category: form.category,
        notes: form.notes,
        is_billable: form.is_billable,
        project_id: form.project_id,
        work_order_id: form.work_order_id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Pengeluaran ditambahkan", "success");
      router.back();
    } catch (e: any) { toast(e?.message || "Gagal menambah pengeluaran", "error"); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="add-close" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Tambah Pengeluaran</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={90} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <ExpenseForm value={form} onChange={patch} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable testID="save-add" onPress={save} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.saveText}>Simpan Pengeluaran</Text>}
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  saveBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { height: 52, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", ...shadow.card },
  saveText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
