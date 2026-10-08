import express from 'express'
import {
    createCODOrder,
    getOrders,
    getOrderById
} from '../controllers/order.controller.js'
import { isAuthenticated } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Applied to the whole router so no order endpoint can be added without auth.
router.use(isAuthenticated)

// Assignment's payment endpoint; here it just creates a COD order, no gateway.
router.post('/create-payment-order', createCODOrder)

router.get('/', getOrders)

// Declared after the two above so the literal paths win; this one matches any id.
router.get('/:id', getOrderById)

export default router
