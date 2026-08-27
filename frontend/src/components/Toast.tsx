import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tp: ToastType = "info") => {
    setToast({ message, type: tp });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const icon =
    toast?.type === "success" ? "checkmark-circle" : toast?.type === "error" ? "alert-circle" : "information-circle";
  const tint =
    toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.error : colors.brand;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOutUp}
          style={[styles.toast, { top: insets.top + spacing.sm }]}
          pointerEvents="box-none"
        >
          <Pressable testID="toast" onPress={() => setToast(null)} style={styles.inner}>
            <Ionicons name={icon as any} size={20} color={tint} />
            <Text style={styles.text} numberOfLines={2}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
    maxWidth: 480,
    width: "100%",
  },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface },
});
