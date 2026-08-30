import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, PanResponder, ActivityIndicator, LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing, radius, type } from "@/src/theme";

type Rect = { left: number; top: number; right: number; bottom: number };
const MIN = 60;
const HANDLE = 52; // area sentuh diperbesar dari 30 -> 52, jauh lebih gampang dipegang
const DRAG_LIFT = 64; // titik crop digeser ke atas sejauh ini saat drag, biar tidak ketutup jari

export default function ReceiptEditor({
  uri,
  width,
  height,
  onCancel,
  onDone,
}: {
  uri: string;
  width: number;
  height: number;
  onCancel: () => void;
  onDone: (newUri: string) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [processing, setProcessing] = useState(false);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [activeHandle, setActiveHandle] = useState<null | "tl" | "tr" | "bl" | "br">(null);

  const frameRef = useRef({ left: 0, top: 0, right: 0, bottom: 0, scale: 1, rw: width, rh: height });
  const startRef = useRef<Rect | null>(null);

  const rotatedW = rotation % 180 === 0 ? width : height;
  const rotatedH = rotation % 180 === 0 ? height : width;

  let frame = frameRef.current;
  if (canvas.w > 0 && canvas.h > 0) {
    const scale = Math.min(canvas.w / rotatedW, canvas.h / rotatedH);
    const dispW = rotatedW * scale;
    const dispH = rotatedH * scale;
    const left = (canvas.w - dispW) / 2;
    const top = (canvas.h - dispH) / 2;
    frame = { left, top, right: left + dispW, bottom: top + dispH, scale, rw: rotatedW, rh: rotatedH };
    frameRef.current = frame;
  }

  const dispW = frame.right - frame.left;
  const dispH = frame.bottom - frame.top;
  const activeCrop: Rect = crop ?? { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom };

  const clampRect = (r: Rect): Rect => {
    const f = frameRef.current;
    let { left, top, right, bottom } = r;
    left = Math.max(f.left, Math.min(left, right - MIN));
    top = Math.max(f.top, Math.min(top, bottom - MIN));
    right = Math.min(f.right, Math.max(right, left + MIN));
    bottom = Math.min(f.bottom, Math.max(bottom, top + MIN));
    return { left, top, right, bottom };
  };

  const makeHandle = (corner: "tl" | "tr" | "bl" | "br") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.selectionAsync();
        const f = frameRef.current;
        startRef.current = crop ?? { left: f.left, top: f.top, right: f.right, bottom: f.bottom };
        setActiveHandle(corner);
      },
      onPanResponderMove: (_e, g) => {
        const s = startRef.current;
        if (!s) return;
        // Titik crop digeser ke atas (DRAG_LIFT) dari posisi jari yang sebenarnya,
        // supaya user tetap bisa lihat persis di mana garis crop mendarat — tanpa
        // trik ini, jari sendiri yang justru menutupi tepi dokumen yang mau dipas-kan.
        const liftedDy = g.dy - DRAG_LIFT;
        const next = { ...s };
        if (corner === "tl") { next.left = s.left + g.dx; next.top = s.top + liftedDy; }
        if (corner === "tr") { next.right = s.right + g.dx; next.top = s.top + liftedDy; }
        if (corner === "bl") { next.left = s.left + g.dx; next.bottom = s.bottom + liftedDy; }
        if (corner === "br") { next.right = s.right + g.dx; next.bottom = s.bottom + liftedDy; }
        setCrop(clampRect(next));
      },
      onPanResponderRelease: () => setActiveHandle(null),
      onPanResponderTerminate: () => setActiveHandle(null),
    });

  const handlers = {
    tl: useRef(makeHandle("tl")).current,
    tr: useRef(makeHandle("tr")).current,
    bl: useRef(makeHandle("bl")).current,
    br: useRef(makeHandle("br")).current,
  };

  const rotate = (dir: 1 | -1) => {
    Haptics.selectionAsync();
    setRotation((r) => (r + dir * 90 + 360) % 360);
    setCrop(null);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  };

  const apply = async () => {
    setProcessing(true);
    try {
      const f = frameRef.current;
      const actions: ImageManipulator.Action[] = [];
      if (rotation !== 0) actions.push({ rotate: rotation });

      const isFull = !crop ||
        (Math.abs(activeCrop.left - f.left) < 3 && Math.abs(activeCrop.top - f.top) < 3 &&
          Math.abs(activeCrop.right - f.right) < 3 && Math.abs(activeCrop.bottom - f.bottom) < 3);

      if (!isFull) {
        const originX = Math.max(0, (activeCrop.left - f.left) / f.scale);
        const originY = Math.max(0, (activeCrop.top - f.top) / f.scale);
        const cw = Math.min(f.rw - originX, (activeCrop.right - activeCrop.left) / f.scale);
        const ch = Math.min(f.rh - originY, (activeCrop.bottom - activeCrop.top) / f.scale);
        actions.push({ crop: { originX, originY, width: cw, height: ch } });
      }

      if (actions.length === 0) { onDone(uri); return; }
      const res = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: 0.7, format: ImageManipulator.SaveFormat.JPEG,
      });
      onDone(res.uri);
    } catch {
      onDone(uri);
    } finally {
      setProcessing(false);
    }
  };

  // pre-rotation element size so it fills dispW x dispH after rotation
  const unrotW = rotation % 180 === 0 ? dispW : dispH;
  const unrotH = rotation % 180 === 0 ? dispH : dispW;
  const centerX = frame.left + dispW / 2;
  const centerY = frame.top + dispH / 2;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable testID="editor-cancel" onPress={onCancel} style={styles.roundBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Sesuaikan Struk</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={styles.hint}>Tarik sudut biru — titiknya akan naik sedikit biar tidak ketutup jari</Text>

      <View style={styles.canvas} onLayout={onLayout}>
        {canvas.w > 0 && (
          <Image
            source={{ uri }}
            style={{
              position: "absolute",
              left: centerX - unrotW / 2,
              top: centerY - unrotH / 2,
              width: unrotW,
              height: unrotH,
              transform: [{ rotate: `${rotation}deg` }],
            }}
            contentFit="fill"
          />
        )}

        {/* dimming outside crop */}
        {canvas.w > 0 && (
          <>
            <View pointerEvents="none" style={[styles.cropBox, {
              left: activeCrop.left, top: activeCrop.top,
              width: activeCrop.right - activeCrop.left, height: activeCrop.bottom - activeCrop.top,
            }]}>
              {/* garis bantu rule-of-thirds, membantu lihat tepi dokumen tetap lurus */}
              <View style={[styles.gridLineV, { left: "33.33%" }]} />
              <View style={[styles.gridLineV, { left: "66.66%" }]} />
              <View style={[styles.gridLineH, { top: "33.33%" }]} />
              <View style={[styles.gridLineH, { top: "66.66%" }]} />
            </View>
            <Handle testID="handle-tl" pan={handlers.tl} active={activeHandle === "tl"} style={{ left: activeCrop.left - HANDLE / 2, top: activeCrop.top - HANDLE / 2 }} />
            <Handle testID="handle-tr" pan={handlers.tr} active={activeHandle === "tr"} style={{ left: activeCrop.right - HANDLE / 2, top: activeCrop.top - HANDLE / 2 }} />
            <Handle testID="handle-bl" pan={handlers.bl} active={activeHandle === "bl"} style={{ left: activeCrop.left - HANDLE / 2, top: activeCrop.bottom - HANDLE / 2 }} />
            <Handle testID="handle-br" pan={handlers.br} active={activeHandle === "br"} style={{ left: activeCrop.right - HANDLE / 2, top: activeCrop.bottom - HANDLE / 2 }} />
          </>
        )}

        {processing && (
          <View style={styles.processingOverlay}><ActivityIndicator size="large" color="#fff" /></View>
        )}
      </View>

      <View style={styles.tools}>
        <Pressable testID="rotate-left" onPress={() => rotate(-1)} style={styles.tool}>
          <Ionicons name="arrow-undo-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Putar Kiri</Text>
        </Pressable>
        <Pressable testID="rotate-right" onPress={() => rotate(1)} style={styles.tool}>
          <Ionicons name="arrow-redo-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Putar Kanan</Text>
        </Pressable>
        <Pressable testID="reset-crop" onPress={() => setCrop(null)} style={styles.tool}>
          <Ionicons name="expand-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Reset</Text>
        </Pressable>
      </View>

      <Pressable testID="editor-done" onPress={apply} disabled={processing} style={styles.doneBtn}>
        <Text style={styles.doneText}>Gunakan Struk</Text>
      </Pressable>
    </View>
  );
}

function Handle({ style, pan, testID, active }: { style: any; pan: any; testID: string; active: boolean }) {
  return (
    <View testID={testID} {...pan.panHandlers} style={[styles.handle, style]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <View style={[styles.handleDot, active && styles.handleDotActive]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, height: 56 },
  topTitle: { fontFamily: fonts.semibold, fontSize: type.lg, color: "#fff" },
  hint: { textAlign: "center", fontFamily: fonts.regular, fontSize: type.sm, color: "rgba(255,255,255,0.7)", paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  canvas: { flex: 1, overflow: "hidden" },
  cropBox: { position: "absolute", borderWidth: 2, borderColor: "#fff" },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.5)" },
  gridLineH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.5)" },
  handle: { position: "absolute", width: HANDLE, height: HANDLE, alignItems: "center", justifyContent: "center" },
  handleDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", borderWidth: 3, borderColor: colors.brandTertiary },
  handleDotActive: { width: 34, height: 34, borderRadius: 17, borderWidth: 4, backgroundColor: colors.brandTertiary, borderColor: "#fff" },
  tools: { flexDirection: "row", justifyContent: "space-around", paddingVertical: spacing.md },
  tool: { alignItems: "center", gap: 4, paddingHorizontal: spacing.md },
  toolText: { fontFamily: fonts.medium, fontSize: type.sm, color: "#fff" },
  doneBtn: { margin: spacing.lg, height: 52, borderRadius: radius.md, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  doneText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
});
