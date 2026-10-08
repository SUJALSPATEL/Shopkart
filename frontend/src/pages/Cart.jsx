import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GST_RATE, useCart } from '../context/CartContext.jsx'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

export default function Cart() {
    const {
        cartItems,
        loading,
        error,
        fetchCart,
        updateQuantity,
        removeFromCart,
        totalQuantity,
        subtotal,
        gst,
        total
    } = useCart()

    // Only one row changes at a time, so a single id tracks the pending row.
    const [pendingId, setPendingId] = useState(null)
    const [actionError, setActionError] = useState('')

    const runAction = async (productId, action) => {
        setPendingId(productId)
        setActionError('')

        try {
            await action()
        } catch (err) {
            // On failure the cart keeps its contents; the message explains why.
            setActionError(err.message)
        } finally {
            setPendingId(null)
        }
    }

    return (
        <div>
            <header className="mb-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Basket</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">Your cart</h1>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                    Items you are ready to buy. The cart is stored against your account, so it is
                    still here after a refresh or a fresh sign-in.
                </p>
            </header>

            {loading && (
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                    Loading your cart...
                </p>
            )}

            {!loading && error && (
                <div className="border border-line bg-panel p-8">
                    <p className="text-danger">Unable to load your cart.</p>
                    <p className="mt-2 text-sm text-muted">Check that the backend is running, then try again.</p>
                    <button
                        type="button"
                        onClick={fetchCart}
                        className="mt-6 border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!loading && !error && cartItems.length === 0 && (
                <div className="border border-line bg-panel p-8">
                    <p className="font-semibold">Your cart is empty</p>
                    <p className="mt-2 text-sm text-muted">Looks like you haven&apos;t added anything yet.</p>
                    <Link
                        to="/products"
                        className="mt-6 inline-block border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Browse Products
                    </Link>
                </div>
            )}

            {!loading && !error && cartItems.length > 0 && (
                <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
                    <div>
                        {actionError && (
                            <p role="alert" className="mb-4 bg-danger-bg px-3 py-2.5 text-sm text-danger">
                                {actionError}
                            </p>
                        )}

                        <ul className="border border-line bg-panel">
                            {cartItems.map((item) => {
                                const busy = pendingId === item.product._id
                                const atStockLimit = item.quantity >= item.product.stock

                                return (
                                    <li
                                        key={item.product._id}
                                        className="flex flex-wrap items-start gap-5 border-b border-line p-5 last:border-b-0 sm:flex-nowrap"
                                    >
                                        <div className="h-24 w-24 shrink-0 overflow-hidden border border-line bg-paper">
                                            <img
                                                src={item.product.image}
                                                alt={item.product.name}
                                                className="h-full w-full object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.style.visibility = 'hidden'
                                                }}
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-mono text-[10px] uppercase tracking-widest text-brand">
                                                {item.product.category}
                                            </p>
                                            <h2 className="mt-1 font-semibold leading-snug">
                                                <Link to={`/products/${item.product._id}`} className="hover:text-brand">
                                                    {item.product.name}
                                                </Link>
                                            </h2>
                                            <p className="mt-2 text-sm text-muted">
                                                {formatPrice(item.product.price)} each
                                            </p>

                                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                                <div className="flex items-center border border-line">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            runAction(item.product._id, () =>
                                                                updateQuantity(item.product._id, item.quantity - 1)
                                                            )
                                                        }
                                                        disabled={busy || item.quantity <= 1}
                                                        aria-label={`Decrease quantity of ${item.product.name}`}
                                                        className="px-3 py-2 font-mono text-sm text-brand transition-colors hover:bg-brand hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand"
                                                    >
                                                        -
                                                    </button>

                                                    <span className="min-w-10 border-x border-line px-3 py-2 text-center font-mono text-sm">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            runAction(item.product._id, () =>
                                                                updateQuantity(item.product._id, item.quantity + 1)
                                                            )
                                                        }
                                                        // Backend rejects past-stock adds; this only spares the round trip.
                                                        disabled={busy || atStockLimit}
                                                        aria-label={`Increase quantity of ${item.product.name}`}
                                                        className="px-3 py-2 font-mono text-sm text-brand transition-colors hover:bg-brand hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {atStockLimit && (
                                                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                                        Max stock
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        runAction(item.product._id, () =>
                                                            removeFromCart(item.product._id)
                                                        )
                                                    }
                                                    disabled={busy}
                                                    className="font-mono text-[10px] uppercase tracking-widest text-danger underline transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {busy ? 'Working...' : 'Remove'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                                Subtotal
                                            </p>
                                            <p className="mt-1 text-lg font-bold tracking-tight">
                                                {formatPrice(item.product.price * item.quantity)}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>

                    <aside className="border border-line bg-panel p-6">
                        <h2 className="text-lg font-semibold tracking-tight">Order Summary</h2>

                        <dl className="mt-5 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">Items</dt>
                                <dd className="font-mono">{totalQuantity}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">Subtotal</dt>
                                <dd className="font-mono">{formatPrice(subtotal)}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">GST ({GST_RATE * 100}%)</dt>
                                <dd className="font-mono">{formatPrice(gst)}</dd>
                            </div>
                            <div className="flex items-center justify-between border-t border-line pt-3">
                                <dt className="font-semibold">Total</dt>
                                <dd className="text-lg font-bold tracking-tight">{formatPrice(total)}</dd>
                            </div>
                        </dl>

                        {/* Shown only when the cart has items; checkout guards itself too. */}
                        <Link
                            to="/checkout"
                            className="mt-6 block w-full bg-brand px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:bg-brand-dark"
                        >
                            Proceed to Checkout
                        </Link>
                    </aside>
                </div>
            )}
        </div>
    )
}
