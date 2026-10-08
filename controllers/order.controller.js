import Order from '../models/order.model.js'
import Product from '../models/product.model.js'

// A malformed id is answered with 400 rather than reaching the database.
const isValidObjectId = (id) => /^[0-9a-f]{24}$/i.test(id)

const ADDRESS_FIELDS = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode']

// Optional +91 prefix; spaces and dashes are stripped before this test.
const PHONE = /^(\+91)?[6-9]\d{9}$/
const PINCODE = /^\d{6}$/

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

// Lab 06 COD: built from the database; only the address comes from the body.
export const createCODOrder = async (req, res) => {
    try {
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
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

        const order = await Order.create({
            user: req.user._id,
            items,
            shippingAddress: address,
            totalAmount,
            paymentMethod: 'COD',
            paymentStatus: 'PENDING',
            status: 'PLACED'
        })

        // Cleared only after the order is stored, so a rejected order keeps the cart.
        req.user.cart = []
        await req.user.save()

        res.status(201).json({
            success: true,
            message: 'Order placed successfully. Pay on delivery.',
            order
        })

    } catch (error) {
        console.error('createCODOrder failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const getOrders = async (req, res) => {
    try {
        // Scoped to the authenticated customer, so no account reads another's orders.
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })

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
