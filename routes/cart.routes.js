import express from 'express'
import {
    addToCart,
    getCart,
    updateCartQuantity,
    removeFromCart
} from '../controllers/cart.controller.js'
import { isAuthenticated } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Applied to the whole router so no cart endpoint can be added without auth.
router.use(isAuthenticated)

router.get('/', getCart)

router.post('/:productId', addToCart)

// Quantity travels in the body; the path already carries the product id.
router.patch('/:productId', updateCartQuantity)

router.delete('/:productId', removeFromCart)

export default router
