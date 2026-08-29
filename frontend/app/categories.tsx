import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import type { Category } from "@/src/types";
import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { useCategories } from "@/src/categories";
import CategoryFormModal from "@/src/components/CategoryFormModal";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useToast } from "@/src/components/Toast";

export default function Categories() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { categories, refresh } = useCategories();
  const [localOrder, setLocalOrder] = useState<Category[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  // Pakai urutan lokal selama user masih drag/baru saja selesai drag, supaya tidak
  // "lompat" balik ke urutan lama sambil menunggu refresh dari server selesai.
  const list = localOrder ?? categories;

  const add = async (name: string, icon: string) => {
    try {
      await api.createCategory(name, icon);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddOpen(false);
      setLocalOrder(null);
      await refresh();
    } catch (e: any) { toast(e?.message || "Gagal menambah kategori", "error"); }
  };
  const save = async (name: string, icon: string) => {
    if (!editing) return;
    try {
      await api.updateCategory(editing.id, name, icon);
      setEditing(null);
      setLocalOrder(null);
      await refresh();
    } catch (e: any) { toast(e?.message || "Gagal mengubah", "error"); }
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      await api.deleteCategory(deleting.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleting(null);
      setLocalOrder(null);
      await refresh();
    } catch { toast("Gagal menghapus", "error"); }
  };

  const onDragEnd = async ({ data }: { data: Category[] }) => {
    setLocalOrder(data);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.reorderCategories(data.map((c) => c.id));
      await refresh();
    } catch {
      toast("Gagal menyimpan urutan", "error");
    } finally {
      setLocalOrder(null);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => (
    <ScaleDecorator>
      <View style={[styles.row, isActive && styles.rowActive]}>
        <Pressable testID={`cat-drag-${item.id}`} onLongPress={drag} disabled={isActive} style={styles.dragHandle} hitSlop={8}>
          <Ionicons name="reorder-three-outline" size={20} color={colors.muted} />
        </Pressable>
        <View style={[styles.icon, { backgroundColor: item.color + "18" }]}>
          <Ionicons name={item.icon as any} size={18} color={item.color} />
        </View>
        <Text style={styles.name}>{item.name}</Text>
        <Pressable testID={`cat-edit-${item.id}`} onPress={() => setEditing(item)} style={styles.rowBtn}>
          <Ionicons name="pencil" size={16} color={colors.muted} />
        </Pressable>
        <Pressable testID={`cat-delete-${item.id}`} onPress={() => setDeleting(item)} style={styles.rowBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </Pressable>
      </View>
    </ScaleDecorator>
  );

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

      <Text style={styles.hint}>
        Kategori dipakai saat mencatat pengeluaran di dalam work order. Tahan &amp; geser ikon di kiri untuk mengubah urutan.
      </Text>

      <DraggableFlatList
        data={list}
        keyExtractor={(item) => item.id}
        onDragEnd={onDragEnd}
        renderItem={renderItem}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        ListEmptyComponent={<Text style={styles.emptyText}>Belum ada kategori. Tambahkan yang pertama.</Text>}
      />

      <CategoryFormModal
        visible={addOpen}
        title="Kategori Baru"
        confirmLabel="Tambah"
        onClose={() => setAddOpen(false)}
        onSubmit={add}
      />
      <CategoryFormModal
        visible={!!editing}
        title="Ubah Kategori"
        initialName={editing?.name || ""}
        initialIcon={editing?.icon || "pricetag-outline"}
        initialColor={editing?.color || colors.brand}
        confirmLabel="Simpan"
        onClose={() => setEditing(null)}
        onSubmit={save}
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
  hint: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, padding: spacing.lg, paddingBottom: spacing.sm },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.brand, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  dragHandle: { width: 24, alignItems: "center", justifyContent: "center" },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  rowBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  emptyText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, paddingVertical: spacing.lg, textAlign: "center" },
});
