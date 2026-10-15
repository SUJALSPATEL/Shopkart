import express from 'express'
import {
    cancelPaymentOrder,
    createPaymentOrder,
    getOrders,
    getOrderById,
    verifyPayment
} from '../controllers/order.controller.js'
import { isAuthenticated } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Applied to the whole router so no order endpoint can be added without auth.
router.use(isAuthenticated)

router.post('/create-payment-order', createPaymentOrder)
router.post('/verify-payment', verifyPayment)

// Two segments, so it cannot collide with the literal path above.
router.post('/:id/cancel-payment', cancelPaymentOrder)

router.get('/', getOrders)

// Declared after the two above so the literal paths win; this one matches any id.
router.get('/:id', getOrderById)

export default router
