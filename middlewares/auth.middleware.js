import jwt from 'jsonwebtoken'
import Customer from '../models/customer.model.js'

export const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({ message: "Not authorized, please login" })
        }

        const decoded = jwt.verify(token, process.env.jwt_secret)

        const customer = await Customer.findById(decoded.customerId)

        if (!customer) {
            return res.status(401).json({ message: "Not authorized, please login" })
        }

        req.user = customer

        next()

    } catch (error) {
        return res.status(401).json({ message: "Not authorized, please login" })
    }
}
