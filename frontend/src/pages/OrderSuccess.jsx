import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrderById } from '../services/api.js'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

// Derive the subtotal from the stored total and GST, rounded to paise.
const subtotalOf = (order) =>
    Math.round((order.totalAmount - (order.gstAmount || 0)) * 100) / 100

export default function OrderSuccess() {
    const { id } = useParams()

    const [order, setOrder] = useState(null)
    const [status, setStatus] = useState('loading')
    const [error, setError] = useState('')

    // Read back from the API, not navigation state, so a refresh still works.
    useEffect(() => {
        let active = true

        getOrderById(id)
            .then((data) => {
                if (!active) return
                setOrder(data.order)
                setStatus('ready')
            })
            .catch((err) => {
                if (!active) return
                setError(err.status === 404 ? 'We could not find that order.' : err.message)
                setStatus('error')
            })

        return () => {
            active = false
        }
    }, [id])

    return (
        <div className="mx-auto max-w-2xl">
            {status === 'loading' && (
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                    Loading your order...
                </p>
            )}

            {status === 'error' && (
                <div className="border border-line bg-panel p-8">
                    <p className="text-danger">{error}</p>
                    <Link
                        to="/orders"
                        className="mt-6 inline-block border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        View My Orders
                    </Link>
                </div>
            )}

            {status === 'ready' && order && (
                <>
                    <div className="border border-line bg-panel p-8">
                        <span className="grid h-11 w-11 place-items-center border border-brand font-mono text-sm text-brand">
                            ✓
                        </span>

                        <h1 className="mt-5 text-3xl font-bold tracking-tight">Order placed</h1>
                        <p className="mt-3 leading-relaxed text-muted">
                            {order.paymentStatus === 'PAID'
                                ? 'Your payment is verified and your order is confirmed for '
                                : 'Your order is confirmed for '}
                            <span className="text-ink">{formatPrice(order.totalAmount)}</span>.
                        </p>

                        <dl className="mt-7 space-y-3 border-t border-line pt-6 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">Order ID</dt>
                                <dd className="font-mono">#{order._id.slice(-8).toUpperCase()}</dd>
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
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">
                                    {order.paymentStatus === 'PAID' ? 'Amount paid' : 'Order total'}
                                </dt>
                                <dd className="text-lg font-bold tracking-tight">
                                    {formatPrice(order.totalAmount)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">Payment method</dt>
                                <dd className="font-mono">{order.paymentMethod}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">Status</dt>
                                <dd className="font-mono text-brand">{order.status}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="mt-6 border border-line bg-panel p-8">
                        <h2 className="font-semibold tracking-tight">Items</h2>

                        <ul className="mt-4 space-y-3 text-sm">
                            {order.items.map((item) => (
                                <li key={item.product} className="flex items-start justify-between gap-4">
                                    <span className="min-w-0">
                                        <span className="block truncate">{item.name}</span>
                                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                            {item.quantity} × {formatPrice(item.price)}
                                        </span>
                                    </span>
                                    <span className="font-mono">
                                        {formatPrice(item.price * item.quantity)}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 border-t border-line pt-6 text-sm">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                Delivering to
                            </p>
                            <address className="mt-2 not-italic leading-relaxed text-muted">
                                <span className="font-semibold text-ink">
                                    {order.shippingAddress.fullName}
                                </span>
                                , {order.shippingAddress.addressLine1},{' '}
                                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                {order.shippingAddress.pincode}
                            </address>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4">
                        <Link
                            to="/orders"
                            className="border border-brand px-5 py-3 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                        >
                            View My Orders
                        </Link>
                        <Link
                            to="/products"
                            className="bg-brand px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:bg-brand-dark"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}
