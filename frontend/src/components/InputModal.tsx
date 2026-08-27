import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors, fonts, spacing, radius, type } from "@/src/theme";

export default function InputModal({
  visible,
  title,
  subtitle,
  placeholder,
  initialValue = "",
  confirmLabel = "Simpan",
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  placeholder: string;
  initialValue?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => { if (visible) setValue(initialValue); }, [visible, initialValue]);

  const submit = () => {
    const v = value.trim();
    if (v) onSubmit(v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
            <TextInput
              testID="input-modal-field"
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              autoFocus
              style={styles.input}
              onSubmitEditing={submit}
              returnKeyType="done"
            />
            <View style={styles.actions}>
              <Pressable testID="input-modal-cancel" onPress={onClose} style={[styles.btn, styles.cancel]}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable testID="input-modal-confirm" onPress={submit} style={[styles.btn, styles.confirm]}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,30,0.45)", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  sub: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, marginTop: -4 },
  input: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: fonts.medium, fontSize: type.lg, color: colors.onSurface, marginTop: spacing.sm,
  },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surfaceTertiary },
  cancelText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceTertiary },
  confirm: { backgroundColor: colors.brand },
  confirmText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
