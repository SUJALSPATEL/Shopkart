import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addToWishlist } from '../services/api.js'
import { useCart } from '../context/CartContext.jsx'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

// `action` lets the wishlist page swap in its own Remove button.
export default function ProductCard({ product, action = null }) {
    const inStock = product.stock > 0

    const { addToCart, updateQuantity, removeFromCart, quantityInCart } = useCart()

    // Only the buttons need these, so they stay local instead of in a shared store.
    const [wishlistStatus, setWishlistStatus] = useState('idle')
    const [wishlistError, setWishlistError] = useState('')

    // Tracks this card's in-flight request, stopping a double click counting twice.
    const [cartBusy, setCartBusy] = useState(false)
    const [cartError, setCartError] = useState('')

    // Read from the shared cart so the stepper shows the server-confirmed quantity.
    const quantity = quantityInCart(product._id)
    const atStockLimit = quantity >= product.stock

    const runCartAction = async (action) => {
        setCartBusy(true)
        setCartError('')

        try {
            // Each action answers with the whole cart, so the navbar and page follow.
            await action()
        } catch (error) {
            setCartError(error.message)
        } finally {
            setCartBusy(false)
        }
    }

    const handleAddToCart = () => runCartAction(() => addToCart(product._id))

    const handleIncrease = () => runCartAction(() => updateQuantity(product._id, quantity + 1))

    // Stepping down from one removes the product, restoring the Add to Cart button.
    const handleDecrease = () =>
        runCartAction(() =>
            quantity <= 1
                ? removeFromCart(product._id)
                : updateQuantity(product._id, quantity - 1)
        )

    const handleAddToWishlist = async () => {
        setWishlistStatus('saving')
        setWishlistError('')

        try {
            await addToWishlist(product._id)
            setWishlistStatus('saved')
        } catch (error) {
            // 409 means already saved, which is the goal, so treat it as success.
            if (error.status === 409) {
                setWishlistStatus('saved')
                return
            }

            setWishlistStatus('error')
            setWishlistError(error.message)
        }
    }

    return (
        <article className="group flex flex-col border border-line bg-panel transition-shadow hover:shadow-[8px_8px_0_#d8ddcd]">
            <div className="aspect-square overflow-hidden border-b border-line bg-paper">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden'
                    }}
                />
            </div>

            <div className="flex flex-1 flex-col p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-brand">{product.category}</p>
                <h3 className="mt-2 text-base font-semibold leading-snug">{product.name}</h3>
                <p className="mt-3 text-xl font-bold tracking-tight">{formatPrice(product.price)}</p>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                    <span
                        className={`font-mono text-[10px] uppercase tracking-widest ${
                            inStock ? 'text-brand' : 'text-danger'
                        }`}
                    >
                        {/* Stock count shown so the buyer sees where the + stops. */}
                        {inStock ? `In Stock (${product.stock})` : 'Out of Stock'}
                    </span>

                    <Link
                        to={`/products/${product._id}`}
                        className="border border-brand px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        View Details
                    </Link>
                </div>

                {/* In the cart, the button becomes the same stepper the cart page uses. */}
                {quantity > 0 ? (
                    <div className="mt-4 flex items-stretch border border-brand">
                        <button
                            type="button"
                            onClick={handleDecrease}
                            disabled={cartBusy}
                            aria-label={`Decrease quantity of ${product.name}`}
                            className="px-4 py-2.5 font-mono text-sm text-brand transition-colors hover:bg-brand hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand"
                        >
                            -
                        </button>

                        <span className="grid flex-1 place-items-center border-x border-line font-mono text-xs tabular-nums">
                            {quantity}
                        </span>

                        <button
                            type="button"
                            onClick={handleIncrease}
                            // Stock is enforced by the backend; this just spares a rejected round trip.
                            disabled={cartBusy || atStockLimit}
                            aria-label={`Increase quantity of ${product.name}`}
                            className="px-4 py-2.5 font-mono text-sm text-brand transition-colors hover:bg-brand hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand"
                        >
                            +
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={cartBusy || !inStock}
                        className="mt-4 w-full bg-brand px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {cartBusy && '⏳ Adding...'}
                        {!cartBusy && (inStock ? 'Add to Cart' : 'Out of Stock')}
                    </button>
                )}

                {cartError && (
                    <p role="alert" className="mt-2 text-xs text-danger">
                        {cartError}
                    </p>
                )}

                {action ?? (
                    <>
                        <button
                            type="button"
                            onClick={handleAddToWishlist}
                            disabled={wishlistStatus === 'saving' || wishlistStatus === 'saved'}
                            className="mt-4 w-full border border-brand px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {wishlistStatus === 'saving' && '⏳ Saving...'}
                            {wishlistStatus === 'saved' && '♥ Added to Wishlist'}
                            {(wishlistStatus === 'idle' || wishlistStatus === 'error') && '♡ Add to Wishlist'}
                        </button>

                        {wishlistStatus === 'error' && wishlistError && (
                            <p role="alert" className="mt-2 text-xs text-danger">
                                {wishlistError}
                            </p>
                        )}
                    </>
                )}
            </div>
        </article>
    )
}
