import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius, type } from "@/src/theme";

type Option = { id: string; label: string; sub?: string };

export default function WorkOrderPickerModal({
  visible,
  options,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  options: Option[];
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Default: semua tercentang setiap modal dibuka (sama seperti perilaku lama: semua WO ikut)
  useEffect(() => {
    if (visible) setSelected(new Set(options.map((o) => o.id)));
  }, [visible, options]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allChecked = selected.size === options.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(options.map((o) => o.id)));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Pilih Work Order</Text>
          <Text style={styles.subtitle}>Cuma work order yang dicentang yang masuk laporan PDF.</Text>

          <Pressable testID="wo-picker-toggle-all" onPress={toggleAll} style={styles.selectAllRow}>
            <Ionicons name={allChecked ? "checkbox" : "square-outline"} size={20} color={allChecked ? colors.brand : colors.muted} />
            <Text style={styles.selectAllText}>{allChecked ? "Batalkan semua" : "Pilih semua"}</Text>
          </Pressable>

          <FlatList
            data={options}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 320 }}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            renderItem={({ item }) => {
              const checked = selected.has(item.id);
              return (
                <Pressable testID={`wo-picker-item-${item.id}`} onPress={() => toggle(item.id)} style={styles.optionRow}>
                  <Ionicons name={checked ? "checkbox" : "square-outline"} size={20} color={checked ? colors.brand : colors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel} numberOfLines={1}>{item.label}</Text>
                    {!!item.sub && <Text style={styles.optionSub} numberOfLines={1}>{item.sub}</Text>}
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.actions}>
            <Pressable testID="wo-picker-cancel" onPress={onClose} style={[styles.btn, styles.cancel]}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              testID="wo-picker-confirm"
              onPress={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0}
              style={[styles.btn, styles.confirm, selected.size === 0 && { opacity: 0.5 }]}
            >
              <Text style={styles.confirmText}>Generate PDF</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,30,0.45)", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, marginBottom: spacing.xs },
  selectAllRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  selectAllText: { fontFamily: fonts.semibold, fontSize: type.sm, color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.divider },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  optionLabel: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface },
  optionSub: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, marginTop: 1 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surfaceTertiary },
  cancelText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceTertiary },
  confirm: { backgroundColor: colors.brand },
  confirmText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
