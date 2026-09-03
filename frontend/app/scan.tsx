import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import DocumentScanner, { ResponseType } from "react-native-document-scanner-plugin";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeIn } from "react-native-reanimated";

import { api } from "@/src/api";
import { colors, fonts, spacing, radius, type, shadow } from "@/src/theme";
import { todayISO, formatMoney, formatDate } from "@/src/lib";
import { useCategories } from "@/src/categories";
import ExpenseForm, { FormState } from "@/src/components/ExpenseForm";
import ReceiptEditor from "@/src/components/ReceiptEditor";
import { useToast } from "@/src/components/Toast";
import type { DuplicateInfo } from "@/src/types";
import { useAppLock } from "@/src/applock";

type Phase = "camera" | "edit" | "processing" | "review";
type Shot = { uri: string; width: number; height: number; mime?: string; name?: string };

// Screenshot biasanya sudah rapi/full-frame (bukan foto struk fisik yang miring/ada
// latar belakang meja dsb), jadi tidak perlu dipotong manual — langsung diproses.
function looksLikeScreenshot(name?: string | null, uri?: string): boolean {
  const n = (name || "").toLowerCase();
  const u = (uri || "").toLowerCase();
  return n.includes("screenshot") || n.includes("screen shot") || n.includes("tangkapan layar") ||
    u.includes("screenshot");
}

export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setLockSuppressed } = useAppLock();
  const cameraRef = useRef<CameraView>(null);
  const { categories } = useCategories();
  const params = useLocalSearchParams<{ project_id?: string; work_order_id?: string }>();

  // Izin kamera, pengambilan foto, dan proses OCR kadang memicu perpindahan status
  // app yang salah dikira "keluar app" di sebagian HP (beda-beda tiap merek) —
  // jeda kunci PIN/fingerprint selama masih di halaman scan ini supaya tidak
  // salah minta PIN di tengah proses.
  useEffect(() => {
    setLockSuppressed(true);
    return () => setLockSuppressed(false);
  }, []);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("camera");
  const [scannerFailed, setScannerFailed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    vendor: "", amount: "", date: todayISO(), category: categories[0]?.name || "Makan",
    notes: "", is_billable: false,
    project_id: params.project_id || null, work_order_id: params.work_order_id || null,
  });

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const process = useCallback(async (uri: string, name = "receipt.jpg", mime = "image/jpeg") => {
    setPhase("processing");
    setDuplicate(null);
    try {
      const res = await api.scan(uri, name, mime);
      const ex = res.extracted;
      setReceiptPath(res.receipt_path);
      setDuplicate(res.duplicate || null);
      setForm((f) => ({
        ...f,
        vendor: (ex.vendor || "").toUpperCase(),
        amount: ex.amount ? String(Math.round(ex.amount)) : "",
        date: ex.date || todayISO(),
        category: ex.category || categories[0]?.name || "Makan",
        notes: ex.notes || "",
      }));
      if (res.duplicate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast("Mirip dengan struk yang sudah ada", "info");
      } else if (res.extraction_failed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast("Struk tidak terbaca — isi manual", "info");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPhase("review");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast("Scan gagal. Coba lagi.", "error");
      setPhase("camera");
    }
  }, [categories, toast]);

  // Deteksi tepi dokumen otomatis (seperti CamScanner) — pakai scanner native
  // Android (ML Kit), tepi struk terdeteksi & di-crop sendiri, user tinggal
  // konfirmasi. Kalau scanner native gagal/tidak tersedia di HP tertentu,
  // otomatis jatuh ke kamera manual + crop biasa (fallback aman).
  const scanAuto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        responseType: ResponseType.ImageFilePath,
        croppedImageQuality: 90,
      });
      if (status === "success" && scannedImages && scannedImages.length > 0) {
        process(scannedImages[0], "receipt.jpg", "image/jpeg");
      }
      // status "cancel" -> user batal, tetap di layar ini, tidak perlu apa-apa
    } catch (e) {
      toast("Deteksi otomatis tidak tersedia di HP ini — pakai kamera manual", "info");
      setScannerFailed(true);
    } finally {
      setScanning(false);
    }
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) { setShot({ uri: photo.uri, width: photo.width, height: photo.height }); setPhase("edit"); }
    } catch { toast("Gagal mengambil foto", "error"); }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast("Butuh akses galeri untuk unggah struk", "info"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      const name = a.fileName || "receipt.jpg";
      const mime = a.mimeType || "image/jpeg";
      if (looksLikeScreenshot(name, a.uri)) {
        setShot({ uri: a.uri, width: a.width || 1000, height: a.height || 1400, mime, name });
        process(a.uri, name, mime);
      } else {
        setShot({ uri: a.uri, width: a.width || 1000, height: a.height || 1400, mime, name });
        setPhase("edit");
      }
    }
  };

  // Impor gambar langsung dari penyimpanan/Files (untuk gambar yang tidak ada di galeri foto,
  // misalnya yang diunduh dari WhatsApp/email). Hanya file gambar — tidak menerima PDF/dokumen lain.
  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const name = a.name || "receipt.jpg";
    const mime = a.mimeType || "image/jpeg";
    if (looksLikeScreenshot(name, a.uri)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShot({ uri: a.uri, width: 1000, height: 1400, mime, name });
      process(a.uri, name, mime);
    } else {
      setShot({ uri: a.uri, width: 1000, height: 1400, mime, name });
      setPhase("edit");
    }
  };

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast("Masukkan jumlah yang valid", "error"); return; }
    setSaving(true);
    try {
      await api.createExpense({
        vendor: (form.vendor.trim() || "Vendor Tidak Diketahui").toUpperCase(),
        amount: Number(form.amount),
        date: form.date,
        category: form.category,
        notes: form.notes,
        is_billable: form.is_billable,
        project_id: form.project_id,
        work_order_id: form.work_order_id,
        receipt_path: receiptPath,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Pengeluaran disimpan", "success");
      router.back();
    } catch (e: any) { toast(e?.message || "Gagal menyimpan", "error"); }
    finally { setSaving(false); }
  };

  // ---- Editor ----
  if (phase === "edit" && shot) {
    return (
      <ReceiptEditor
        uri={shot.uri}
        width={shot.width}
        height={shot.height}
        onCancel={() => setPhase("camera")}
        onDone={(u) => { setShot((s) => (s ? { ...s, uri: u } : s)); process(u, shot.name, shot.mime); }}
      />
    );
  }

  // ---- Processing ----
  if (phase === "processing") {
    return (
      <View style={styles.black}>
        {shot && <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={2} />}
        <View style={styles.scrim} />
        <Animated.View entering={FadeIn} style={styles.processing}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Membaca struk…</Text>
          <Text style={styles.processingSub}>AI mengekstrak vendor, total & kategori</Text>
        </Animated.View>
      </View>
    );
  }

  // ---- Review ----
  if (phase === "review") {
    return (
      <View style={styles.reviewScreen}>
        <View style={[styles.reviewHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="review-back" onPress={() => setPhase("camera")} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.reviewTitle}>Tinjau Pengeluaran</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView bottomOffset={90} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
          {shot && (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: shot.uri }} style={styles.thumb} contentFit="cover" />
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={13} color={colors.brandTertiary} />
                <Text style={styles.aiBadgeText}>Diekstrak AI</Text>
              </View>
            </View>
          )}
          {duplicate && (
            <View style={styles.dupBanner}>
              <View style={styles.dupHeader}>
                <Ionicons name="warning" size={16} color={colors.warning} />
                <Text style={styles.dupTitle}>Kemungkinan struk duplikat</Text>
              </View>
              <Text style={styles.dupText}>
                Sudah ada pengeluaran mirip: {duplicate.vendor} — {formatDate(duplicate.date)} — {formatMoney(duplicate.amount)}
              </Text>
              <View style={styles.dupActions}>
                <Pressable testID="dup-view-existing" onPress={() => router.push(`/expense/${duplicate.expense_id}`)} style={styles.dupBtn}>
                  <Text style={styles.dupBtnText}>Lihat yang lama</Text>
                </Pressable>
                <Pressable testID="dup-dismiss" onPress={() => setDuplicate(null)} style={[styles.dupBtn, styles.dupBtnGhost]}>
                  <Text style={[styles.dupBtnText, styles.dupBtnGhostText]}>Bukan duplikat, lanjutkan</Text>
                </Pressable>
              </View>
            </View>
          )}
          <ExpenseForm value={form} onChange={patch} />
        </KeyboardAwareScrollView>

        <KeyboardStickyView>
          <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <Pressable testID="save-expense" onPress={save} disabled={saving} style={styles.saveBtn}>
              {saving ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.saveText}>Simpan Pengeluaran</Text>}
            </Pressable>
          </View>
        </KeyboardStickyView>
      </View>
    );
  }

  // ---- Camera ----
  if (!permission) return <View style={styles.black}><ActivityIndicator color="#fff" /></View>;

  if (!permission.granted) {
    return (
      <View style={[styles.permWrap, { paddingTop: insets.top }]}>
        <Pressable testID="scan-close" onPress={() => router.back()} style={styles.permClose}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={styles.permBody}>
          <View style={styles.permIcon}><Ionicons name="camera" size={36} color="#fff" /></View>
          <Text style={styles.permTitle}>Scan struk kamu</Text>
          <Text style={styles.permText}>Arahkan kamera ke struk dan kami akan mengambil vendor, total, tanggal & kategori otomatis.</Text>
          {permission.canAskAgain ? (
            <Pressable testID="grant-camera" onPress={() => requestPermission()} style={styles.permBtn}>
              <Text style={styles.permBtnText}>Aktifkan Kamera</Text>
            </Pressable>
          ) : (
            <Pressable testID="open-settings" onPress={() => Linking.openSettings()} style={styles.permBtn}>
              <Text style={styles.permBtnText}>Buka Pengaturan</Text>
            </Pressable>
          )}
          <Pressable testID="upload-instead" onPress={pickImage} style={styles.permAlt}>
            <Ionicons name="image-outline" size={18} color="#fff" />
            <Text style={styles.permAltText}>Unggah dari galeri</Text>
          </Pressable>
          <Pressable testID="import-document" onPress={pickDocument} style={styles.permAlt}>
            <Ionicons name="document-attach-outline" size={18} color="#fff" />
            <Text style={styles.permAltText}>Impor gambar dari file</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!scannerFailed) {
    return (
      <View style={styles.black}>
        <View style={[styles.camTop, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="scan-close" onPress={() => router.back()} style={styles.roundBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.autoScanBody}>
          <View style={styles.autoScanIcon}><Ionicons name="scan" size={40} color="#fff" /></View>
          <Text style={styles.permTitle}>Scan Struk Otomatis</Text>
          <Text style={styles.permText}>Tepi struk terdeteksi & dipotong sendiri — kamu tinggal konfirmasi atau geser dikit kalau kurang pas.</Text>
          <Pressable testID="scan-auto" onPress={scanAuto} disabled={scanning} style={styles.permBtn}>
            {scanning ? <ActivityIndicator color={colors.onSurface} /> : <Text style={styles.permBtnText}>Mulai Scan</Text>}
          </Pressable>
          <View style={styles.autoScanAlts}>
            <Pressable testID="pick-gallery" onPress={pickImage} style={styles.permAlt}>
              <Ionicons name="image-outline" size={18} color="#fff" />
              <Text style={styles.permAltText}>Unggah dari galeri</Text>
            </Pressable>
            <Pressable testID="import-document" onPress={pickDocument} style={styles.permAlt}>
              <Ionicons name="document-attach-outline" size={18} color="#fff" />
              <Text style={styles.permAltText}>Impor gambar dari file</Text>
            </Pressable>
            <Pressable testID="use-manual-camera" onPress={() => setScannerFailed(true)} style={styles.permAlt}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.permAltText}>Pakai kamera manual + crop</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={[styles.camTop, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="scan-close" onPress={() => router.back()} style={styles.roundBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.camHint}>Posisikan struk dalam bingkai</Text>
        <Pressable testID="back-to-auto" onPress={() => setScannerFailed(false)} style={styles.roundBtn}>
          <Ionicons name="scan-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.reticle} pointerEvents="none">
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>

      <View style={[styles.camBottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable testID="pick-gallery" onPress={pickImage} style={styles.roundBtn}>
          <Ionicons name="images" size={24} color="#fff" />
        </Pressable>
        <Pressable testID="capture-btn" onPress={capture} style={styles.shutterOuter}>
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable testID="import-document" onPress={pickDocument} style={styles.roundBtn}>
          <Ionicons name="document-attach" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  camTop: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  camHint: { fontFamily: fonts.medium, fontSize: type.base, color: "#fff", opacity: 0.9 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  reticle: { position: "absolute", top: "22%", bottom: "26%", left: "10%", right: "10%" },
  corner: { position: "absolute", width: 32, height: 32, borderColor: "#fff" },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  camBottom: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28,28,30,0.7)" },
  processing: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  processingText: { fontFamily: fonts.bold, fontSize: type.xl, color: "#fff", marginTop: spacing.md },
  processingSub: { fontFamily: fonts.regular, fontSize: type.base, color: "rgba(255,255,255,0.7)", textAlign: "center" },
  permWrap: { flex: 1, backgroundColor: colors.surfaceInverse },
  permClose: { margin: spacing.lg, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  permBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  permIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  permTitle: { fontFamily: fonts.bold, fontSize: type["2xl"], color: "#fff" },
  permText: { fontFamily: fonts.regular, fontSize: type.lg, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: spacing.md, lineHeight: 24 },
  permBtn: { backgroundColor: "#fff", paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.pill, marginTop: spacing.xl },
  permBtnText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  permAlt: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xl },
  permAltText: { fontFamily: fonts.medium, fontSize: type.base, color: "#fff" },
  autoScanBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  autoScanIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  autoScanAlts: { alignItems: "center", marginTop: spacing.sm },
  reviewScreen: { flex: 1, backgroundColor: colors.surface },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  reviewTitle: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  thumbWrap: { alignItems: "center", marginBottom: spacing.xl },
  dupBanner: { backgroundColor: colors.warning + "14", borderWidth: 1, borderColor: colors.warning + "40", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  dupHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  dupTitle: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.warning },
  dupText: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurface },
  dupActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  dupBtn: { flex: 1, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.warning },
  dupBtnText: { fontFamily: fonts.semibold, fontSize: type.sm, color: "#fff" },
  dupBtnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.warning },
  dupBtnGhostText: { color: colors.warning },
  thumb: { width: 120, height: 150, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm, backgroundColor: colors.brandTertiary + "1A", paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  aiBadgeText: { fontFamily: fonts.semibold, fontSize: type.sm, color: colors.brandTertiary },
  saveBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { height: 52, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", ...shadow.card },
  saveText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceInverse },
});
