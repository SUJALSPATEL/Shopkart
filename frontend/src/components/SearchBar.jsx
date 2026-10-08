const CATEGORIES = ['All Categories', 'Electronics', 'Fashion', 'Books', 'Home']

// The values are the exact strings the backend expects in ?sort=.
const SORT_OPTIONS = [
    { label: 'Sort: Default', value: '' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' }
]

// Both dropdowns use '' for "no filter", so no category/sort param is sent.
export default function SearchBar({ search, category, sort, onSearchChange, onCategoryChange, onSortChange }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="field mt-0 flex-1 border border-line bg-panel px-4 py-3 focus:border-brand"
            />

            <select
                value={category}
                onChange={(event) => onCategoryChange(event.target.value)}
                aria-label="Filter by category"
                className="field mt-0 border border-line bg-panel px-4 py-3 focus:border-brand sm:flex-1 lg:w-56 lg:flex-none"
            >
                {CATEGORIES.map((option) => (
                    <option key={option} value={option === 'All Categories' ? '' : option}>
                        {option}
                    </option>
                ))}
            </select>

            <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value)}
                aria-label="Sort products"
                className="field mt-0 border border-line bg-panel px-4 py-3 focus:border-brand sm:flex-1 lg:w-52 lg:flex-none"
            >
                {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}
