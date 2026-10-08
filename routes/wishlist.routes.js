import express from 'express'
import {
    addToWishlist,
    getWishlist,
    removeFromWishlist,
    toggleWishlist
} from '../controllers/wishlist.controller.js'
import { isAuthenticated } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Applied to the whole router so no wishlist endpoint can be added without auth.
router.use(isAuthenticated)

router.get('/', getWishlist)

router.post('/:productId', addToWishlist)

router.delete('/:productId', removeFromWishlist)

// Lab 04 bonus.
router.patch('/:productId/toggle', toggleWishlist)

export default router
