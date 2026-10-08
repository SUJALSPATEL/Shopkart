import mongoose from 'mongoose'
import dns from 'node:dns'

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 10000 }

const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8']

// Some resolvers refuse SRV lookups; spot that and retry against public DNS.
const isSrvLookupFailure = (message) =>
    /querySrv|ESERVFAIL|ECONNREFUSED|ETIMEOUT|ENOTFOUND|getaddrinfo/i.test(message)

// Matched against the driver's own wording so hints say what to change.
const explain = (message) => {
    if (/bad auth|authentication failed/i.test(message)) {
        return 'The username or password in MONGO_URI is wrong. Reset it in Atlas under Database Access.'
    }
    if (/whitelist|Could not connect to any servers/i.test(message)) {
        return 'Atlas refused the connection. Add your current IP, or 0.0.0.0/0 while developing, under Atlas > Network Access.'
    }
    if (isSrvLookupFailure(message)) {
        return 'DNS could not resolve the SRV record. Switch to the standard mongodb:// connection string from Atlas (Connect > Drivers > driver 2.2.12 or earlier), which skips SRV entirely.'
    }
    return null
}

function reportAndThrow(error) {
    console.error('MongoDB connection error:', error.message)

    const hint = explain(error.message)
    if (hint) console.error('Hint:', hint)

    throw error
}

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not defined in .env')
    }

    const isSrvUri = process.env.MONGO_URI.startsWith('mongodb+srv://')

    try {
        // System resolver first: it is the one that works where public DNS is blocked.
        await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS)
    } catch (firstError) {
        if (!isSrvUri || !isSrvLookupFailure(firstError.message)) {
            reportAndThrow(firstError)
        }

        console.warn('SRV lookup failed with the system resolver, retrying with public DNS...')

        dns.setServers(PUBLIC_DNS)

        try {
            await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS)
        } catch (retryError) {
            reportAndThrow(retryError)
        }
    }

    console.log('MongoDB connected')
}

export default connectDB
