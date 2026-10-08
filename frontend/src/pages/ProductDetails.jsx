import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById } from '../services/api.js'

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`

export default function ProductDetails() {
    const { id } = useParams()

    const [product, setProduct] = useState(null)
    const [status, setStatus] = useState('loading')

    useEffect(() => {
        let active = true

        setStatus('loading')

        getProductById(id)
            .then((data) => {
                if (!active) return
                setProduct(data.product)
                setStatus('ready')
            })
            .catch(() => {
                if (!active) return
                setStatus('error')
            })

        return () => {
            active = false
        }
    }, [id])

    if (status === 'loading') {
        return <p className="font-mono text-xs uppercase tracking-widest text-muted">Loading product...</p>
    }

    if (status === 'error' || !product) {
        return (
            <div className="max-w-lg border border-line bg-panel p-8">
                <p className="text-danger">We could not load this product.</p>
                <p className="mt-2 text-sm text-muted">
                    It may have been removed, or the link may be incorrect.
                </p>
                <Link
                    to="/products"
                    className="mt-6 inline-block border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                >
                    Back to products
                </Link>
            </div>
        )
    }

    const inStock = product.stock > 0

    return (
        <div>
            <Link
                to="/products"
                className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-ink"
            >
                &lt;- Back to products
            </Link>

            <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="border border-line bg-panel p-4 shadow-[12px_12px_0_#d8ddcd]">
                    <div className="aspect-square overflow-hidden bg-paper">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                                event.currentTarget.style.visibility = 'hidden'
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand">{product.category}</p>

                    <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                        {product.name}
                    </h1>

                    <p className="mt-5 text-3xl font-bold tracking-tight">{formatPrice(product.price)}</p>

                    <p className="mt-6 leading-relaxed text-muted">{product.description}</p>

                    <dl className="mt-8 border-t border-line">
                        <div className="flex items-center justify-between gap-4 border-b border-line py-4">
                            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Category</dt>
                            <dd className="text-sm">{product.category}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-b border-line py-4">
                            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Stock</dt>
                            <dd className={`text-sm ${inStock ? 'text-brand' : 'text-danger'}`}>
                                {inStock ? `${product.stock} available` : 'Out of stock'}
                            </dd>
                        </div>
                    </dl>

                    {/* Display only — the cart arrives in Lab 04. */}
                    <button
                        type="button"
                        disabled={!inStock}
                        className="mt-8 flex w-full items-center justify-between bg-brand px-4 py-4 font-semibold text-paper transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Add to Cart
                        <span className="text-lime">+</span>
                    </button>

                    <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                        Cart functionality arrives in Lab 04
                    </p>
                </div>
            </div>
        </div>
    )
}
