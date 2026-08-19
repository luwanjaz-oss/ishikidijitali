"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // 1. Kusoma kikapu kutoka LocalStorage mara tu page inapoload
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ishiki_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch (e) {
      console.error("Could not read saved cart:", e);
    }
    setLoaded(true);
  }, []);

  // 2. Kuhifadhi kikapu kwenye LocalStorage kila kinapobadilika
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("ishiki_cart", JSON.stringify(cart));
  }, [cart, loaded]);

  /**
   * Ongeza bidhaa kikapuni
   * Inapokea product object (e.g. { id, name, price, selectedVariant, image_url, ... })
   */
  function addToCart(product) {
    if (!product || !product.id) return;

    const variant = product.selectedVariant || "";

    setCart((prev) => {
      // Tafuta kama bidhaa yenye ID na VARIANT hiyo ipo tayari
      const existingIndex = prev.findIndex(
        (i) => i.id === product.id && (i.selectedVariant || "") === variant
      );

      if (existingIndex > -1) {
        // Kama ipo, ongeza idadi (qty)
        return prev.map((item, index) =>
          index === existingIndex
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      // Kama haipo, iongeze kama bidhaa mpya ikiwa na qty = 1
      return [
        ...prev,
        {
          ...product,
          selectedVariant: variant,
          qty: 1,
        },
      ];
    });
  }

  /**
   * Badilisha idadi ya bidhaa (Ongeza/Punguza)
   */
  function changeQty(id, selectedVariant = "", delta) {
    const variant = selectedVariant || "";

    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.id === id &&
            (item.selectedVariant || "") === variant
          ) {
            return { ...item, qty: item.qty + delta };
          }
          return item;
        })
        .filter((item) => item.qty > 0) // Ondoa bidhaa kama qty ikifika 0
    );
  }

  /**
   * Ondoa bidhaa kabisa kwenye kikapu
   */
  function removeFromCart(id, selectedVariant = "") {
    const variant = selectedVariant || "";

    setCart((prev) =>
      prev.filter(
        (item) =>
          !(item.id === id && (item.selectedVariant || "") === variant)
      )
    );
  }

  /**
   * Safisha kikapu chote
   */
  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        changeQty,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}