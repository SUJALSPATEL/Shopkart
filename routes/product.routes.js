import express from 'express'
import { createProduct, getProducts, getProductById } from '../controllers/product.controller.js'

const router = express.Router()

// Product creation stays open for this lab; admin authorization arrives later.
router.post('/', createProduct)

router.get('/', getProducts)

router.get('/:id', getProductById)

export default router
