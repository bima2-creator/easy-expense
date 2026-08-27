import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import type { Category } from "@/src/types";
import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { useCategories } from "@/src/categories";
import InputModal from "@/src/components/InputModal";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useToast } from "@/src/components/Toast";

export default function Categories() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { categories, refresh } = useCategories();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const add = async (name: string) => {
    try {
      await api.createCategory(name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddOpen(false);
      await refresh();
    } catch (e: any) { toast(e?.message || "Gagal menambah kategori", "error"); }
  };
  const rename = async (name: string) => {
    if (!editing) return;
    try {
      await api.updateCategory(editing.id, name);
      setEditing(null);
      await refresh();
    } catch (e: any) { toast(e?.message || "Gagal mengubah", "error"); }
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      await api.deleteCategory(deleting.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleting(null);
      await refresh();
    } catch { toast("Gagal menghapus", "error"); }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="cat-back" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Kategori</Text>
        <Pressable testID="cat-add" onPress={() => setAddOpen(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>Kategori dipakai saat mencatat pengeluaran di dalam work order.</Text>
        <View style={styles.card}>
          {categories.map((c, i) => (
            <View key={c.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: c.color + "18" }]}>
                <Ionicons name={c.icon as any} size={18} color={c.color} />
              </View>
              <Text style={styles.name}>{c.name}</Text>
              <Pressable testID={`cat-edit-${c.id}`} onPress={() => setEditing(c)} style={styles.rowBtn}>
                <Ionicons name="pencil" size={16} color={colors.muted} />
              </Pressable>
              <Pressable testID={`cat-delete-${c.id}`} onPress={() => setDeleting(c)} style={styles.rowBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </Pressable>
            </View>
          ))}
          {categories.length === 0 && (
            <Text style={styles.emptyText}>Belum ada kategori. Tambahkan yang pertama.</Text>
          )}
        </View>
      </ScrollView>

      <InputModal
        visible={addOpen}
        title="Kategori Baru"
        placeholder="mis. Parkir"
        confirmLabel="Tambah"
        onClose={() => setAddOpen(false)}
        onSubmit={add}
      />
      <InputModal
        visible={!!editing}
        title="Ubah Kategori"
        placeholder="Nama kategori"
        initialValue={editing?.name || ""}
        confirmLabel="Simpan"
        onClose={() => setEditing(null)}
        onSubmit={rename}
      />
      <ConfirmModal
        visible={!!deleting}
        title="Hapus kategori?"
        message={`"${deleting?.name}" akan dihapus. Pengeluaran lama tetap tersimpan.`}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  hint: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, marginBottom: spacing.md },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  rowBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  emptyText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, paddingVertical: spacing.lg, textAlign: "center" },
});
