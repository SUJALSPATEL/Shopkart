import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { getProducts } from '../services/api.js'

export default function Products() {
    // Filters live in the URL so a filtered view can be shared or reloaded.
    const [searchParams, setSearchParams] = useSearchParams()

    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const sort = searchParams.get('sort') || ''

    const [products, setProducts] = useState([])
    const [status, setStatus] = useState('loading')

    // Seeded from the URL so a shared link fetches the filtered list at once.
    const [debouncedSearch, setDebouncedSearch] = useState(search)

    // Debounced so typing a search fires one request, not one per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400)

        return () => clearTimeout(timer)
    }, [search])

    // Filtering happens in MongoDB, so the browser never re-filters the list.
    useEffect(() => {
        let active = true

        setStatus('loading')

        getProducts({ search: debouncedSearch, category, sort })
            .then((data) => {
                if (!active) return
                setProducts(data.products)
                setStatus('ready')
            })
            .catch(() => {
                if (!active) return
                setStatus('error')
            })

        return () => {
            active = false
        }
    }, [debouncedSearch, category, sort])

    // Merges one filter into the URL; an empty value removes that parameter.
    const updateParams = (changes, { replace = false } = {}) => {
        const next = new URLSearchParams(searchParams)

        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
        }

        setSearchParams(next, { replace })
    }

    // Typing replaces history; dropdowns push an entry, so Back undoes them.
    const handleSearchChange = (value) => updateParams({ search: value }, { replace: true })
    const handleCategoryChange = (value) => updateParams({ category: value })
    const handleSortChange = (value) => updateParams({ sort: value })

    return (
        <div>
            <header className="mb-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Catalog</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">All products</h1>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                    Search by name or narrow the list by category. Results come straight from MongoDB.
                </p>
            </header>

            <SearchBar
                search={search}
                category={category}
                sort={sort}
                onSearchChange={handleSearchChange}
                onCategoryChange={handleCategoryChange}
                onSortChange={handleSortChange}
            />

            <div className="mt-8">
                {status === 'loading' && (
                    <p className="font-mono text-xs uppercase tracking-widest text-muted">Loading products...</p>
                )}

                {status === 'error' && (
                    <div className="border border-line bg-panel p-8">
                        <p className="text-danger">Something went wrong while loading products.</p>
                        <p className="mt-2 text-sm text-muted">Check that the backend is running on port 5000.</p>
                    </div>
                )}

                {status === 'ready' && products.length === 0 && (
                    <div className="border border-line bg-panel p-8">
                        <p className="font-semibold">No products found.</p>
                        <p className="mt-2 text-sm text-muted">
                            Try a different search term or switch the category back to All Categories.
                        </p>
                    </div>
                )}

                {status === 'ready' && products.length > 0 && (
                    <>
                        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted">
                            {products.length} {products.length === 1 ? 'product' : 'products'}
                        </p>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {products.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
