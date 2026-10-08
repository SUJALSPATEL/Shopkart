import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    // Lab 04: ObjectIds only, so Product stays the source of truth.
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],

    // Lab 05: only a reference and quantity, so prices can never go stale.
    cart: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1
            }
        }
    ]
}, { timestamps: true })


const Customer = mongoose.model('Customer', customerSchema)

export default Customer
