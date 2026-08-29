import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { useAppLock, LOCK_TIMEOUT_OPTIONS } from "@/src/applock";
import { useCategories } from "@/src/categories";
import { api, backupUrl, API_KEY_HEADERS } from "@/src/api";
import { useToast } from "@/src/components/Toast";
import InputModal from "@/src/components/InputModal";
import ConfirmModal from "@/src/components/ConfirmModal";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { refresh: refreshCategories } = useCategories();
  const { enabled, timeoutMinutes, setupPin, disableLock, setTimeoutMinutes } = useAppLock();

  const [pinStep, setPinStep] = useState<"none" | "new" | "confirm">("none");
  const [firstPin, setFirstPin] = useState("");
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<{ uri: string; name: string } | null>(null);

  const doBackup = async () => {
    setBackingUp(true);
    try {
      const url = backupUrl();
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        const target = FileSystem.cacheDirectory + `easy-expense-backup-${Date.now()}.zip`;
        const { uri } = await FileSystem.downloadAsync(url, target, { headers: API_KEY_HEADERS });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/zip" });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      toast("Gagal membuat backup", "error");
    } finally {
      setBackingUp(false);
    }
  };

  const pickRestoreFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/zip", copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setRestoreConfirm({ uri: a.uri, name: a.name || "backup.zip" });
  };

  const doRestore = async () => {
    if (!restoreConfirm) return;
    setRestoring(true);
    try {
      const result = await api.restoreBackup(restoreConfirm.uri, restoreConfirm.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const r = result.restored || {};
      toast(
        `Restore selesai: ${r.categories ?? 0} kategori, ${r.projects ?? 0} proyek, ${r.work_orders ?? 0} WO, ${r.expenses ?? 0} pengeluaran`,
        "success",
      );
      await refreshCategories();
    } catch (e: any) {
      toast(e?.message || "Gagal restore backup", "error");
    } finally {
      setRestoring(false);
      setRestoreConfirm(null);
    }
  };

  const onTogglePin = (value: boolean) => {
    if (value) {
      setPinStep("new");
    } else {
      setDisableConfirmOpen(true);
    }
  };

  const onNewPinSubmit = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 4) {
      toast("PIN harus 4 digit angka", "error");
      return;
    }
    setFirstPin(digits);
    setPinStep("confirm");
  };

  const onConfirmPinSubmit = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits !== firstPin) {
      toast("PIN tidak cocok, coba lagi", "error");
      setPinStep("new");
      setFirstPin("");
      return;
    }
    await setupPin(digits);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast("Kunci PIN aktif", "success");
    setPinStep("none");
    setFirstPin("");
  };

  const confirmDisable = async () => {
    await disableLock();
    setDisableConfirmOpen(false);
    toast("Kunci PIN dimatikan", "success");
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="settings-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Pengaturan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={styles.sectionTitle}>Umum</Text>
        <Pressable testID="settings-categories" onPress={() => router.push("/categories")} style={styles.row}>
          <Ionicons name="pricetags-outline" size={20} color={colors.onSurface} />
          <Text style={styles.rowText}>Kelola Kategori</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Text style={styles.sectionTitle}>Keamanan</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.onSurface} />
            <Text style={styles.rowText}>Kunci Aplikasi dengan PIN</Text>
            <Switch testID="settings-lock-toggle" value={enabled} onValueChange={onTogglePin} />
          </View>

          {enabled && (
            <>
              <View style={styles.divider} />
              <Pressable testID="settings-change-pin" onPress={() => setPinStep("new")} style={styles.cardRow}>
                <Ionicons name="key-outline" size={20} color={colors.onSurface} />
                <Text style={styles.rowText}>Ubah PIN</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>

              <View style={styles.divider} />
              <Text style={styles.subLabel}>Kunci otomatis setelah</Text>
              <View style={styles.timeoutRow}>
                {LOCK_TIMEOUT_OPTIONS.map((opt) => {
                  const active = timeoutMinutes === opt.minutes;
                  return (
                    <Pressable
                      key={opt.minutes}
                      testID={`timeout-${opt.minutes}`}
                      onPress={() => setTimeoutMinutes(opt.minutes)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Pressable testID="settings-backup" onPress={doBackup} disabled={backingUp} style={styles.cardRow}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.onSurface} />
            <Text style={styles.rowText}>Backup Data</Text>
            {backingUp ? <ActivityIndicator size="small" color={colors.muted} /> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
          </Pressable>
          <View style={styles.divider} />
          <Pressable testID="settings-restore" onPress={pickRestoreFile} disabled={restoring} style={styles.cardRow}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.onSurface} />
            <Text style={styles.rowText}>Restore Data</Text>
            {restoring ? <ActivityIndicator size="small" color={colors.muted} /> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
          </Pressable>
          <Text style={styles.hint}>
            Backup menyimpan semua kategori, proyek, work order, pengeluaran, dan foto struk jadi satu file .zip.
            Restore aman dijalankan berkali-kali — data tidak akan menjadi dobel.
          </Text>
        </View>
      </ScrollView>

      <InputModal
        visible={pinStep === "new"}
        title="Buat PIN Baru"
        subtitle="Masukkan 4 digit angka"
        placeholder="1234"
        confirmLabel="Lanjut"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        onClose={() => { setPinStep("none"); setFirstPin(""); }}
        onSubmit={onNewPinSubmit}
      />
      <InputModal
        visible={pinStep === "confirm"}
        title="Konfirmasi PIN"
        subtitle="Masukkan ulang 4 digit yang sama"
        placeholder="1234"
        confirmLabel="Simpan"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        onClose={() => { setPinStep("none"); setFirstPin(""); }}
        onSubmit={onConfirmPinSubmit}
      />
      <ConfirmModal
        visible={disableConfirmOpen}
        title="Matikan Kunci PIN?"
        message="Aplikasi tidak akan meminta PIN lagi saat dibuka."
        confirmLabel="Matikan"
        onClose={() => setDisableConfirmOpen(false)}
        onConfirm={confirmDisable}
      />
      <ConfirmModal
        visible={!!restoreConfirm}
        title="Restore data ini?"
        message={`Data dari "${restoreConfirm?.name}" akan digabungkan dengan data yang ada sekarang. Aman diulang, tidak akan menggandakan data.`}
        confirmLabel="Restore"
        onClose={() => setRestoreConfirm(null)}
        onConfirm={doRestore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: type.sm, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  rowText: { flex: 1, fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: -spacing.lg },
  subLabel: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.muted, paddingTop: spacing.lg },
  hint: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, paddingVertical: spacing.md, lineHeight: 18 },
  timeoutRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingVertical: spacing.md },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.onSurface },
  chipTextActive: { color: colors.onSurfaceInverse },
});
