import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMe } from '../services/api.js'

const initialsOf = (name) =>
    name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

export default function Home() {
    const navigate = useNavigate()

    const [customer, setCustomer] = useState(null)
    const [status, setStatus] = useState('loading')

    useEffect(() => {
        let active = true

        // Re-read from the API so a forged local value cannot fake a session.
        getMe()
            .then((data) => {
                if (!active) return
                // GET /customers/me responds with the customer document itself.
                setCustomer(data)
                setStatus('ready')
            })
            .catch((error) => {
                if (!active) return

                if (error.status === 401) {
                    navigate('/login', { replace: true })
                    return
                }

                setStatus('error')
            })

        return () => {
            active = false
        }
    }, [navigate])

    if (status === 'loading') {
        return <p className="font-mono text-xs uppercase tracking-widest text-muted">Loading your profile...</p>
    }

    if (status === 'error' || !customer) {
        return (
            <div className="max-w-lg border border-line bg-panel p-8 shadow-[12px_12px_0_#d8ddcd]">
                <h2 className="text-xl font-semibold tracking-tight">We could not load your profile.</h2>
                <p className="mt-2 text-sm text-muted">Check that the backend is running, then try again.</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-6 border border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-paper"
                >
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Signed in</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Welcome back, <span className="text-accent">{customer.fullName.split(' ')[0]}</span>.
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
                Your ShopKart account is active. Head to the catalog whenever you are ready to browse.
            </p>

            <section className="mt-10 border border-line bg-panel p-8 shadow-[12px_12px_0_#d8ddcd]">
                <div className="flex items-center gap-4">
                    <span className="grid h-14 w-14 place-items-center bg-accent text-lg font-bold text-paper">
                        {initialsOf(customer.fullName)}
                    </span>
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Customer</p>
                        <h2 className="text-xl font-semibold tracking-tight">{customer.fullName}</h2>
                    </div>
                </div>

                <dl className="mt-8 border-t border-line">
                    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
                        <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Email</dt>
                        <dd className="text-sm">{customer.email}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
                        <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Phone</dt>
                        <dd className="text-sm">{customer.phone}</dd>
                    </div>
                </dl>

                <Link
                    to="/products"
                    className="mt-8 flex w-full items-center justify-between bg-brand px-4 py-3.5 font-semibold text-paper transition-colors hover:bg-brand-dark"
                >
                    Browse products
                    <span className="text-lime">-&gt;</span>
                </Link>
            </section>
        </div>
    )
}
