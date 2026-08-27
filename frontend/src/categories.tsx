import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import type { Category } from "@/src/types";
import { DEFAULT_META } from "@/src/lib";

type IconName = keyof typeof Ionicons.glyphMap;
type Meta = { icon: IconName; color: string };

type Ctx = {
  categories: Category[];
  loading: boolean;
  refresh: () => Promise<void>;
  metaFor: (name?: string) => Meta;
};

const CategoriesContext = createContext<Ctx>({
  categories: [],
  loading: true,
  refresh: async () => {},
  metaFor: () => DEFAULT_META,
});

export const useCategories = () => useContext(CategoriesContext);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCategories(await api.categories());
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const metaFor = useCallback(
    (name?: string): Meta => {
      const c = categories.find((x) => x.name === name);
      if (c) return { icon: (c.icon as IconName) || DEFAULT_META.icon, color: c.color || DEFAULT_META.color };
      return DEFAULT_META;
    },
    [categories],
  );

  return (
    <CategoriesContext.Provider value={{ categories, loading, refresh, metaFor }}>
      {children}
    </CategoriesContext.Provider>
  );
}
