import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius, type } from "@/src/theme";

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Hapus",
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.icon}><Ionicons name="trash" size={24} color={colors.error} /></View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{message}</Text>
          <View style={styles.actions}>
            <Pressable testID="confirm-cancel" onPress={onClose} style={[styles.btn, styles.cancel]}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable testID="confirm-ok" onPress={onConfirm} style={[styles.btn, styles.del]}>
              <Text style={styles.delText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,30,0.45)", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  icon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.error + "1A",
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  text: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md, alignSelf: "stretch" },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surfaceTertiary },
  cancelText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceTertiary },
  del: { backgroundColor: colors.error },
  delText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onError },
});
