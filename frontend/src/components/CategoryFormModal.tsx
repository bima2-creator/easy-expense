import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius, type } from "@/src/theme";
import IconPickerModal from "@/src/components/IconPickerModal";

export default function CategoryFormModal({
  visible,
  title,
  initialName = "",
  initialIcon = "pricetag-outline",
  initialColor = colors.brand,
  confirmLabel = "Simpan",
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  initialName?: string;
  initialIcon?: string;
  initialColor?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (name: string, icon: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setIcon(initialIcon);
    }
  }, [visible, initialName, initialIcon]);

  const submit = () => {
    const v = name.trim();
    if (v) onSubmit(v.toUpperCase(), icon);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>

            <TextInput
              testID="category-form-name"
              value={name}
              onChangeText={setName}
              placeholder="mis. PARKIR"
              placeholderTextColor={colors.muted}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              onSubmitEditing={submit}
              returnKeyType="done"
            />

            <Text style={styles.label}>Ikon</Text>
            <Pressable testID="category-form-icon-trigger" onPress={() => setPickerOpen(true)} style={styles.iconRow}>
              <View style={[styles.iconPreview, { backgroundColor: initialColor + "18" }]}>
                <Ionicons name={icon as any} size={20} color={initialColor} />
              </View>
              <Text style={styles.iconRowText}>Ketuk untuk ganti ikon</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            <View style={styles.actions}>
              <Pressable testID="category-form-cancel" onPress={onClose} style={[styles.btn, styles.cancel]}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable testID="category-form-confirm" onPress={submit} style={[styles.btn, styles.confirm]}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      <IconPickerModal
        visible={pickerOpen}
        selected={icon}
        onClose={() => setPickerOpen(false)}
        onSelect={(picked) => { setIcon(picked); setPickerOpen(false); }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,30,0.45)", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  label: { fontFamily: fonts.semibold, fontSize: type.sm, color: colors.muted, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: fonts.medium, fontSize: type.lg, color: colors.onSurface,
  },
  iconRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  iconPreview: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  iconRowText: { flex: 1, fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surfaceTertiary },
  cancelText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceTertiary },
  confirm: { backgroundColor: colors.brand },
  confirmText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
