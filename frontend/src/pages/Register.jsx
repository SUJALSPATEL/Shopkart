import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { registerCustomer } from '../services/api.js'

const EMPTY_FORM = { fullName: '', email: '', password: '', phone: '' }

export default function Register() {
    const navigate = useNavigate()

    const [form, setForm] = useState(EMPTY_FORM)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    }

    // Mirrors the backend rules so errors surface without a round trip.
    const validate = () => {
        if (!form.fullName.trim()) return 'Full name is required.'
        if (!form.email.trim()) return 'Email is required.'
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Enter a valid email address.'
        if (!form.password) return 'Password is required.'
        if (form.password.length < 6) return 'Password must be at least 6 characters.'
        if (!form.phone.trim()) return 'Phone number is required.'
        if (form.phone.replace(/\D/g, '').length < 7) return 'Enter a valid phone number.'
        return ''
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        setError('')
        setSubmitting(true)

        try {
            await registerCustomer(form)
            navigate('/login', { state: { registered: true } })
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthLayout
            kicker="New customer"
            headline={
                <>
                    Start shopping
                    <br />
                    <span className="text-accent">smarter.</span>
                </>
            }
            copy="Create your customer account, keep your details secure, and pick up where you left off."
        >
            <h2 className="mt-8 text-2xl font-semibold tracking-tight">Start shopping smarter.</h2>
            <p className="mt-2 text-sm text-muted">Your account takes less than a minute to set up.</p>

            {error && (
                <p role="alert" className="mt-5 bg-danger-bg px-3 py-2.5 text-sm text-danger">
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} className="mt-7" noValidate>
                <label className="field-label">
                    Full name
                    <input
                        className="field"
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        autoComplete="name"
                    />
                </label>

                <label className="field-label mt-5">
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

                <div className="grid gap-x-6 sm:grid-cols-2">
                    <label className="field-label mt-5">
                        Password
                        <input
                            className="field"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="6+ characters"
                            autoComplete="new-password"
                        />
                    </label>

                    <label className="field-label mt-5">
                        Phone number
                        <input
                            className="field"
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="9876543210"
                            autoComplete="tel"
                        />
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-8 flex w-full items-center justify-between bg-brand px-4 py-3.5 font-semibold text-paper transition-colors hover:bg-brand-dark disabled:opacity-60"
                >
                    {submitting ? 'Creating account...' : 'Create account'}
                    <span className="text-lime">-&gt;</span>
                </button>
            </form>

            <p className="mt-7 text-sm text-muted">
                Already registered?{' '}
                <Link to="/login" className="font-mono text-xs uppercase tracking-widest text-brand underline">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    )
}
