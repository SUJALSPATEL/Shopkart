import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GST_RATE, useCart } from '../context/CartContext.jsx'
import { cancelPaymentOrder, createPaymentOrder, verifyPayment } from '../services/api.js'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

const EMPTY_FORM = {
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: ''
}

const FIELD_LABELS = {
    fullName: 'Full name',
    phone: 'Phone number',
    addressLine1: 'Address line',
    city: 'City',
    state: 'State',
    pincode: 'Pincode'
}

// Same rules as the server, run first so an incomplete form is never sent.
const PHONE = /^(\+91)?[6-9]\d{9}$/
const PINCODE = /^\d{6}$/

let razorpayScriptPromise

const loadRazorpay = () => {
    if (window.Razorpay) return Promise.resolve()

    if (!razorpayScriptPromise) {
        razorpayScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve()
            script.onerror = () => {
                razorpayScriptPromise = null
                script.remove()
                reject(new Error('Unable to load Razorpay Checkout. Please try again.'))
            }
            document.body.appendChild(script)
        })
    }

    return razorpayScriptPromise
}

const validate = (form) => {
    const errors = {}

    for (const [field, value] of Object.entries(form)) {
        // Whitespace-only counts as empty.
        if (!value.trim()) {
            errors[field] = `${FIELD_LABELS[field]} is required.`
        }
    }

    if (!errors.phone && !PHONE.test(form.phone.replace(/[\s-]/g, ''))) {
        errors.phone = 'Enter a valid 10-digit phone number.'
    }

    if (!errors.pincode && !PINCODE.test(form.pincode.trim())) {
        errors.pincode = 'Pincode must contain 6 digits.'
    }

    return errors
}

export default function Checkout() {
    const navigate = useNavigate()

    // The cart comes from the shared state, not from a request of its own.
    // The total shown here is the same total the server charges, GST included.
    const { cartItems, loading, subtotal, gst, total, totalQuantity, clearCart, fetchCart } =
        useCart()

    const [form, setForm] = useState(EMPTY_FORM)
    const [errors, setErrors] = useState({})
    const [submitError, setSubmitError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const submissionLock = useRef(false)

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((current) => ({ ...current, [name]: value }))

        // Drop this field's message as soon as the customer starts fixing it.
        setErrors((current) => ({ ...current, [name]: '' }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (submissionLock.current) return

        setSubmitError('')

        const found = validate(form)

        if (Object.keys(found).length > 0) {
            setErrors(found)
            return
        }

        // Trimmed before it goes anywhere.
        const shippingAddress = Object.fromEntries(
            Object.entries(form).map(([field, value]) => [field, value.trim()])
        )

        submissionLock.current = true
        setSubmitting(true)

        try {
            const paymentOrder = await createPaymentOrder(shippingAddress)
            await loadRazorpay()

            if (!window.Razorpay) {
                throw new Error('Razorpay Checkout could not be initialized. Please try again.')
            }

            // Best-effort: marks the pending order abandoned so it never appears
            // in the customer's history. A failure here is cosmetic, so it is
            // swallowed rather than shown.
            const abandonPayment = () => {
                cancelPaymentOrder(paymentOrder.shopKartOrderId).catch(() => {})
            }

            const checkout = new window.Razorpay({
                key: paymentOrder.keyId,
                amount: paymentOrder.amount,
                currency: paymentOrder.currency,
                name: 'ShopKart',
                description: 'ShopKart order payment',
                order_id: paymentOrder.razorpayOrderId,
                prefill: {
                    name: shippingAddress.fullName,
                    contact: shippingAddress.phone
                },
                handler: async (response) => {
                    try {
                        const confirmed = await verifyPayment({
                            shopKartOrderId: paymentOrder.shopKartOrderId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })

                        if (!confirmed.success || !confirmed.order?._id) {
                            throw new Error('Payment could not be confirmed. Please retry verification.')
                        }

                        if (confirmed.cartCleared) {
                            clearCart()
                        } else {
                            await fetchCart()
                        }

                        navigate(`/order-success/${confirmed.order._id}`, { replace: true })
                    } catch (error) {
                        setSubmitError(error.message || 'Payment verification failed. Please try again.')
                        submissionLock.current = false
                        setSubmitting(false)
                    }
                },
                modal: {
                    ondismiss: () => {
                        abandonPayment()
                        setSubmitError('Payment was cancelled. Your cart is unchanged; you can try again.')
                        submissionLock.current = false
                        setSubmitting(false)
                    }
                },
                theme: { color: '#1f2937' }
            })

            checkout.on('payment.failed', (event) => {
                abandonPayment()
                setSubmitError(
                    event.error?.description || 'Payment failed. Your cart is unchanged; please try again.'
                )
                submissionLock.current = false
                setSubmitting(false)
            })
            checkout.open()
        } catch (error) {
            setSubmitError(error.message || 'Unable to start payment. Please try again.')
            submissionLock.current = false
            setSubmitting(false)
        }
    }

    return (
        <div>
            <header className="mb-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Checkout</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">Shipping details</h1>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                    Where should this order go? Pay securely with Razorpay.
                </p>
            </header>

            {loading && (
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                    Loading your cart...
                </p>
            )}

            {!loading && cartItems.length === 0 && (
                <div className="border border-line bg-panel p-8">
                    <p className="font-semibold">You have nothing to check out</p>
                    <p className="mt-2 text-sm text-muted">
                        Add a product to your cart before placing an order.
                    </p>
                    <Link
                        to="/products"
                        className="mt-6 inline-block border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Browse Products
                    </Link>
                </div>
            )}

            {!loading && cartItems.length > 0 && (
                <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
                    <form onSubmit={handleSubmit} noValidate className="border border-line bg-panel p-6">
                        {submitError && (
                            <p role="alert" className="mb-6 bg-danger-bg px-3 py-2.5 text-sm text-danger">
                                {submitError}
                            </p>
                        )}

                        <label className="field-label">
                            Full name
                            <input
                                className="field"
                                type="text"
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                placeholder="Who is receiving this?"
                                autoComplete="name"
                            />
                        </label>
                        {errors.fullName && (
                            <p role="alert" className="mt-1 text-xs text-danger">{errors.fullName}</p>
                        )}

                        <label className="field-label mt-5">
                            Phone number
                            <input
                                className="field"
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="10-digit mobile number"
                                autoComplete="tel"
                            />
                        </label>
                        {errors.phone && (
                            <p role="alert" className="mt-1 text-xs text-danger">{errors.phone}</p>
                        )}

                        <label className="field-label mt-5">
                            Address
                            <input
                                className="field"
                                type="text"
                                name="addressLine1"
                                value={form.addressLine1}
                                onChange={handleChange}
                                placeholder="House number, street, area"
                                autoComplete="street-address"
                            />
                        </label>
                        {errors.addressLine1 && (
                            <p role="alert" className="mt-1 text-xs text-danger">{errors.addressLine1}</p>
                        )}

                        <div className="mt-5 grid gap-5 sm:grid-cols-3">
                            <label className="field-label">
                                City
                                <input
                                    className="field"
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="City"
                                    autoComplete="address-level2"
                                />
                                {errors.city && (
                                    <span role="alert" className="mt-1 text-xs text-danger">{errors.city}</span>
                                )}
                            </label>

                            <label className="field-label">
                                State
                                <input
                                    className="field"
                                    type="text"
                                    name="state"
                                    value={form.state}
                                    onChange={handleChange}
                                    placeholder="State"
                                    autoComplete="address-level1"
                                />
                                {errors.state && (
                                    <span role="alert" className="mt-1 text-xs text-danger">{errors.state}</span>
                                )}
                            </label>

                            <label className="field-label">
                                Pincode
                                <input
                                    className="field"
                                    type="text"
                                    name="pincode"
                                    value={form.pincode}
                                    onChange={handleChange}
                                    placeholder="6 digits"
                                    inputMode="numeric"
                                    autoComplete="postal-code"
                                />
                                {errors.pincode && (
                                    <span role="alert" className="mt-1 text-xs text-danger">{errors.pincode}</span>
                                )}
                            </label>
                        </div>

                        <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                            <span className="grid h-9 w-9 place-items-center border border-brand font-mono text-[10px] text-brand">
                                ₹
                            </span>
                            <p className="text-sm text-muted">
                                Secure payment with Razorpay Test Mode.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-6 w-full bg-brand px-4 py-3.5 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? '⏳ Preparing Payment...' : 'Pay with Razorpay'}
                        </button>
                    </form>

                    <aside className="border border-line bg-panel p-6">
                        <h2 className="text-lg font-semibold tracking-tight">Order Summary</h2>

                        <ul className="mt-5 space-y-3 border-b border-line pb-5 text-sm">
                            {cartItems.map((item) => (
                                <li key={item.product._id} className="flex items-start justify-between gap-4">
                                    <span className="min-w-0">
                                        <span className="block truncate">{item.product.name}</span>
                                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                            {item.quantity} × {formatPrice(item.product.price)}
                                        </span>
                                    </span>
                                    <span className="font-mono">
                                        {formatPrice(item.product.price * item.quantity)}
                                    </span>
                                </li>
                            ))}
                        </ul>

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

                        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                            Pay securely through Razorpay
                        </p>
                    </aside>
                </div>
            )}
        </div>
    )
}
