import Customer from '../models/customer.model.js'
import Product from '../models/product.model.js'

// A malformed id is answered with 400 rather than reaching the database.
const isValidObjectId = (id) => /^[0-9a-f]{24}$/i.test(id)

// Compared as strings: a stored ObjectId is never === to a route param.
const findItem = (cart, productId) =>
    cart.find((item) => item.product.toString() === productId)

// The fields a cart row renders, matching what GET /products returns.
const CART_FIELDS = 'name description price category image stock'

// req.user holds bare ObjectIds, so the saved document is re-read with populate.
const sendCart = async (customerId, res, message) => {
    const customer = await Customer.findById(customerId).populate({
        path: 'cart.product',
        select: CART_FIELDS
    })

    const cart = customer.cart

    res.status(200).json({
        success: true,
        message,
        count: cart.length,
        cart
    })
}

// Stock is checked against the current Product document, never the client's word.
export const addToCart = async (req, res) => {
    try {
        const { productId } = req.params

        if (!isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        const product = await Product.findById(productId)

        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        const item = findItem(req.user.cart, productId)

        if (item) {
            // Already in the cart, so bump the quantity; a row is never duplicated.
            const nextQuantity = item.quantity + 1

            if (nextQuantity > product.stock) {
                return res.status(400).json({
                    message: `Only ${product.stock} left in stock`
                })
            }

            item.quantity = nextQuantity
        } else {
            if (product.stock < 1) {
                return res.status(400).json({ message: 'Product is out of stock' })
            }

            req.user.cart.push({ product: product._id, quantity: 1 })
        }

        await req.user.save()

        await sendCart(req.user._id, res, 'Cart updated')

    } catch (error) {
        console.error('addToCart failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const getCart = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user._id).populate({
            path: 'cart.product',
            select: CART_FIELDS
        })

        const cart = customer.cart

        res.status(200).json({
            success: true,
            count: cart.length,
            cart
        })

    } catch (error) {
        console.error('getCart failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const updateCartQuantity = async (req, res) => {
    try {
        const { productId } = req.params
        const { quantity } = req.body

        if (!isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        const product = await Product.findById(productId)

        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        const item = findItem(req.user.cart, productId)

        if (!item) {
            return res.status(404).json({ message: 'Product is not in your cart' })
        }

        if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
            return res.status(400).json({ message: 'Quantity must be a whole number' })
        }

        if (quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' })
        }

        if (quantity > product.stock) {
            return res.status(400).json({
                message: `Only ${product.stock} left in stock`
            })
        }

        item.quantity = quantity

        await req.user.save()

        await sendCart(req.user._id, res, 'Cart updated')

    } catch (error) {
        console.error('updateCartQuantity failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params

        if (!isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        const index = req.user.cart.findIndex(
            (item) => item.product.toString() === productId
        )

        // Nothing to remove is a 404, not a silent success.
        if (index === -1) {
            return res.status(404).json({ message: 'Product is not in your cart' })
        }

        // splice mutates only req.user's own array, which came from the JWT.
        req.user.cart.splice(index, 1)

        await req.user.save()

        await sendCart(req.user._id, res, 'Product removed from cart')

    } catch (error) {
        console.error('removeFromCart failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}
