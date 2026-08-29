import React from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius, type } from "@/src/theme";

// Kumpulan ikon yang relevan untuk kategori pengeluaran sehari-hari/kantor.
// Pakai style "-outline" biar konsisten dengan ikon default yang sudah ada.
export const CATEGORY_ICONS = [
  "restaurant-outline", "cafe-outline", "fast-food-outline", "pizza-outline",
  "car-sport-outline", "bus-outline", "bicycle-outline", "airplane-outline", "boat-outline",
  "trail-sign-outline", "map-outline", "navigate-outline",
  "briefcase-outline", "business-outline", "laptop-outline", "print-outline", "document-text-outline",
  "cart-outline", "bag-handle-outline", "pricetag-outline", "gift-outline",
  "film-outline", "game-controller-outline", "musical-notes-outline", "tv-outline",
  "medkit-outline", "fitness-outline", "heart-outline", "bandage-outline",
  "home-outline", "bed-outline", "construct-outline", "hammer-outline", "build-outline",
  "flash-outline", "water-outline", "flame-outline", "wifi-outline", "call-outline",
  "school-outline", "book-outline", "people-outline", "person-outline",
  "wallet-outline", "cash-outline", "card-outline", "receipt-outline",
  "paw-outline", "leaf-outline", "shirt-outline", "cut-outline",
  "hardware-chip-outline", "phone-portrait-outline", "camera-outline",
  "umbrella-outline", "sunny-outline", "moon-outline",
] as const;

export default function IconPickerModal({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected?: string;
  onClose: () => void;
  onSelect: (icon: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Pilih Ikon</Text>
          <FlatList
            data={CATEGORY_ICONS as unknown as string[]}
            keyExtractor={(item) => item}
            numColumns={5}
            contentContainerStyle={{ paddingVertical: spacing.md }}
            renderItem={({ item }) => {
              const active = item === selected;
              return (
                <Pressable
                  testID={`icon-option-${item}`}
                  onPress={() => onSelect(item)}
                  style={[styles.iconCell, active && styles.iconCellActive]}
                >
                  <Ionicons name={item as any} size={22} color={active ? colors.onSurfaceInverse : colors.onSurface} />
                </Pressable>
              );
            }}
          />
          <Pressable testID="icon-picker-close" onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,30,0.45)", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, maxHeight: "70%" },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  iconCell: {
    width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    margin: 4, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  iconCellActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  closeBtn: { marginTop: spacing.md, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  closeText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurfaceTertiary },
});
