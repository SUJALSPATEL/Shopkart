import mongoose from 'mongoose'
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Product from '../models/product.model.js'

dotenv.config()

// Sample catalog: Lab 03's two examples plus products across the UI categories.
const products = [
    {
        name: 'Noise Cancelling Headphones',
        description: 'Wireless over-ear headphones with active noise cancellation.',
        price: 4999,
        category: 'Electronics',
        image: 'https://picsum.photos/seed/headphones/800/800',
        stock: 25
    },
    {
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with blue switches.',
        price: 2999,
        category: 'Electronics',
        image: 'https://picsum.photos/seed/keyboard/800/800',
        stock: 10
    },
    {
        name: 'Smartphone 5G 128GB',
        description: 'Mid-range 5G phone with a 120Hz display and 5000mAh battery.',
        price: 24999,
        category: 'Electronics',
        image: 'https://picsum.photos/seed/smartphone/800/800',
        stock: 12
    },
    {
        name: 'Portable Bluetooth Speaker',
        description: 'Waterproof travel speaker with 20 hours of playback.',
        price: 1899,
        category: 'Electronics',
        image: 'https://picsum.photos/seed/speaker/800/800',
        stock: 0
    },
    {
        name: 'Running Shoes',
        description: 'Lightweight breathable trainers built for daily road runs.',
        price: 3499,
        category: 'Fashion',
        image: 'https://picsum.photos/seed/shoes/800/800',
        stock: 18
    },
    {
        name: 'Cotton Hoodie',
        description: 'Heavyweight fleece hoodie with a brushed inner lining.',
        price: 1499,
        category: 'Fashion',
        image: 'https://picsum.photos/seed/hoodie/800/800',
        stock: 30
    },
    {
        name: 'The Pragmatic Programmer',
        description: 'Classic guide to software craftsmanship, 20th anniversary edition.',
        price: 1299,
        category: 'Books',
        image: 'https://picsum.photos/seed/book/800/800',
        stock: 8
    },
    {
        name: 'Ceramic Coffee Mug Set',
        description: 'Set of four stoneware mugs with a matte speckled glaze.',
        price: 899,
        category: 'Home',
        image: 'https://picsum.photos/seed/mugs/800/800',
        stock: 40
    }
]

const seed = async () => {
    try {
        // Reuses connectDB so seeding gets the same DNS/SRV fallback and hints.
        await connectDB()

        // Only the Product collection is cleared so customer accounts survive.
        await Product.deleteMany({})

        const created = await Product.insertMany(products)
        console.log(`Seeded ${created.length} products`)

    } catch (error) {
        console.error('Seeding failed:', error.message)
        process.exitCode = 1
    } finally {
        await mongoose.connection.close()
    }
}

seed()
