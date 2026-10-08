import jwt from 'jsonwebtoken'

const genToken = (customerId) => {
    return jwt.sign({ customerId },
        process.env.jwt_secret,
        { expiresIn: "10d" })
}

export default genToken
