import { createHmac, timingSafeEqual } from 'node:crypto'
import Razorpay from 'razorpay'
import Customer from '../models/customer.model.js'
import Order from '../models/order.model.js'
import Product from '../models/product.model.js'

// A malformed id is answered with 400 rather than reaching the database.
const isValidObjectId = (id) => /^[0-9a-f]{24}$/i.test(id)

const ADDRESS_FIELDS = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode']

// Optional +91 prefix; spaces and dashes are stripped before this test.
const PHONE = /^(\+91)?[6-9]\d{9}$/
const PINCODE = /^\d{6}$/

// The cart page shows this same rate, so the two totals must agree to the paisa.
// Kept in step with GST_RATE in frontend/src/context/CartContext.jsx.
const GST_RATE = 0.18

// Rounding to paise, matching roundToPaise in the cart context, so an odd
// subtotal cannot leave a decimal tail that the two sides round differently.
const roundToPaise = (amount) => Math.round(amount * 100) / 100

// The checkout form checks these too, but a request can bypass it.
const readShippingAddress = (address) => {
    if (!address || typeof address !== 'object') {
        return { error: 'Shipping address is required' }
    }

    const cleaned = {}

    for (const field of ADDRESS_FIELDS) {
        const value = address[field]

        if (typeof value !== 'string' || !value.trim()) {
            return { error: 'All shipping address fields are required' }
        }

        cleaned[field] = value.trim()
    }

    if (!PHONE.test(cleaned.phone.replace(/[\s-]/g, ''))) {
        return { error: 'Enter a valid 10-digit phone number.' }
    }

    if (!PINCODE.test(cleaned.pincode)) {
        return { error: 'Pincode must contain 6 digits.' }
    }

    return { address: cleaned }
}

const getRazorpayConfiguration = () => {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret || !keyId.startsWith('rzp_test_')) {
        return null
    }

    return { keyId, keySecret }
}

const cartMatchesOrder = (cart, items) => {
    if (!Array.isArray(cart) || cart.length !== items.length) return false

    const cartQuantities = new Map(
        cart.map((item) => [item.product.toString(), item.quantity])
    )

    return items.every(
        (item) => cartQuantities.get(item.product.toString()) === item.quantity
    )
}

export const createPaymentOrder = async (req, res) => {
    try {
        const configuration = getRazorpayConfiguration()

        if (!configuration) {
            return res.status(503).json({
                message: 'Razorpay Test Mode is not configured on the server.'
            })
        }

        const { shippingAddress } = req.body || {}

        // req.user is loaded by the auth middleware and already carries the cart.
        const cart = req.user.cart

        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty' })
        }

        const { address, error } = readShippingAddress(shippingAddress)

        if (error) {
            return res.status(400).json({ message: error })
        }

        const products = await Product.find({
            _id: { $in: cart.map((item) => item.product) }
        })

        const productById = new Map(products.map((product) => [product._id.toString(), product]))

        const items = []

        for (const cartItem of cart) {
            const product = productById.get(cartItem.product.toString())

            // The product may have been deleted since it was added to the cart.
            if (!product) {
                return res.status(404).json({
                    message: 'A product in your cart is no longer available'
                })
            }

            if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
                return res.status(400).json({ message: `Invalid quantity for ${product.name}` })
            }

            // Stock is re-checked against the live document; the cart may be stale.
            if (cartItem.quantity > product.stock) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}.`
                })
            }

            // Snapshot what was ordered, at the price it was ordered at.
            items.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: cartItem.quantity,
                image: product.image
            })
        }

        // Summed server-side from the snapshots, never from what the browser sent.
        // GST is added here so the charged amount is the same total the cart and
        // checkout pages display; the client never gets to state a price.
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const gstAmount = roundToPaise(subtotal * GST_RATE)
        const totalAmount = roundToPaise(subtotal + gstAmount)

        // Razorpay works in paise, so the rupee total is scaled by 100.
        const amount = Math.round(totalAmount * 100)

        if (!Number.isSafeInteger(amount) || amount < 1) {
            return res.status(400).json({ message: 'Order total is not a valid payment amount.' })
        }

        const order = await Order.create({
            user: req.user._id,
            items,
            shippingAddress: address,
            totalAmount,
            gstAmount,
            paymentMethod: 'RAZORPAY',
            paymentStatus: 'PENDING',
            status: 'PENDING_PAYMENT'
        })

        try {
            const razorpay = new Razorpay({
                key_id: configuration.keyId,
                key_secret: configuration.keySecret
            })
            const razorpayOrder = await razorpay.orders.create({
                amount,
                currency: 'INR',
                receipt: order._id.toString()
            })

            if (!razorpayOrder.id) {
                throw new Error('Razorpay did not return an order ID')
            }

            order.razorpayOrderId = razorpayOrder.id
            await order.save()

            return res.status(201).json({
                success: true,
                shopKartOrderId: order._id,
                razorpayOrderId: razorpayOrder.id,
                amount,
                currency: 'INR',
                keyId: configuration.keyId,
                subtotal,
                gstAmount,
                totalAmount
            })
        } catch {
            console.error('Razorpay order creation failed; pending order will be cancelled.')
            order.paymentStatus = 'FAILED'
            order.status = 'CANCELLED'
            await order.save()
            return res.status(502).json({
                message: 'Unable to initialize Razorpay payment. Please try again.'
            })
        }

    } catch (error) {
        console.error('createPaymentOrder failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const {
            shopKartOrderId,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature
        } = req.body || {}

        if (!isValidObjectId(shopKartOrderId)) {
            return res.status(400).json({ message: 'Invalid ShopKart order ID' })
        }

        if (
            typeof razorpayOrderId !== 'string' ||
            typeof razorpayPaymentId !== 'string' ||
            !razorpayPaymentId ||
            typeof razorpaySignature !== 'string' ||
            !/^[a-f\d]{64}$/i.test(razorpaySignature)
        ) {
            return res.status(400).json({ message: 'Invalid or incomplete payment details.' })
        }

        const order = await Order.findById(shopKartOrderId)

        if (!order || order.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (!order.razorpayOrderId || razorpayOrderId !== order.razorpayOrderId) {
            return res.status(400).json({ message: 'Payment order does not match this order.' })
        }

        const configuration = getRazorpayConfiguration()

        if (!configuration) {
            return res.status(503).json({
                message: 'Razorpay Test Mode is not configured on the server.'
            })
        }

        const expectedSignature = createHmac('sha256', configuration.keySecret)
            .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
            .digest()
        const suppliedSignature = Buffer.from(razorpaySignature, 'hex')

        if (
            suppliedSignature.length !== expectedSignature.length ||
            !timingSafeEqual(expectedSignature, suppliedSignature)
        ) {
            return res.status(400).json({ message: 'Payment signature verification failed.' })
        }

        if (order.paymentStatus === 'PAID') {
            if (order.razorpayPaymentId !== razorpayPaymentId) {
                return res.status(409).json({ message: 'This order was verified with another payment.' })
            }

            return res.status(200).json({ success: true, order, cartCleared: false })
        }

        if (order.paymentStatus !== 'PENDING' || order.status !== 'PENDING_PAYMENT') {
            return res.status(400).json({ message: 'This order is not awaiting payment.' })
        }

        // One atomic claim decides who owns the transition. Two concurrent
        // verifications of the same payment cannot both match this filter, so
        // only the winner goes on to release stock.
        const claimed = await Order.findOneAndUpdate(
            {
                _id: order._id,
                paymentStatus: 'PENDING',
                status: 'PENDING_PAYMENT'
            },
            {
                $set: {
                    paymentStatus: 'PAID',
                    status: 'PLACED',
                    razorpayPaymentId
                }
            },
            { new: true }
        )

        if (!claimed) {
            // Someone else got there first, so report whatever they settled on.
            const settled = await Order.findById(order._id)

            if (settled?.paymentStatus === 'PAID') {
                return res.status(200).json({ success: true, order: settled, cartCleared: false })
            }

            return res.status(400).json({ message: 'This order is not awaiting payment.' })
        }

        // Stock is released only by the winner, so it can never be taken twice.
        // The $gte guard keeps a competing order from driving stock negative.
        const stockUpdates = await Promise.all(
            claimed.items.map((item) =>
                Product.updateOne(
                    { _id: item.product, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } }
                )
            )
        )

        // The customer has already paid, so a shortfall is logged for follow-up
        // rather than failing the request and discarding a real payment.
        stockUpdates.forEach((result, index) => {
            if (result.modifiedCount !== 1) {
                console.error(
                    `Stock not released for "${claimed.items[index].name}" on order ${claimed._id}: quantity may now exceed stock.`
                )
            }
        })

        let cartCleared = false
        if (cartMatchesOrder(req.user.cart, claimed.items)) {
            const result = await Customer.updateOne(
                { _id: req.user._id, cart: req.user.cart },
                { $set: { cart: [] } }
            )
            cartCleared = result.modifiedCount === 1
        }

        return res.status(200).json({ success: true, order: claimed, cartCleared })
    } catch (error) {
        console.error('verifyPayment failed:', error)
        return res.status(500).json({ message: 'Unable to verify payment.' })
    }
}

// Called when the customer closes the Razorpay modal or a payment fails, so the
// pending row does not linger. The order is marked, never deleted.
export const cancelPaymentOrder = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid order ID' })
        }

        const order = await Order.findById(id)

        // Someone else's order gets the same 404 as a missing one.
        if (!order || order.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Order not found' })
        }

        // A paid order must never be cancelled by this route, however late the
        // request arrives. Refunds are a separate concern.
        if (order.paymentStatus === 'PAID') {
            return res.status(409).json({ message: 'This order has already been paid for.' })
        }

        // Dismiss and failure can both fire, so an already-cancelled order is a
        // success rather than an error.
        if (order.paymentStatus === 'FAILED' && order.status === 'CANCELLED') {
            return res.status(200).json({ success: true, order, alreadyCancelled: true })
        }

        order.paymentStatus = 'FAILED'
        order.status = 'CANCELLED'
        await order.save()

        return res.status(200).json({ success: true, order, alreadyCancelled: false })
    } catch (error) {
        console.error('cancelPaymentOrder failed:', error)
        return res.status(500).json({ message: 'Unable to cancel this payment.' })
    }
}

export const getOrders = async (req, res) => {
    try {
        // Scoped to the authenticated customer, so no account reads another's orders.
        // Abandoned and failed attempts are left out, so the history only ever
        // lists orders that were paid for. They remain reachable by id.
        const orders = await Order.find({
            user: req.user._id,
            status: { $nin: ['PENDING_PAYMENT', 'CANCELLED'] }
        }).sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        })

    } catch (error) {
        console.error('getOrders failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid order ID' })
        }

        const order = await Order.findById(id)

        // Someone else's order returns the same 404 as a missing one.
        if (!order || order.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Order not found' })
        }

        res.status(200).json({ success: true, order })

    } catch (error) {
        console.error('getOrderById failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}
