import { NavLink, useNavigate } from 'react-router-dom'
import { logoutCustomer } from '../services/api.js'
import { useCart } from '../context/CartContext.jsx'

export default function Navbar() {
    const navigate = useNavigate()

    // Read from the shared cart, so the count follows every change with no request.
    const { totalQuantity, clearCart } = useCart()

    const handleLogout = async () => {
        try {
            await logoutCustomer()
        } catch {
            // A failed logout has nothing useful to show, so return to login regardless.
        } finally {
            clearCart()
            navigate('/login')
        }
    }

    const linkClass = ({ isActive }) =>
        `font-mono text-xs uppercase tracking-widest transition-colors ${
            isActive ? 'text-accent' : 'text-muted hover:text-ink'
        }`

    return (
        <header className="sticky top-0 z-10 border-b border-line bg-panel/95 backdrop-blur">
            <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
                <NavLink to="/home" className="flex items-center gap-3">
                    <span className="grid h-9 w-9 -rotate-6 place-items-center font-bold text-paper bg-brand">
                        SK
                    </span>
                    <span className="text-lg font-semibold tracking-tight">ShopKart</span>
                </NavLink>

                <div className="ml-auto flex items-center gap-5 sm:gap-7">
                    <NavLink to="/home" className={linkClass}>
                        Home
                    </NavLink>
                    <NavLink to="/products" className={linkClass}>
                        Products
                    </NavLink>
                    <NavLink to="/wishlist" className={linkClass}>
                        Wishlist
                    </NavLink>
                    <NavLink to="/cart" className={linkClass}>
                        Cart ({totalQuantity})
                    </NavLink>
                    <NavLink to="/orders" className={linkClass}>
                        Orders
                    </NavLink>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="border border-brand px-3 py-2 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper sm:px-4"
                    >
                        Sign out
                    </button>
                </div>
            </nav>
        </header>
    )
}
