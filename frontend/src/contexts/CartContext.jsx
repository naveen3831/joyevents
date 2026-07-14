import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
const CartContext = createContext(null);
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const stored = localStorage.getItem("cart");
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("cart", JSON.stringify(cartItems));
        }
        catch (error) {
            console.warn("Failed to save cart to localStorage:", error);
        }
    }, [cartItems]);
    const addToCart = (newItem) => {
        // Check if an identical configuration already exists to prevent duplicate adding
        const hashConfig = (item) => {
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
        const itemWithId = { ...newItem, id: uniqueId };
        setCartItems((prev) => [...prev, itemWithId]);
        toast.success(`"${newItem.name}" added to cart!`);
    };
    const removeFromCart = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Item removed from cart");
    };
    const clearCart = () => {
        setCartItems([]);
    };
    return (<CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            clearCart,
            cartCount: cartItems.length,
        }}>
      {children}
    </CartContext.Provider>);
};
