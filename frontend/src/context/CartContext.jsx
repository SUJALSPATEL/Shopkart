import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
    addToCart as addToCartRequest,
    getCart,
    removeFromCart as removeFromCartRequest,
    updateCartQuantity
} from '../services/api.js'

const CartContext = createContext(null)

// Charged on the subtotal, and only ever worked out at render time.
export const GST_RATE = 0.18

// Round to paise so 18% of an odd subtotal cannot leave a decimal tail.
const roundToPaise = (amount) => Math.round(amount * 100) / 100

// Derived from cartItems each render, never stored, so they cannot drift.
export const totalQuantityOf = (cartItems) =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0)

export const subtotalOf = (cartItems) =>
    cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

export const gstOf = (cartItems) => roundToPaise(subtotalOf(cartItems) * GST_RATE)

export const totalOf = (cartItems) => roundToPaise(subtotalOf(cartItems) + gstOf(cartItems))

// One shared cart; every mutation replaces it with the server's latest reply.
export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchCart = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const data = await getCart()
            setCartItems(data.cart || [])
        } catch (err) {
            // A 401 means no session, which is an empty cart, not a failure.
            if (err.status === 401) {
                setCartItems([])
            } else {
                setError(err.message)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    // Runs once on start-up, so a signed-in cart survives a refresh.
    useEffect(() => {
        fetchCart()
    }, [fetchCart])

    // Mutation errors reach the caller, so one button can report them, not the page.
    const runMutation = useCallback(async (mutation) => {
        const data = await mutation()
        setCartItems(data.cart || [])
        return data
    }, [])

    const addToCart = useCallback(
        (productId) => runMutation(() => addToCartRequest(productId)),
        [runMutation]
    )

    const updateQuantity = useCallback(
        (productId, quantity) => runMutation(() => updateCartQuantity(productId, quantity)),
        [runMutation]
    )

    const removeFromCart = useCallback(
        (productId) => runMutation(() => removeFromCartRequest(productId)),
        [runMutation]
    )

    // Used on sign out, so the next person does not see the previous cart's count.
    const clearCart = useCallback(() => setCartItems([]), [])

    const quantityInCart = useCallback(
        (productId) => cartItems.find((item) => item.product._id === productId)?.quantity || 0,
        [cartItems]
    )

    const totalQuantity = useMemo(() => totalQuantityOf(cartItems), [cartItems])

    const subtotal = useMemo(() => subtotalOf(cartItems), [cartItems])

    const gst = useMemo(() => gstOf(cartItems), [cartItems])

    const total = useMemo(() => totalOf(cartItems), [cartItems])

    const value = {
        cartItems,
        loading,
        error,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        quantityInCart,
        totalQuantity,
        subtotal,
        gst,
        total
    }

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
    const context = useContext(CartContext)

    if (!context) {
        throw new Error('useCart must be used inside a CartProvider')
    }

    return context
}
