import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export interface CartItem {
  id: string; // Unique configuration ID
  type: "event" | "service";
  itemId: string; // _id of the Event or Service
  name: string;
  price: number; // Final price after add-ons and promos
  originalPrice: number; // Base price before promo code
  discountAmount: number; // Saved discount amount
  date: string;
  time: string;
  image?: string;
  category?: string;
  merchantId: string;
  details: {
    // For Events
    selectedTickets?: Record<string, number>;
    selectedSession?: "day" | "night" | "";
    selectedSeatNumbers?: string[];
    quantity?: number;
    // For Services
    addOns?: Array<{ name: string; price: number; quantity: number }>;
    customerLocation?: { address: string; latitude: number; longitude: number };
    guestCount?: number;
  };
  appliedPromo?: any;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    } catch (error) {
      console.warn("Failed to save cart to localStorage:", error);
    }
  }, [cartItems]);

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    // Check if an identical configuration already exists to prevent duplicate adding
    const hashConfig = (item: Omit<CartItem, "id">) => {
      return `${item.type}-${item.itemId}-${item.date}-${item.time}-${JSON.stringify(item.details)}`;
    };

    const newHash = hashConfig(newItem);
    const exists = cartItems.some((item) => {
      const currentHash = hashConfig(item);
      return currentHash === newHash;
    });

    if (exists) {
      toast.info(`"${newItem.name}" with these options is already in your cart!`);
      return;
    }

    const uniqueId = `${newItem.type}-${newItem.itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const itemWithId: CartItem = { ...newItem, id: uniqueId };
    setCartItems((prev) => [...prev, itemWithId]);
    toast.success(`"${newItem.name}" added to cart!`);
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast.success("Item removed from cart");
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        cartCount: cartItems.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
