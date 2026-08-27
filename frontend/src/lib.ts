import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

type IconName = keyof typeof Ionicons.glyphMap;

export const DEFAULT_META: { icon: IconName; color: string } = {
  icon: "pricetag-outline",
  color: colors.muted,
};

// Rupiah, no decimals: 25000 -> "Rp 25.000"
export const formatMoney = (amount: number) => {
  const n = Math.round(Number(amount || 0));
  return "Rp " + n.toLocaleString("id-ID");
};

// Compact for tight spaces: 1.500.000 -> "Rp 1,5jt"
export const formatMoneyCompact = (amount: number) => {
  const n = Math.round(Number(amount || 0));
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(".", ",") + "jt";
  if (n >= 1_000) return "Rp " + Math.round(n / 1000) + "rb";
  return "Rp " + n.toLocaleString("id-ID");
};

export const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
};

export const formatDateShort = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

// Month labels EN abbrev from backend -> Indonesian
export const MONTH_ID: Record<string, string> = {
  Jan: "Jan", Feb: "Feb", Mar: "Mar", Apr: "Apr", May: "Mei", Jun: "Jun",
  Jul: "Jul", Aug: "Agu", Sep: "Sep", Oct: "Okt", Nov: "Nov", Dec: "Des",
};

export const monthYearLabel = () =>
  new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
