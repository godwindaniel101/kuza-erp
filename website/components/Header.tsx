export default function Header() {
  return (
    <>
      {/* ===== HEADER (identical on every page) ===== */}
      <header className="site-header">
        <div className="container nav">
          <a href="/" className="brand" aria-label="Kuza home">
            <svg className="logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="40" height="40" rx="11" fill="url(#lg)" />
              <path d="M13 27V13m0 7 8-7m-8 7 8 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="28.5" cy="12.5" r="2.6" fill="#ffffff" />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2e56d3" />
                  <stop offset="1" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>
            <span>Kuza</span>
          </a>

          <nav className="nav-links" aria-label="Primary">
            <li className="nav-item--drop">
              <button className="nav-trigger" aria-expanded="false" aria-haspopup="true">
                Products
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="dropdown" role="menu">
                <a className="drop-link" href="/restaurant" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">Restaurant</span><span className="drop-ds">Orders, tables & kitchen display</span></span></a>
                <a className="drop-link" href="/shop" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9h18l-1.4 9.3A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-2-1.7L3 9Zm3 0V7a4 4 0 0 1 8 0v2" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">Shop / POS</span><span className="drop-ds">Fast retail checkout & receipts</span></span></a>
                <a className="drop-link" href="/inventory" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7 12 3l9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">Inventory</span><span className="drop-ds">Stock, transfers & valuation</span></span></a>
                <a className="drop-link" href="/invoicing" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 2h9l3 3v17l-2.5-1.5L13 22l-2.5-1.5L8 22l-2.5-1.5L4 22V4a2 2 0 0 1 2-2Zm2 6h8M8 12h8M8 16h5" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">Invoicing</span><span className="drop-ds">Invoices & pay-by-link</span></span></a>
                <a className="drop-link" href="/accounting" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 4h8M8 11h3m-3 4h3m4-4v4" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">Accounting</span><span className="drop-ds">Auto double-entry books</span></span></a>
                <a className="drop-link" href="/people" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">People & Payroll</span><span className="drop-ds">Staff, leave & payroll</span></span></a>
                <a className="drop-link" href="/payments" role="menuitem"><span className="drop-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20M6 15h4" stroke="#2e56d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><span className="drop-tt">Payments</span><span className="drop-ds">Collect & auto-reconcile</span></span></a>
              </div>
            </li>
            <li><a href="/#business">Business types</a></li>
            <li><a href="/#ai">Kuza AI</a></li>
          </nav>

          <div className="nav-cta">
            <a href="http://localhost:5001/login" className="btn btn--ghost">Sign in</a>
            <a href="http://localhost:5001/register" className="btn btn--primary">
              Start free
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>

          <button className="nav-toggle" aria-label="Open menu" aria-controls="drawer">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className="drawer" id="drawer">
        <div className="drawer-scrim"></div>
        <div className="drawer-panel" role="dialog" aria-label="Menu">
          <div className="drawer-head">
            <a href="/" className="brand"><svg className="logo" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="11" fill="url(#lg2)" /><path d="M13 27V13m0 7 8-7m-8 7 8 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="28.5" cy="12.5" r="2.6" fill="#ffffff" /><defs><linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#2e56d3" /><stop offset="1" stopColor="#4f46e5" /></linearGradient></defs></svg><span>Kuza</span></a>
            <button className="drawer-close" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg></button>
          </div>
          <span className="drawer-sub">Products</span>
          <a href="/restaurant">Restaurant</a>
          <a href="/shop">Shop / POS</a>
          <a href="/inventory">Inventory</a>
          <a href="/invoicing">Invoicing</a>
          <a href="/accounting">Accounting</a>
          <a href="/people">People & Payroll</a>
          <a href="/payments">Payments</a>
          <span className="drawer-sub">Company</span>
          <a href="/#ai">Kuza AI</a>
          <div className="drawer-actions">
            <a href="http://localhost:5001/login" className="btn btn--ghost btn--block">Sign in</a>
            <a href="http://localhost:5001/register" className="btn btn--primary btn--block">Start free</a>
          </div>
        </div>
      </div>
    </>
  );
}
