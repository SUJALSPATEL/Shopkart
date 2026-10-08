import bcrypt from 'bcrypt'
import Customer from '../models/customer.model.js'
import genToken from '../utils/generateToken.js'

const cookieOptions = {
    httpOnly: true
}

export const registerCustomer = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body

        if (!fullName || !email || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        const existingCustomer = await Customer.findOne({ email })
        if (existingCustomer) {
            return res.status(409).json({ message: "Email already exists" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const customer = await Customer.create({
            fullName,
            email,
            password: hashedPassword,
            phone
        })

        res.status(201).json({
            success: true,
            message: "Customer registered successfully",
            customer: {
                _id: customer._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone
            }
        })

    } catch (error) {
        console.error('Register customer error:', error)
        res.status(500).json({ message: "Server crashed" })
    }
}

export const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        const customer = await Customer.findOne({ email })
        if (!customer) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const isMatch = await bcrypt.compare(password, customer.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const token = genToken(customer._id)

        res.cookie('token', token, cookieOptions)

        res.status(200).json({
            success: true,
            message: "Login successful",
            customer: {
                _id: customer._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone
            }
        })

    } catch (error) {
        console.error('Login customer error:', error)
        res.status(500).json({ message: "Server crashed" })
    }
}

export const getMe = async (req, res) => {
    const { password, ...safeCustomer } = req.user.toObject()

    res.status(200).json(safeCustomer)
}

export const logoutCustomer = async (req, res) => {
    res.clearCookie('token')

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    })
}

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old password and new password are required" })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" })
        }

        const isMatch = await bcrypt.compare(oldPassword, req.user.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Old password is incorrect" })
        }

        const salt = await bcrypt.genSalt(10)
        req.user.password = await bcrypt.hash(newPassword, salt)

        await req.user.save()

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        })

    } catch (error) {
        console.error('Change password error:', error)
        res.status(500).json({ message: "Server crashed" })
    }
}
