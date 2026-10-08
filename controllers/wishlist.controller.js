import Customer from '../models/customer.model.js'
import Product from '../models/product.model.js'

// A malformed id is answered with 400 rather than reaching the database.
const isValidObjectId = (id) => /^[0-9a-f]{24}$/i.test(id)

// Compared as strings: a stored ObjectId is never === to a route param.
const isSaved = (wishlist, productId) =>
    wishlist.some((id) => id.toString() === productId)

export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params

        if (!isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        // The product must exist first, or the wishlist would hold a dangling id.
        const product = await Product.findById(productId)

        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        if (isSaved(req.user.wishlist, productId)) {
            return res.status(409).json({ message: 'Product is already in your wishlist' })
        }

        req.user.wishlist.push(product._id)
        await req.user.save()

        res.status(200).json({
            success: true,
            message: 'Product added to wishlist'
        })

    } catch (error) {
        console.error('addToWishlist failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const getWishlist = async (req, res) => {
    try {
        // populate fills the references with the fields a product card renders.
        const customer = await Customer.findById(req.user._id).populate({
            path: 'wishlist',
            select: 'name price category image stock'
        })

        const wishlist = customer.wishlist

        res.status(200).json({
            success: true,
            count: wishlist.length,
            wishlist
        })

    } catch (error) {
        console.error('getWishlist failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params

        if (!isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        // Nothing to remove is a 404, not a silent success.
        if (!isSaved(req.user.wishlist, productId)) {
            return res.status(404).json({ message: 'Product is not in your wishlist' })
        }

        req.user.wishlist.pull(productId)
        await req.user.save()

        res.status(200).json({
            success: true,
            message: 'Product removed from wishlist'
        })

    } catch (error) {
        console.error('removeFromWishlist failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

// Lab 04 bonus: flips the saved state and reports which way it went.
export const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.params

        if (!isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        const product = await Product.findById(productId)

        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        const saved = isSaved(req.user.wishlist, productId)

        if (saved) {
            req.user.wishlist.pull(productId)
        } else {
            req.user.wishlist.push(product._id)
        }

        await req.user.save()

        res.status(200).json({
            success: true,
            saved: !saved,
            message: saved ? 'Product removed from wishlist' : 'Product added to wishlist'
        })

    } catch (error) {
        console.error('toggleWishlist failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}
