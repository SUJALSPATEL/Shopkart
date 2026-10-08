import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import { getWishlist, removeFromWishlist } from '../services/api.js'

export default function Wishlist() {
    const [wishlist, setWishlist] = useState([])
    const [status, setStatus] = useState('loading')

    // Bumping this re-runs the effect below, which is what Try Again does.
    const [attempt, setAttempt] = useState(0)

    // Only one card can be mid-removal at a time, so a single id covers it.
    const [removingId, setRemovingId] = useState(null)
    const [removeError, setRemoveError] = useState('')

    useEffect(() => {
        let active = true

        setStatus('loading')

        getWishlist()
            .then((data) => {
                if (!active) return
                setWishlist(data.wishlist)
                setStatus('ready')
            })
            .catch(() => {
                if (!active) return
                setStatus('error')
            })

        return () => {
            active = false
        }
    }, [attempt])

    const handleRemove = async (productId) => {
        setRemovingId(productId)
        setRemoveError('')

        try {
            await removeFromWishlist(productId)

            // Drop it locally so the card disappears without re-reading the list.
            setWishlist((current) => current.filter((product) => product._id !== productId))
        } catch (error) {
            setRemoveError(error.message)
        } finally {
            setRemovingId(null)
        }
    }

    return (
        <div>
            <header className="mb-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Saved</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">Your wishlist</h1>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                    Products you have saved. They stay here between visits because they are stored
                    against your account.
                </p>
            </header>

            {status === 'loading' && (
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                    Loading your wishlist...
                </p>
            )}

            {status === 'error' && (
                <div className="border border-line bg-panel p-8">
                    <p className="text-danger">Unable to load wishlist.</p>
                    <p className="mt-2 text-sm text-muted">Check that the backend is running, then try again.</p>
                    <button
                        type="button"
                        onClick={() => setAttempt((current) => current + 1)}
                        className="mt-6 border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {status === 'ready' && wishlist.length === 0 && (
                <div className="border border-line bg-panel p-8">
                    <p className="font-semibold">Your wishlist is empty</p>
                    <p className="mt-2 text-sm text-muted">Start saving products you love.</p>
                    <Link
                        to="/products"
                        className="mt-6 inline-block border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                    >
                        Browse Products
                    </Link>
                </div>
            )}

            {status === 'ready' && wishlist.length > 0 && (
                <>
                    <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted">
                        {wishlist.length} {wishlist.length === 1 ? 'product' : 'products'} saved
                    </p>

                    {removeError && (
                        <p role="alert" className="mb-4 bg-danger-bg px-3 py-2.5 text-sm text-danger">
                            {removeError}
                        </p>
                    )}

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {wishlist.map((product) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                action={
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(product._id)}
                                        disabled={removingId === product._id}
                                        className="mt-4 w-full border border-danger px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-danger transition-colors hover:bg-danger hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {removingId === product._id ? '⏳ Removing...' : 'Remove from Wishlist'}
                                    </button>
                                }
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
