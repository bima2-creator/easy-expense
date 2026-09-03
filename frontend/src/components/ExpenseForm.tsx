import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { formatMoney, formatDate } from "@/src/lib";
import { api } from "@/src/api";
import type { Project, WorkOrder } from "@/src/types";
import { useCategories } from "@/src/categories";
import InputModal from "@/src/components/InputModal";

export type FormState = {
  vendor: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
  is_billable: boolean;
  project_id: string | null;
  work_order_id: string | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function ExpenseForm({
  value,
  onChange,
}: {
  value: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  const { categories, refresh: refreshCats } = useCategories();
  const [topProjects, setTopProjects] = useState<Project[]>([]);
  const [activeTopId, setActiveTopId] = useState<string | null>(null);
  const [subProjects, setSubProjects] = useState<Project[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [modal, setModal] = useState<null | "project" | "subproject" | "workorder">(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parsedDate = (() => {
    const d = new Date(`${value.date}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed" || !selected) return;
    const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`;
    onChange({ date: iso });
  };

  useEffect(() => { api.projects().then(setTopProjects).catch(() => {}); }, []);

  // value.project_id bisa jadi proyek level teratas ATAU sub-proyek. Setiap kali
  // berubah (termasuk saat pertama kali edit pengeluaran lama), cari tahu proyek
  // induknya supaya chip "PROYEK" tetap nyala di induk yang benar, lalu muat
  // daftar sub-proyek & work order sesuai scope yang sedang aktif.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value.project_id) {
        setActiveTopId(null); setSubProjects([]); setWorkOrders([]);
        return;
      }
      try {
        const proj = await api.getProject(value.project_id);
        if (cancelled) return;
        const topId = proj.parent_id || proj.id;
        setActiveTopId(topId);
        const [subs, wos] = await Promise.all([api.subProjects(topId), api.workOrders(value.project_id)]);
        if (cancelled) return;
        setSubProjects(subs);
        setWorkOrders(wos);
      } catch {
        if (!cancelled) { setSubProjects([]); setWorkOrders([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [value.project_id]);

  const addProject = async (name: string) => {
    try {
      const p = await api.createProject(name);
      setTopProjects((prev) => [p, ...prev]);
      onChange({ project_id: p.id, work_order_id: null });
    } catch {}
    setModal(null);
  };
  const addSubProject = async (name: string) => {
    if (!activeTopId) return;
    try {
      const sp = await api.createProject(name, undefined, activeTopId);
      setSubProjects((prev) => [sp, ...prev]);
      onChange({ project_id: sp.id, work_order_id: null });
    } catch {}
    setModal(null);
  };
  const addWorkOrder = async (name: string) => {
    if (!value.project_id) return;
    try {
      const w = await api.createWorkOrder(value.project_id, name);
      setWorkOrders((prev) => [w, ...prev]);
      onChange({ work_order_id: w.id });
    } catch {}
    setModal(null);
  };

  return (
    <View style={styles.container}>
      <Field label="VENDOR / TOKO">
        <TextInput
          testID="form-vendor-input"
          value={value.vendor}
          onChangeText={(t) => onChange({ vendor: t })}
          placeholder="mis. WARTEG BAHARI"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
      </Field>

      <Field label="JUMLAH">
        <View style={styles.amountWrap}>
          <Text style={styles.currencyPrefix}>Rp</Text>
          <TextInput
            testID="form-amount-input"
            value={value.amount}
            onChangeText={(t) => onChange({ amount: t.replace(/[^0-9]/g, "") })}
            placeholder="0"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={[styles.input, styles.amountInput]}
          />
        </View>
        {value.amount ? <Text style={styles.amountPreview}>{formatMoney(Number(value.amount))}</Text> : null}
      </Field>

      <Field label="TANGGAL">
        <Pressable testID="form-date-input" onPress={() => setShowDatePicker(true)} style={[styles.input, styles.dateInput]}>
          <Text style={styles.dateText}>{formatDate(value.date)}</Text>
          <Ionicons name="calendar-outline" size={20} color={colors.muted} />
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={parsedDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "calendar"}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}
      </Field>

      <Field label="PROYEK">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            testID="form-project-none"
            onPress={() => onChange({ project_id: null, work_order_id: null })}
            style={[styles.smallChip, !value.project_id && styles.smallChipActive]}
          >
            <Text style={[styles.smallChipText, !value.project_id && styles.smallChipTextActive]}>Tanpa Proyek</Text>
          </Pressable>
          {topProjects.map((p) => {
            const active = activeTopId === p.id;
            return (
              <Pressable
                key={p.id}
                testID={`form-project-${p.id}`}
                onPress={() => onChange({ project_id: p.id, work_order_id: null })}
                style={[styles.smallChip, active && styles.smallChipActive]}
              >
                <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{p.name}</Text>
              </Pressable>
            );
          })}
          <Pressable testID="form-project-add" onPress={() => setModal("project")} style={styles.addChip}>
            <Ionicons name="add" size={16} color={colors.brandTertiary} />
            <Text style={styles.addChipText}>Proyek</Text>
          </Pressable>
        </ScrollView>
      </Field>

      {activeTopId && subProjects.length > 0 ? (
        <Field label="SUB-PROYEK">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              testID="form-subproject-none"
              onPress={() => onChange({ project_id: activeTopId, work_order_id: null })}
              style={[styles.smallChip, value.project_id === activeTopId && styles.smallChipActive]}
            >
              <Text style={[styles.smallChipText, value.project_id === activeTopId && styles.smallChipTextActive]}>Langsung di Proyek Ini</Text>
            </Pressable>
            {subProjects.map((sp) => {
              const active = value.project_id === sp.id;
              return (
                <Pressable
                  key={sp.id}
                  testID={`form-subproject-${sp.id}`}
                  onPress={() => onChange({ project_id: sp.id, work_order_id: null })}
                  style={[styles.smallChip, active && styles.smallChipActive]}
                >
                  <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{sp.name}</Text>
                </Pressable>
              );
            })}
            <Pressable testID="form-subproject-add" onPress={() => setModal("subproject")} style={styles.addChip}>
              <Ionicons name="add" size={16} color={colors.brandTertiary} />
              <Text style={styles.addChipText}>Sub-Proyek</Text>
            </Pressable>
          </ScrollView>
        </Field>
      ) : null}

      {value.project_id ? (
        <Field label="WORK ORDER">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              testID="form-wo-none"
              onPress={() => onChange({ work_order_id: null })}
              style={[styles.smallChip, !value.work_order_id && styles.smallChipActive]}
            >
              <Text style={[styles.smallChipText, !value.work_order_id && styles.smallChipTextActive]}>Tanpa WO</Text>
            </Pressable>
            {workOrders.map((w) => {
              const active = value.work_order_id === w.id;
              return (
                <Pressable
                  key={w.id}
                  testID={`form-wo-${w.id}`}
                  onPress={() => onChange({ work_order_id: w.id })}
                  style={[styles.smallChip, active && styles.smallChipActive]}
                >
                  <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{w.name}</Text>
                </Pressable>
              );
            })}
            <Pressable testID="form-wo-add" onPress={() => setModal("workorder")} style={styles.addChip}>
              <Ionicons name="add" size={16} color={colors.brandTertiary} />
              <Text style={styles.addChipText}>WO</Text>
            </Pressable>
          </ScrollView>
        </Field>
      ) : null}

      <Field label="KATEGORI">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((c) => {
            const active = value.category === c.name;
            return (
              <Pressable
                key={c.id}
                testID={`form-category-${c.name}`}
                onPress={() => onChange({ category: c.name })}
                style={[styles.catChip, active && { backgroundColor: c.color, borderColor: c.color }]}
              >
                <Ionicons name={c.icon as any} size={14} color={active ? "#fff" : c.color} />
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Field>

      <Field label="CATATAN">
        <TextInput
          testID="form-notes-input"
          value={value.notes}
          onChangeText={(t) => onChange({ notes: t })}
          placeholder="Deskripsi opsional"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.notes]}
        />
      </Field>

      <InputModal
        visible={modal === "project"}
        title="Proyek Baru"
        subtitle="Kelompokkan pengeluaran per proyek"
        placeholder="mis. PROYEK GEDUNG A"
        confirmLabel="Buat"
        uppercase
        onClose={() => setModal(null)}
        onSubmit={addProject}
      />
      <InputModal
        visible={modal === "subproject"}
        title="Sub-Proyek Baru"
        subtitle="Pecah proyek jadi beberapa lokasi/site"
        placeholder="mis. SITE JAKARTA"
        confirmLabel="Buat"
        uppercase
        onClose={() => setModal(null)}
        onSubmit={addSubProject}
      />
      <InputModal
        visible={modal === "workorder"}
        title="Work Order Baru"
        subtitle="Rincian pekerjaan dalam proyek"
        placeholder="mis. WO-001 INSTALASI"
        confirmLabel="Buat"
        uppercase
        onClose={() => setModal(null)}
        onSubmit={addWorkOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.8, color: colors.muted },
  input: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: fonts.medium, fontSize: type.lg, color: colors.onSurface,
  },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { fontFamily: fonts.medium, fontSize: type.lg, color: colors.onSurface },
  amountWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingLeft: spacing.lg,
  },
  currencyPrefix: { fontFamily: fonts.display, fontSize: type.lg, color: colors.onSurface },
  amountInput: { flex: 1, borderWidth: 0, backgroundColor: "transparent", fontFamily: fonts.display, fontSize: type.xl, paddingLeft: spacing.sm },
  amountPreview: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.brandTertiary, marginLeft: spacing.xs },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  smallChip: {
    flexShrink: 0, paddingHorizontal: spacing.lg, height: 40, justifyContent: "center",
    borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  smallChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  smallChipText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurfaceTertiary },
  smallChipTextActive: { color: colors.onSurfaceInverse },
  catChip: {
    flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md,
    height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  catChipText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface },
  catChipTextActive: { color: "#fff", fontFamily: fonts.semibold },
  addChip: {
    flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md,
    height: 40, borderRadius: radius.pill, borderWidth: 1, borderStyle: "dashed", borderColor: colors.brandTertiary,
  },
  addChipText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.brandTertiary },
  notes: { minHeight: 72, textAlignVertical: "top", paddingTop: spacing.md },
});
