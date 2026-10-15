import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrderById } from '../services/api.js'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

// Only the grand total is stored, so the pre-tax subtotal is read back by
// subtraction. Rounding to paise keeps it from drifting to 117.99999.
const subtotalOf = (order) =>
    Math.round((order.totalAmount - (order.gstAmount || 0)) * 100) / 100

const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })

export default function OrderDetails() {
    const { id } = useParams()

    const [order, setOrder] = useState(null)
    const [status, setStatus] = useState('loading')
    const [error, setError] = useState('')

    // Bumping this re-runs the effect below, which is what Try Again does.
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let active = true

        setStatus('loading')
        setError('')

        getOrderById(id)
            .then((data) => {
                if (!active) return
                setOrder(data.order)
                setStatus('ready')
            })
            .catch((err) => {
                if (!active) return
                // 404 covers both "missing" and "someone else's", so the copy is the same.
                setStatus('error')
                setError(err.status === 404 ? 'We could not find that order.' : err.message)
            })

        return () => {
            active = false
        }
    }, [id, attempt])

    return (
        <div>
            <Link
                to="/orders"
                className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-ink"
            >
                ← Back to orders
            </Link>

            {status === 'loading' && (
                <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted">
                    Loading your order...
                </p>
            )}

            {status === 'error' && (
                <div className="mt-8 border border-line bg-panel p-8">
                    <p className="text-danger">{error}</p>
                    <p className="mt-2 text-sm text-muted">
                        It may have been removed, or it may belong to another account.
                    </p>
                    <button
                        type="button"
                        onClick={() => setAttempt((current) => current + 1)}
                        className="mt-6 border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {status === 'ready' && order && (
                <>
                    <header className="mt-6 mb-8 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Order</p>
                            <h1 className="mt-3 font-mono text-2xl font-bold tracking-tight">
                                #{order._id.slice(-8).toUpperCase()}
                            </h1>
                            <p className="mt-2 text-sm text-muted">Placed on {formatDate(order.createdAt)}</p>
                        </div>

                        <span className="border border-brand px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-brand">
                            {order.status}
                        </span>
                    </header>

                    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
                        <ul className="border border-line bg-panel">
                            {order.items.map((item) => (
                                <li
                                    key={item.product}
                                    className="flex flex-wrap items-center gap-5 border-b border-line p-5 last:border-b-0"
                                >
                                    <div className="h-20 w-20 shrink-0 overflow-hidden border border-line bg-paper">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                            onError={(event) => {
                                                event.currentTarget.style.visibility = 'hidden'
                                            }}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        {/* Snapshot of the name and price at purchase time. */}
                                        <p className="font-semibold leading-snug">{item.name}</p>
                                        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                                            {item.quantity} × {formatPrice(item.price)}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                            Subtotal
                                        </p>
                                        <p className="mt-1 text-lg font-bold tracking-tight">
                                            {formatPrice(item.price * item.quantity)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-6">
                            <aside className="border border-line bg-panel p-6">
                                <h2 className="text-lg font-semibold tracking-tight">Summary</h2>

                                <dl className="mt-5 space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted">Items</dt>
                                        <dd className="font-mono">
                                            {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted">Payment method</dt>
                                        <dd className="font-mono">{order.paymentMethod}</dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted">Payment status</dt>
                                        <dd className="font-mono">{order.paymentStatus}</dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted">Subtotal</dt>
                                        <dd className="font-mono">{formatPrice(subtotalOf(order))}</dd>
                                    </div>
                                    {/* Hidden on orders stored before GST was charged. */}
                                    {order.gstAmount > 0 && (
                                        <div className="flex items-center justify-between">
                                            <dt className="text-muted">GST (18%)</dt>
                                            <dd className="font-mono">{formatPrice(order.gstAmount)}</dd>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between border-t border-line pt-3">
                                        <dt className="font-semibold">Total</dt>
                                        <dd className="text-lg font-bold tracking-tight">
                                            {formatPrice(order.totalAmount)}
                                        </dd>
                                    </div>
                                </dl>
                            </aside>

                            <aside className="border border-line bg-panel p-6">
                                <h2 className="text-lg font-semibold tracking-tight">Shipping to</h2>

                                <address className="mt-5 space-y-1 text-sm not-italic leading-relaxed text-muted">
                                    <p className="font-semibold text-ink">{order.shippingAddress.fullName}</p>
                                    <p>{order.shippingAddress.addressLine1}</p>
                                    <p>
                                        {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                        {order.shippingAddress.pincode}
                                    </p>
                                    <p className="font-mono text-xs">{order.shippingAddress.phone}</p>
                                </address>
                            </aside>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
