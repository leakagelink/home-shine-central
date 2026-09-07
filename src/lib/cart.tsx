import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  id: string;
  kind: "service" | "addon";
  name: string;
  pricePaise: number;
  quantity: number;
  categorySlug: string;
};

type CartState = {
  lines: CartLine[];
  setQuantity: (line: Omit<CartLine, "quantity">, quantity: number) => void;
  quantityOf: (id: string) => number;
  replaceLines: (next: CartLine[]) => void;
  clear: () => void;
  itemCount: number;
  servicesTotal: number;
  addonsTotal: number;
  total: number;
  categorySlug: string | null;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "squeak.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore corrupt cache */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartState>(() => {
    const servicesTotal = lines
      .filter((l) => l.kind === "service")
      .reduce((sum, l) => sum + l.pricePaise * l.quantity, 0);
    const addonsTotal = lines
      .filter((l) => l.kind === "addon")
      .reduce((sum, l) => sum + l.pricePaise * l.quantity, 0);

    return {
      lines,
      setQuantity: (line, quantity) =>
        setLines((prev) => {
          const next = prev.filter((l) => l.id !== line.id);
          if (quantity > 0) next.push({ ...line, quantity });
          return next;
        }),
      quantityOf: (id) => lines.find((l) => l.id === id)?.quantity ?? 0,
      replaceLines: (next) => setLines(next),
      clear: () => setLines([]),
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      servicesTotal,
      addonsTotal,
      total: servicesTotal + addonsTotal,
      categorySlug: lines[0]?.categorySlug ?? null,
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
