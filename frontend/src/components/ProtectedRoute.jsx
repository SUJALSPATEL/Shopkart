import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getMe } from '../services/api.js'

// Layout route; the HttpOnly session cookie can only be verified via the API.
export default function ProtectedRoute() {
    const location = useLocation()

    const [status, setStatus] = useState('checking')

    useEffect(() => {
        let active = true

        getMe()
            .then(() => {
                if (active) setStatus('allowed')
            })
            .catch((error) => {
                if (!active) return

                // 401 is "no session", sign in; anything else is a real failure, not logout.
                setStatus(error.status === 401 ? 'denied' : 'error')
            })

        return () => {
            active = false
        }
    }, [])

    if (status === 'checking') {
        return (
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
                Checking your session...
            </p>
        )
    }

    if (status === 'denied') {
        // Save the full URL so login returns here; replace keeps it out of history.
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }

    if (status === 'error') {
        return (
            <div className="max-w-lg border border-line bg-panel p-8">
                <h2 className="text-xl font-semibold tracking-tight">We could not verify your session.</h2>
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

    return <Outlet />
}
