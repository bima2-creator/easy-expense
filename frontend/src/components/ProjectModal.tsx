import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors, fonts, spacing, radius, type } from "@/src/theme";

export default function ProjectModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const submit = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName("");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>New Project</Text>
            <Text style={styles.sub}>Group related expenses together</Text>
            <TextInput
              testID="project-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Client ACME"
              placeholderTextColor={colors.muted}
              autoFocus
              style={styles.input}
              onSubmitEditing={submit}
            />
            <View style={styles.actions}>
              <Pressable testID="project-cancel" onPress={onClose} style={[styles.btn, styles.cancel]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable testID="project-create" onPress={submit} style={[styles.btn, styles.create]}>
                <Text style={styles.createText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,28,30,0.45)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  sub: { fontFamily: fonts.regular, fontSize: type.base, color: colors.muted, marginTop: -4 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.medium,
    fontSize: type.lg,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surfaceTertiary },
  cancelText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceTertiary },
  create: { backgroundColor: colors.brand },
  createText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
