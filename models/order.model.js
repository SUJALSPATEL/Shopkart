import mongoose from 'mongoose'

// Items snapshot name, price and image, so later edits can't rewrite past orders.
const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },

        name: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        image: {
            type: String,
            required: true
        }
    },
    // A snapshot is a value rather than a document, so it carries no id of its own.
    { _id: false }
)

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine1: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    { _id: false }
)

const orderSchema = new mongoose.Schema(
    {
        // The account model is called Customer, so the ref uses that name.
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
            index: true
        },

        items: {
            type: [orderItemSchema],
            required: true
        },

        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },

        // Computed server-side from current prices, never taken from the request.
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        // COD is the only method in this lab, so the enum documents it.
        paymentMethod: {
            type: String,
            enum: ['COD'],
            default: 'COD'
        },

        // Nothing is paid up front — the money is collected on delivery.
        paymentStatus: {
            type: String,
            enum: ['PENDING', 'PAID', 'FAILED'],
            default: 'PENDING'
        },

        status: {
            type: String,
            enum: ['PLACED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
            default: 'PLACED'
        }
    },
    { timestamps: true }
)

const Order = mongoose.model('Order', orderSchema)

export default Order
