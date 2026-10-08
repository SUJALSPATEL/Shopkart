import Product from '../models/product.model.js'

// A raw search term goes inside a regex, so metacharacters must be escaped.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ObjectId.isValid() also accepts 12-char strings, so match the 24 hex shape.
const isValidObjectId = (id) => /^[0-9a-f]{24}$/i.test(id)

export const createProduct = async (req, res) => {
    try {
        const { name, description, price, category, image, stock } = req.body

        if (!name || !description || !category || !image || price === undefined || stock === undefined) {
            return res.status(400).json({ message: 'All product fields are required' })
        }

        const product = await Product.create({ name, description, price, category, image, stock })

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product
        })

    } catch (error) {
        // A model validation error is the client's mistake, so answer 400 not 500.
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: error.message })
        }

        console.error('createProduct failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const getProducts = async (req, res) => {
    try {
        const { search, category, sort } = req.query

        // One query object, so search and category can be combined.
        const query = {}

        if (search && search.trim()) {
            query.name = { $regex: escapeRegex(search.trim()), $options: 'i' }
        }

        if (category && category.trim() && category !== 'All Categories') {
            query.category = category.trim()
        }

        const sortOption = sort === 'price_asc'
            ? { price: 1 }
            : sort === 'price_desc'
                ? { price: -1 }
                : {}

        // The listing does not need the description; the details endpoint returns it.
        const products = await Product.find(query)
            .select('name price category image stock')
            .sort(sortOption)

        res.status(200).json({
            success: true,
            count: products.length,
            products
        })

    } catch (error) {
        console.error('getProducts failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid product ID' })
        }

        const product = await Product.findById(id)

        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        res.status(200).json({ success: true, product })

    } catch (error) {
        console.error('getProductById failed:', error)
        res.status(500).json({ message: 'Server crashed' })
    }
}
