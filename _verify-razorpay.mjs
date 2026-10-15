// Throwaway verification harness. Runs against a separate database and is
// deleted straight after. Not part of the application.
import 'dotenv/config'
import mongoose from 'mongoose'
import dns from 'node:dns'
import { createHmac } from 'node:crypto'
import Customer from './models/customer.model.js'
import Order from './models/order.model.js'
import Product from './models/product.model.js'
import {
    cancelPaymentOrder,
    createPaymentOrder,
    getOrders,
    verifyPayment
} from './controllers/order.controller.js'

// A fake but correctly-prefixed pair, so the code reaches the Razorpay call
// (which fails auth) instead of short-circuiting at the 503 config guard.
// No successful outbound call is ever made.
process.env.RAZORPAY_KEY_ID = 'rzp_test_verifyfake'
process.env.RAZORPAY_KEY_SECRET = 'verify_fake_secret'

const TEST_DB = 'shopkart_verify_tmp'

const [base, query] = process.env.MONGO_URI.split('?')
const TEST_URI = base.replace(/\/[^/]*$/, `/${TEST_DB}`) + (query ? `?${query}` : '')

let passed = 0
let failed = 0

const check = (name, condition, detail = '') => {
    if (condition) {
        passed++
        console.log(`  PASS  ${name}`)
    } else {
        failed++
        console.log(`  FAIL  ${name}${detail ? `  -> ${detail}` : ''}`)
    }
}

// Minimal Express response double: handlers only use status().json().
const makeRes = () => {
    const res = { statusCode: 200, body: null }
    res.status = (code) => {
        res.statusCode = code
        return res
    }
    res.json = (body) => {
        res.body = body
        return res
    }
    return res
}

const ADDRESS = {
    fullName: 'Verify User',
    phone: '9876543210',
    addressLine1: '1 Test Street',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001'
}

const sign = (razorpayOrderId, razorpayPaymentId) =>
    createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

const latestOrderFor = (userId) => Order.findOne({ user: userId }).sort({ createdAt: -1 })

// Same workaround as config/db.js: this machine's resolver refuses SRV lookups.
async function connectWithFallback(uri) {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
    } catch (error) {
        if (!/querySrv|ESERVFAIL|ECONNREFUSED|ETIMEOUT|ENOTFOUND|getaddrinfo/i.test(error.message)) {
            throw error
        }
        dns.setServers(['1.1.1.1', '8.8.8.8'])
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
    }
}

async function main() {
    await connectWithFallback(TEST_URI)
    console.log(`Connected to throwaway database: ${TEST_DB}\n`)

    await Promise.all([
        Product.deleteMany({}),
        Order.deleteMany({}),
        Customer.deleteMany({})
    ])

    const widget = await Product.create({
        name: 'Verify Widget',
        description: 'test',
        price: 999.99,
        category: 'Test',
        image: 'https://example.test/w.png',
        stock: 10
    })

    const scarce = await Product.create({
        name: 'Scarce Widget',
        description: 'test',
        price: 50,
        category: 'Test',
        image: 'https://example.test/s.png',
        stock: 1
    })

    // --- A. createPaymentOrder validation ---------------------------------
    console.log('A. createPaymentOrder validation')

    const emptyUser = await Customer.create({
        fullName: 'Empty', email: 'empty@verify.test', password: 'x', phone: '9876543210', cart: []
    })
    let res = makeRes()
    await createPaymentOrder({ user: emptyUser, body: { shippingAddress: ADDRESS } }, res)
    check('empty cart -> 400', res.statusCode === 400 && /cart is empty/i.test(res.body.message),
        `${res.statusCode} ${res.body?.message}`)

    const cartUser = await Customer.create({
        fullName: 'Buyer', email: 'buyer@verify.test', password: 'x', phone: '9876543210',
        cart: [{ product: widget._id, quantity: 2 }]
    })
    const cartUserFresh = await Customer.findById(cartUser._id)

    res = makeRes()
    await createPaymentOrder({ user: cartUserFresh, body: { shippingAddress: { ...ADDRESS, pincode: '12' } } }, res)
    check('bad pincode -> 400', res.statusCode === 400 && /6 digits/i.test(res.body.message),
        `${res.statusCode} ${res.body?.message}`)

    const scarceUser = await Customer.create({
        fullName: 'Scarce', email: 'scarce@verify.test', password: 'x', phone: '9876543210',
        cart: [{ product: scarce._id, quantity: 5 }]
    })
    res = makeRes()
    await createPaymentOrder(
        { user: await Customer.findById(scarceUser._id), body: { shippingAddress: ADDRESS } }, res
    )
    check('quantity over stock -> 400', res.statusCode === 400 && /insufficient stock/i.test(res.body.message),
        `${res.statusCode} ${res.body?.message}`)

    // --- B. GST is computed and stored server-side -------------------------
    console.log('\nB. GST computation (asserted on the stored order)')

    res = makeRes()
    await createPaymentOrder(
        { user: await Customer.findById(cartUser._id), body: { shippingAddress: ADDRESS } }, res
    )

    // The Razorpay call is expected to fail auth with the fake keys, so this
    // exercises the 502 branch - but the order row is written before that call,
    // which is exactly where the numbers we care about are set.
    check('failed gateway -> 502', res.statusCode === 502, `${res.statusCode} ${res.body?.message}`)

    const priced = await latestOrderFor(cartUser._id)
    const expectedSubtotal = 999.99 * 2          // 1999.98
    const expectedGst = Math.round(expectedSubtotal * 0.18 * 100) / 100  // 360
    check('subtotal stored', priced.totalAmount - priced.gstAmount === expectedSubtotal,
        `got ${priced.totalAmount - priced.gstAmount}, want ${expectedSubtotal}`)
    check('gst stored (rounded to paise)', priced.gstAmount === expectedGst,
        `got ${priced.gstAmount}, want ${expectedGst}`)
    check('total == subtotal + gst', priced.totalAmount === expectedSubtotal + expectedGst,
        `got ${priced.totalAmount}`)
    check('gateway failure cancels the pending row',
        priced.status === 'CANCELLED' && priced.paymentStatus === 'FAILED',
        `${priced.status}/${priced.paymentStatus}`)

    // --- C. verifyPayment ---------------------------------------------------
    console.log('\nC. verifyPayment')

    const SHIPPING = ADDRESS
    const itemsFor = (product, quantity) => [{
        product: product._id, name: product.name, price: product.price,
        quantity, image: product.image
    }]

    const makePending = (userId, razorpayOrderId, product, quantity, gst = 18) =>
        Order.create({
            user: userId,
            items: itemsFor(product, quantity),
            shippingAddress: SHIPPING,
            totalAmount: product.price * quantity + gst,
            gstAmount: gst,
            paymentMethod: 'RAZORPAY',
            paymentStatus: 'PENDING',
            status: 'PENDING_PAYMENT',
            razorpayOrderId
        })

    const badUser = await Customer.create({
        fullName: 'Bad Sig', email: 'badsig@verify.test', password: 'x', phone: '9876543210',
        cart: [{ product: widget._id, quantity: 1 }]
    })
    const badOrder = await makePending(badUser._id, 'order_badsig', widget, 1)

    res = makeRes()
    await verifyPayment({
        user: await Customer.findById(badUser._id),
        body: {
            shopKartOrderId: badOrder._id.toString(),
            razorpay_order_id: 'order_badsig',
            razorpay_payment_id: 'pay_badsig',
            razorpay_signature: 'f'.repeat(64)
        }
    }, res)
    check('tampered signature -> 400', res.statusCode === 400 && /signature verification failed/i.test(res.body.message),
        `${res.statusCode} ${res.body?.message}`)
    check('tampered signature leaves order pending',
        (await Order.findById(badOrder._id)).paymentStatus === 'PENDING')

    const mismatchUser = await Customer.create({
        fullName: 'Mismatch', email: 'mismatch@verify.test', password: 'x', phone: '9876543210',
        cart: [{ product: widget._id, quantity: 1 }]
    })
    const mismatchOrder = await makePending(mismatchUser._id, 'order_real', widget, 1)

    res = makeRes()
    await verifyPayment({
        user: await Customer.findById(mismatchUser._id),
        body: {
            shopKartOrderId: mismatchOrder._id.toString(),
            razorpay_order_id: 'order_someoneelse',
            razorpay_payment_id: 'pay_x',
            razorpay_signature: sign('order_someoneelse', 'pay_x')
        }
    }, res)
    check('razorpay order mismatch -> 400', res.statusCode === 400 && /does not match/i.test(res.body.message),
        `${res.statusCode} ${res.body?.message}`)

    // The happy path: a signature this server would itself accept.
    const payUser = await Customer.create({
        fullName: 'Payer', email: 'payer@verify.test', password: 'x', phone: '9876543210',
        cart: [{ product: widget._id, quantity: 2 }]
    })
    const payOrder = await makePending(payUser._id, 'order_pay', widget, 2)
    const stockBefore = (await Product.findById(widget._id)).stock

    const validBody = {
        shopKartOrderId: payOrder._id.toString(),
        razorpay_order_id: 'order_pay',
        razorpay_payment_id: 'pay_valid',
        razorpay_signature: sign('order_pay', 'pay_valid')
    }

    res = makeRes()
    await verifyPayment({ user: await Customer.findById(payUser._id), body: validBody }, res)
    check('valid signature -> 200', res.statusCode === 200 && res.body.success === true,
        `${res.statusCode} ${res.body?.message}`)
    check('order marked PAID/PLACED',
        res.body.order?.paymentStatus === 'PAID' && res.body.order?.status === 'PLACED',
        `${res.body.order?.paymentStatus}/${res.body.order?.status}`)
    check('cart cleared', res.body.cartCleared === true, `cartCleared=${res.body.cartCleared}`)

    const stockAfter = (await Product.findById(widget._id)).stock
    check('stock decremented by quantity', stockAfter === stockBefore - 2,
        `before ${stockBefore}, after ${stockAfter}`)

    // Calling verify again must not touch stock a second time.
    res = makeRes()
    await verifyPayment({ user: await Customer.findById(payUser._id), body: validBody }, res)
    const stockAfterReplay = (await Product.findById(widget._id)).stock
    check('replayed verification does not double-decrement',
        stockAfterReplay === stockAfter, `after replay ${stockAfterReplay}`)
    check('replayed verification reports another payment -> 409',
        res.statusCode === 409, `${res.statusCode} ${res.body?.message}`)

    // --- D. cancelPaymentOrder ---------------------------------------------
    console.log('\nD. cancelPaymentOrder')

    res = makeRes()
    await cancelPaymentOrder({ user: payUser, params: { id: 'not-an-id' } }, res)
    check('malformed id -> 400', res.statusCode === 400, `${res.statusCode}`)

    const stranger = await Customer.create({
        fullName: 'Stranger', email: 'stranger@verify.test', password: 'x', phone: '9876543210', cart: []
    })
    res = makeRes()
    await cancelPaymentOrder({ user: stranger, params: { id: payOrder._id.toString() } }, res)
    check("another customer's order -> 404", res.statusCode === 404, `${res.statusCode}`)

    res = makeRes()
    await cancelPaymentOrder({ user: await Customer.findById(payUser._id), params: { id: payOrder._id.toString() } }, res)
    check('paid order -> 409 (never cancellable)', res.statusCode === 409, `${res.statusCode}`)
    check('paid order still PAID after refused cancel',
        (await Order.findById(payOrder._id)).paymentStatus === 'PAID')

    const abandonUser = await Customer.create({
        fullName: 'Abandon', email: 'abandon@verify.test', password: 'x', phone: '9876543210',
        cart: [{ product: widget._id, quantity: 1 }]
    })
    const abandonOrder = await makePending(abandonUser._id, 'order_abandon', widget, 1)

    res = makeRes()
    await cancelPaymentOrder({ user: abandonUser, params: { id: abandonOrder._id.toString() } }, res)
    check('pending order -> 200 CANCELLED',
        res.statusCode === 200 && res.body.order?.status === 'CANCELLED',
        `${res.statusCode} ${res.body?.order?.status}`)

    res = makeRes()
    await cancelPaymentOrder({ user: abandonUser, params: { id: abandonOrder._id.toString() } }, res)
    check('repeat cancel is idempotent -> 200',
        res.statusCode === 200 && res.body.alreadyCancelled === true, `${res.statusCode}`)

    // --- E. getOrders filter ------------------------------------------------
    console.log('\nE. getOrders')

    res = makeRes()
    await getOrders({ user: abandonUser }, res)
    const listed = res.body.orders.map((o) => o.status)
    check('cancelled order hidden from history', !listed.includes('CANCELLED'), listed.join(','))
    check('pending order hidden from history', !listed.includes('PENDING_PAYMENT'), listed.join(','))
    check('returns 200 with a count', res.statusCode === 200 && res.body.count === res.body.orders.length)

    res = makeRes()
    await getOrders({ user: payUser }, res)
    check('paid order still listed', res.body.orders.some((o) => o._id.toString() === payOrder._id.toString()))

    console.log(`\n${passed} passed, ${failed} failed`)
    return failed
}

let exitCode = 1
try {
    exitCode = await main()
} catch (error) {
    console.error('\nHarness error:', error)
    exitCode = 1
} finally {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    console.log('Throwaway database dropped.')
}

process.exit(exitCode)
