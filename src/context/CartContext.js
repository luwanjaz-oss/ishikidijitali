"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

// Hii inatengeneza "cartItemId" ya kipekee kwa bidhaa + machaguo yake
// (size, rangi, aina/uwezo/watts). Bidhaa moja yenye machaguo tofauti
// (mfano: Shati Size M vs Shati Size L) inahesabiwa kama vitu tofauti
// kikapuni, lakini bidhaa isiyo na machaguo yoyote inabaki kitu kimoja tu.
function buildCartItemId(product) {
  if (product.cartItemId) return product.cartItemId;
  const parts = [
    product.id,
    product.selectedSize || "",
    product.selectedColor || "",
    product.selectedType || "",
  ];
  return parts.join("-");
}

export function CartProvider({ children }) {
  // Kikapu kinaanza kikiwa TUPU (hakuna bidhaa ya "demo" tena)
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Pakia kikapu kutoka localStorage mara tu ukurasa unapofunguliwa
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("ishiki_cart");
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        } catch (e) {
          console.error("Error loading cart", e);
        }
      }
    }
    setHydrated(true);
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    if (typeof window !== "undefined") {
      localStorage.setItem("ishiki_cart", JSON.stringify(newCart));
    }
  };

  // Kitambulisho cha kipekee cha kila bidhaa kikapuni
  const getItemKey = (item) => item.cartItemId || item.id;

  // addToCart inapokea OBJECT MOJA ya bidhaa (product), ambayo inaweza
  // kuwa na selectedSize / selectedColor / selectedType tayari ndani yake.
  // Hii ndiyo njia sahihi ya kuiita kutoka popote (Duka Kuu au Ukurasa
  // wa Bidhaa Binafsi) - zote zinatakiwa kutuma object moja, siyo
  // arguments tofauti tofauti.
  const addToCart = (product) => {
    if (!product || !product.id) {
      console.error("addToCart: bidhaa batili", product);
      return;
    }

    const cartItemId = buildCartItemId(product);
    const itemToAdd = { ...product, cartItemId };

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => getItemKey(item) === cartItemId
      );

      let updated;
      if (existingIndex > -1) {
        updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: (updated[existingIndex].qty || 1) + (product.qty || 1),
        };
      } else {
        updated = [...prevCart, { ...itemToAdd, qty: itemToAdd.qty || 1 }];
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("ishiki_cart", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // identifier = cartItemId (kama ipo) au id
  const removeFromCart = (identifier) => {
    const updated = cart.filter((item) => getItemKey(item) !== identifier);
    saveCart(updated);
  };

  const updateQty = (identifier, newQty) => {
    if (newQty <= 0) {
      removeFromCart(identifier);
      return;
    }
    const updated = cart.map((item) =>
      getItemKey(item) === identifier ? { ...item, qty: newQty } : item
    );
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.qty || 1),
    0
  );

  const totalCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        hydrated,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        totalAmount,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default useCart;