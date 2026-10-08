import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { useCart } from '../context/CartContext.jsx'
import { loginCustomer } from '../services/api.js'

export default function Login() {
    const navigate = useNavigate()
    const location = useLocation()

    // The provider loaded signed-out, so re-read the cart to restore this one's.
    const { fetchCart } = useCart()

    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Set by the Register page after a successful signup.
    const notice = location.state?.registered ? 'Account created. You can sign in now.' : ''

    // Set by ProtectedRoute, so signing in lands on the page originally asked for.
    const redirectTo = location.state?.from || '/home'

    const handleChange = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')

        if (!form.email.trim() || !form.password) {
            setError('Email and password are required.')
            return
        }

        setSubmitting(true)

        try {
            await loginCustomer(form)

            // Not awaited: the cart read must not hold up the redirect.
            fetchCart()

            navigate(redirectTo, { replace: true })
        } catch (err) {
            // Backend never says which field failed, so treat 401 as bad credentials.
            setError(err.status === 401 ? 'Invalid Credentials' : err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthLayout
            kicker="Welcome back"
            headline={
                <>
                    Your essentials,
                    <br />
                    <span className="text-accent">ready when you are.</span>
                </>
            }
            copy="Sign in to reach your profile and browse the ShopKart catalog."
        >
            <h2 className="mt-8 text-2xl font-semibold tracking-tight">Good to see you.</h2>
            <p className="mt-2 text-sm text-muted">Use your ShopKart account to continue.</p>

            {notice && !error && <p className="mt-5 bg-ok-bg px-3 py-2.5 text-sm text-brand">{notice}</p>}

            {error && (
                <p role="alert" className="mt-5 bg-danger-bg px-3 py-2.5 text-sm text-danger">
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} className="mt-7" noValidate>
                <label className="field-label">
                    Email address
                    <input
                        className="field"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        autoComplete="email"
                    />
                </label>

                <label className="field-label mt-5">
                    Password
                    <input
                        className="field"
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Your password"
                        autoComplete="current-password"
                    />
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-8 flex w-full items-center justify-between bg-brand px-4 py-3.5 font-semibold text-paper transition-colors hover:bg-brand-dark disabled:opacity-60"
                >
                    {submitting ? 'Signing in...' : 'Sign in'}
                    <span className="text-lime">-&gt;</span>
                </button>
            </form>

            <p className="mt-7 text-sm text-muted">
                New to ShopKart?{' '}
                <Link to="/register" className="font-mono text-xs uppercase tracking-widest text-brand underline">
                    Create account
                </Link>
            </p>
        </AuthLayout>
    )
}
