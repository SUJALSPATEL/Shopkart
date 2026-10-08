// Shared split-screen shell for Login and Register; only the form fields differ.
export default function AuthLayout({ kicker, headline, copy, children }) {
    return (
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <section className="hidden lg:block">
                <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-brand">
                    ShopKart / Customer Access
                </p>
                <h1 className="text-5xl font-bold leading-[0.95] tracking-tight xl:text-6xl">{headline}</h1>
                <p className="mt-6 max-w-sm leading-relaxed text-muted">{copy}</p>
                <div className="mt-10 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-brand">
                    <span className="h-2 w-2 rounded-full bg-accent ring-4 ring-accent/15" />
                    Authentication service online
                </div>
            </section>

            <section className="w-full max-w-lg border border-line bg-panel p-8 shadow-[12px_12px_0_#d8ddcd] sm:p-12 lg:justify-self-end">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-brand">
                    <span>{kicker}</span>
                    <span className="text-muted">API / 5000</span>
                </div>
                {children}
            </section>
        </div>
    )
}
