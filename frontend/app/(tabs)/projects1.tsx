import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import type { Project } from "@/src/types";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { formatMoney } from "@/src/lib";
import InputModal from "@/src/components/InputModal";
import { useToast } from "@/src/components/Toast";

export default function Projects() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try { setProjects(await api.projects()); }
    catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addProject = async (name: string) => {
    try {
      await api.createProject(name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      load();
    } catch { toast("Gagal membuat proyek", "error"); }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Proyek</Text>
          <Pressable testID="add-project" onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={colors.onSurfaceInverse} />
          </Pressable>
        </View>
        <Pressable testID="manage-categories" onPress={() => router.push("/categories")} style={styles.catLink}>
          <Ionicons name="pricetags-outline" size={16} color={colors.onSurface} />
          <Text style={styles.catLinkText}>Kelola Kategori</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brand} /></View>
      ) : projects.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="folder-open-outline" size={40} color={colors.brandTertiary} /></View>
          <Text style={styles.emptyTitle}>Belum ada proyek</Text>
          <Text style={styles.emptyText}>Buat proyek untuk mengelompokkan work order dan pengeluarannya.</Text>
          <Pressable testID="empty-add-project" onPress={() => setShowAdd(true)} style={styles.emptyBtn}>
            <Ionicons name="add" size={18} color={colors.onSurfaceInverse} />
            <Text style={styles.emptyBtnText}>Buat proyek</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: spacing.md }} showsVerticalScrollIndicator={false}>
          {projects.map((p) => (
            <Pressable key={p.id} testID={`project-card-${p.id}`} onPress={() => router.push(`/project/${p.id}`)} style={styles.card}>
              <View style={styles.cardIcon}><Ionicons name="folder" size={22} color={colors.brandTertiary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                {p.client ? <Text style={styles.cardClient} numberOfLines={1}>{p.client}</Text> : null}
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{p.work_order_count ?? 0} WO</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{p.expense_count ?? 0} transaksi</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardTotal}>{formatMoney(p.total ?? 0)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <InputModal
        visible={showAdd}
        title="Proyek Baru"
        subtitle="Kelompokkan work order & pengeluaran"
        placeholder="mis. Proyek Gedung A"
        confirmLabel="Buat"
        onClose={() => setShowAdd(false)}
        onSubmit={addProject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  catLink: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 44, marginTop: spacing.md },
  catLinkText: { flex: 1, fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  loader: { paddingVertical: spacing.xxxl },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandTertiary + "18", alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  emptyTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, marginTop: spacing.xl },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.brandTertiary + "18", alignItems: "center", justifyContent: "center" },
  cardName: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  cardClient: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, marginTop: 1 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.muted },
  metaDot: { color: colors.muted },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardTotal: { fontFamily: fonts.display, fontSize: type.lg, color: colors.onSurface },
});
