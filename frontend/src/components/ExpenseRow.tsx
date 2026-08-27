import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Expense } from "@/src/types";
import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { formatMoney, formatDateShort } from "@/src/lib";
import { useCategories } from "@/src/categories";

export default function ExpenseRow({
  expense,
  onPress,
}: {
  expense: Expense;
  onPress: () => void;
}) {
  const { metaFor } = useCategories();
  const meta = metaFor(expense.category);
  return (
    <Pressable
      testID={`expense-row-${expense.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.vendor} numberOfLines={1}>{expense.vendor}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {expense.category} · {formatDateShort(expense.date)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatMoney(expense.amount)}</Text>
        {expense.is_billable ? (
          <View style={styles.billable}><Text style={styles.billableText}>Tagih</Text></View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, gap: spacing.md, backgroundColor: colors.surfaceSecondary,
  },
  pressed: { backgroundColor: colors.surfaceTertiary },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  mid: { flex: 1 },
  vendor: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  sub: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  right: { alignItems: "flex-end" },
  amount: { fontFamily: fonts.display, fontSize: type.lg, color: colors.onSurface },
  billable: { marginTop: 4, backgroundColor: colors.brandTertiary + "1A", paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm },
  billableText: { fontFamily: fonts.medium, fontSize: 10, color: colors.brandTertiary },
});
