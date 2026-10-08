import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { CartProvider } from './context/CartContext.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import OrderDetails from './pages/OrderDetails.jsx'
import Orders from './pages/Orders.jsx'
import OrderSuccess from './pages/OrderSuccess.jsx'
import ProductDetails from './pages/ProductDetails.jsx'
import Products from './pages/Products.jsx'
import Register from './pages/Register.jsx'
import Wishlist from './pages/Wishlist.jsx'

export default function App() {
    return (
        // Catalog inputs are URL-controlled, so navigation must render synchronously.
        <BrowserRouter useTransitions={false}>
            {/* Cart is shared by navbar, cards and cart page, so it lives above them. */}
            <CartProvider>
                <div className="dotted flex min-h-screen flex-col">
                    <Navbar />

                    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
                        <Routes>
                            <Route path="/" element={<Navigate to="/home" replace />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/home" element={<Home />} />

                            {/* Layout route checks the session once; child routes stay mounted. */}
                            <Route element={<ProtectedRoute />}>
                                <Route path="/products" element={<Products />} />
                                <Route path="/products/:id" element={<ProductDetails />} />
                                <Route path="/wishlist" element={<Wishlist />} />
                                <Route path="/cart" element={<Cart />} />
                                <Route path="/checkout" element={<Checkout />} />
                                <Route path="/orders" element={<Orders />} />
                                <Route path="/orders/:id" element={<OrderDetails />} />
                                <Route path="/order-success/:id" element={<OrderSuccess />} />
                            </Route>

                            <Route path="*" element={<Navigate to="/home" replace />} />
                        </Routes>
                    </main>

                    <footer className="mx-auto w-full max-w-6xl px-6 pb-6 font-mono text-[10px] uppercase tracking-widest text-muted">
                        ShopKart <span className="mx-2 text-accent">•</span> Customer access &amp; product catalog
                    </footer>
                </div>
            </CartProvider>
        </BrowserRouter>
    )
}
