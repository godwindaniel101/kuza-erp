export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="/" className="brand"><svg className="logo" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="11" fill="url(#lgf)" /><path d="M13 27V13m0 7 8-7m-8 7 8 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="28.5" cy="12.5" r="2.6" fill="#ffffff" /><defs><linearGradient id="lgf" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#2e56d3" /><stop offset="1" stopColor="#4f46e5" /></linearGradient></defs></svg><span>Kuza</span></a>
            <p>The operating system for growing African businesses. Does your books and collects your money — no accountant required.</p>
            <form className="footer-news news-row" aria-label="Newsletter signup">
              <input type="email" placeholder="Work email" aria-label="Work email" required />
              <button type="submit" aria-label="Subscribe"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            </form>
          </div>
          <div className="footer-col">
            <h4>Products</h4>
            <a href="/restaurant">Restaurant</a>
            <a href="/shop">Shop / POS</a>
            <a href="/inventory">Inventory</a>
            <a href="/invoicing">Invoicing</a>
            <a href="/accounting">Accounting</a>
          </div>
          <div className="footer-col">
            <h4>More</h4>
            <a href="/people">People & Payroll</a>
            <a href="/payments">Payments</a>
            <a href="/menu">Kuza Menu</a>
            <a href="/#ai">Kuza AI</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="/#">About</a>
            <a href="/#">Customers</a>
            <a href="/#">Careers</a>
            <a href="/#">Blog</a>
            <a href="/#">Contact</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="/#">Help center</a>
            <a href="/#">Guides</a>
            <a href="/#">API docs</a>
            <a href="/#">Status</a>
            <a href="/#">Privacy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; <span id="year">2026</span> Kuza Technologies. Built for African businesses.</p>
          <div className="socials">
            <a href="/#" aria-label="Kuza on X"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.8-8.9L1 2h6.9l4.8 6.4L18.9 2Zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20Z" /></svg></a>
            <a href="/#" aria-label="Kuza on LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.7 8.65 22 10.6 22 14v7h-4v-6.2c0-1.5-.03-3.4-2.07-3.4-2.07 0-2.39 1.6-2.39 3.3V21H9V9Z" /></svg></a>
            <a href="/#" aria-label="Kuza on Instagram"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" /></svg></a>
            <a href="/#" aria-label="Kuza on WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.9 5-1.3A10 10 0 1 0 12 2Zm5.7 14.1c-.24.67-1.4 1.28-1.93 1.32-.5.05-1.13.24-3.7-.77-3.11-1.23-5.1-4.4-5.25-4.6-.15-.2-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.31.61-.38.81-.38l.58.01c.19.01.44-.07.68.52.24.6.83 2.06.9 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5l-.44.52c-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.14 1.02 2.1 1.33 2.4 1.48.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.35.07.13.07.72-.17 1.39Z" /></svg></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
