import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { useAppLock } from "@/src/applock";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { verifyPin, unlock } = useAppLock();
  const [digits, setDigits] = useState("");
  const [error, setError] = useState(false);

  const onKey = useCallback(
    async (key: string) => {
      if (key === "") return;
      if (key === "back") {
        setDigits((d) => d.slice(0, -1));
        setError(false);
        return;
      }
      const next = (digits + key).slice(0, 4);
      setDigits(next);
      setError(false);
      if (next.length === 4) {
        const ok = await verifyPin(next);
        if (ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          unlock();
          setDigits("");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(true);
          setTimeout(() => setDigits(""), 400);
        }
      } else {
        Haptics.selectionAsync();
      }
    },
    [digits, verifyPin, unlock]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={28} color={colors.onSurfaceInverse} />
      </View>
      <Text style={styles.title}>Aplikasi Terkunci</Text>
      <Text style={styles.subtitle}>{error ? "PIN salah, coba lagi" : "Masukkan PIN untuk lanjut"}</Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < digits.length && styles.dotFilled, error && styles.dotError]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((k, i) => (
          <Pressable
            key={i}
            testID={`lock-key-${k || "empty" + i}`}
            disabled={k === ""}
            onPress={() => onKey(k)}
            style={({ pressed }) => [styles.key, pressed && k !== "" && styles.keyPressed]}
          >
            {k === "back" ? (
              <Ionicons name="backspace-outline" size={22} color={colors.onSurfaceInverse} />
            ) : (
              <Text style={styles.keyText}>{k}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceInverse, alignItems: "center", paddingHorizontal: spacing.xl },
  iconWrap: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: "#ffffff1a", alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurfaceInverse },
  subtitle: { fontFamily: fonts.regular, fontSize: type.base, color: "#8A8A8D", marginTop: spacing.xs },
  dotsRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xxxl, marginBottom: spacing.xxxl },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: "#8A8A8D" },
  dotFilled: { backgroundColor: colors.onSurfaceInverse, borderColor: colors.onSurfaceInverse },
  dotError: { borderColor: colors.error, backgroundColor: colors.error },
  keypad: { flexDirection: "row", flexWrap: "wrap", width: 264, justifyContent: "space-between" },
  key: { width: 76, height: 76, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  keyPressed: { backgroundColor: "#ffffff1a" },
  keyText: { fontFamily: fonts.display, fontSize: type["2xl"], color: colors.onSurfaceInverse },
});
