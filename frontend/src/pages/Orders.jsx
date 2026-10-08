import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../services/api.js'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })

export default function Orders() {
    const [orders, setOrders] = useState([])
    const [status, setStatus] = useState('loading')

    // Bumping this re-runs the effect below, which is what Try Again does.
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let active = true

        setStatus('loading')

        getOrders()
            .then((data) => {
                if (!active) return
                setOrders(data.orders)
                setStatus('ready')
            })
            .catch(() => {
                if (!active) return
                setStatus('error')
            })

        return () => {
            active = false
        }
    }, [attempt])

    return (
        <div>
            <header className="mb-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">History</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">Your orders</h1>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                    Everything you have ordered, with the price it was bought at. Orders are stored
                    against your account, so they are still here between visits.
                </p>
            </header>

            {status === 'loading' && (
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                    Loading your orders...
                </p>
            )}

            {status === 'error' && (
                <div className="border border-line bg-panel p-8">
                    <p className="text-danger">Unable to load your orders.</p>
                    <p className="mt-2 text-sm text-muted">Check that the backend is running, then try again.</p>
                    <button
                        type="button"
                        onClick={() => setAttempt((current) => current + 1)}
                        className="mt-6 border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {status === 'ready' && orders.length === 0 && (
                <div className="border border-line bg-panel p-8">
                    <p className="font-semibold">You have not placed any orders yet.</p>
                    <p className="mt-2 text-sm text-muted">
                        Once you place one, it will show up here.
                    </p>
                    <Link
                        to="/products"
                        className="mt-6 inline-block border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Start Shopping
                    </Link>
                </div>
            )}

            {status === 'ready' && orders.length > 0 && (
                <ul className="space-y-5">
                    {orders.map((order) => (
                        <li key={order._id} className="border border-line bg-panel">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                        Order
                                    </p>
                                    <p className="mt-1 font-mono text-sm">
                                        #{order._id.slice(-8).toUpperCase()}
                                    </p>
                                </div>

                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                        Placed
                                    </p>
                                    <p className="mt-1 font-mono text-sm">{formatDate(order.createdAt)}</p>
                                </div>

                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                        Payment
                                    </p>
                                    <p className="mt-1 font-mono text-sm">{order.paymentMethod}</p>
                                </div>

                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                        Status
                                    </p>
                                    <p className="mt-1 font-mono text-sm text-brand">{order.status}</p>
                                </div>

                                <div className="text-right">
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                        Total
                                    </p>
                                    <p className="mt-1 text-lg font-bold tracking-tight">
                                        {formatPrice(order.totalAmount)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                                <ul className="space-y-1 text-sm">
                                    {order.items.map((item) => (
                                        <li key={item.product} className="text-muted">
                                            <span className="text-ink">{item.name}</span> × {item.quantity}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={`/orders/${order._id}`}
                                    className="border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                                >
                                    View Details
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
