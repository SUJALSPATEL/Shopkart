// Express API client; every request sends the HttpOnly auth cookie.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(path, options = {}) {
    const { headers, ...rest } = options

    let response
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            credentials: 'include',
            ...rest,
            headers: { 'Content-Type': 'application/json', ...(headers || {}) }
        })
    } catch {
        const error = new Error('Unable to reach the server. Is the backend running?')
        error.status = 0
        throw error
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        const error = new Error(data.message || 'Something went wrong')
        error.status = response.status
        throw error
    }

    return data
}

export const registerCustomer = (customer) =>
    request('/customers/register', { method: 'POST', body: JSON.stringify(customer) })

export const loginCustomer = (credentials) =>
    request('/customers/login', { method: 'POST', body: JSON.stringify(credentials) })

export const getMe = () => request('/customers/me')

export const logoutCustomer = () => request('/customers/logout', { method: 'POST' })

export const changePassword = (passwords) =>
    request('/customers/change-password', { method: 'PATCH', body: JSON.stringify(passwords) })

// Blank values are skipped so the URL never carries an empty filter.
export const getProducts = ({ search = '', category = '', sort = '' } = {}) => {
    const params = new URLSearchParams()

    if (search.trim()) params.set('search', search.trim())
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)

    const query = params.toString()

    return request(`/products${query ? `?${query}` : ''}`)
}

export const getProductById = (id) => request(`/products/${id}`)

export const createProduct = (product) =>
    request('/products', { method: 'POST', body: JSON.stringify(product) })

// No customer id is sent; the backend reads it from the auth cookie.
export const getWishlist = () => request('/wishlist')

export const addToWishlist = (productId) => request(`/wishlist/${productId}`, { method: 'POST' })

export const removeFromWishlist = (productId) =>
    request(`/wishlist/${productId}`, { method: 'DELETE' })

export const toggleWishlist = (productId) =>
    request(`/wishlist/${productId}/toggle`, { method: 'PATCH' })

// The customer comes from the auth cookie; each call returns the full cart.
export const getCart = () => request('/cart')

// POST adds one: it covers both "add" and "increase".
export const addToCart = (productId) => request(`/cart/${productId}`, { method: 'POST' })

export const updateCartQuantity = (productId, quantity) =>
    request(`/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })

export const removeFromCart = (productId) =>
    request(`/cart/${productId}`, { method: 'DELETE' })

// Only the address is sent; the server prices the items from the cart.
export const createPaymentOrder = (shippingAddress) =>
    request('/orders/create-payment-order', {
        method: 'POST',
        body: JSON.stringify({ shippingAddress })
    })

export const verifyPayment = (paymentDetails) =>
    request('/orders/verify-payment', {
        method: 'POST',
        body: JSON.stringify(paymentDetails)
    })

// Marks a pending order abandoned, so it does not linger in the customer's history.
export const cancelPaymentOrder = (orderId) =>
    request(`/orders/${orderId}/cancel-payment`, { method: 'POST' })

export const getOrders = () => request('/orders')

export const getOrderById = (orderId) => request(`/orders/${orderId}`)
