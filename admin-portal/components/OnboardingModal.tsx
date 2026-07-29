import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';

/**
 * First-login onboarding modal. Shows once per browser (localStorage-gated) with
 * a short, visual walkthrough of the key first actions for the tenant's business
 * type — led by "make your first sale". Each step shows a GIF (drop real ones at
 * `public/onboarding/<key>.gif`; a clean animated panel shows until then) plus a
 * CTA that routes straight into that flow. The persistent GettingStarted card
 * still tracks real progress afterward — this is just the splashy intro.
 */

const SEEN_KEY = 'kuza:onboarding:v1';

interface Slide {
  key: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: string; // boxicons name
}

function slidesFor(businessType: string | null): Slide[] {
  const inviteTeam: Slide = {
    key: 'team',
    title: 'Invite your team',
    body: 'Add a teammate and give them a role — everyone works in the same live workspace.',
    cta: 'Invite a teammate',
    href: '/settings/users',
    icon: 'bx-user-plus',
  };

  if (businessType === 'restaurant' || businessType === 'hospitality') {
    return [
      { key: 'order', title: 'Take your first order', body: 'Open the order screen, add dishes, pick a table, and send it to the kitchen — that is a sale.', cta: 'Take an order', href: '/rms/orders/create', icon: 'bx-receipt' },
      { key: 'menu', title: 'Build your menu', body: 'Add a dish or drink with its price so it is ready to sell at the counter and online.', cta: 'Add a menu item', href: '/rms/menus/create', icon: 'bx-food-menu' },
      { key: 'tables', title: 'Set up your tables', body: 'Lay out the floor so every order maps to the right table.', cta: 'Set up tables', href: '/rms/tables', icon: 'bx-grid-alt' },
      inviteTeam,
    ];
  }

  if (businessType === 'services') {
    return [
      { key: 'invoice', title: 'Send your first invoice', body: 'Bill a customer for work done and get paid — the fastest way to your first sale.', cta: 'Create an invoice', href: '/sales/invoices/new', icon: 'bx-receipt' },
      { key: 'service', title: 'List a service', body: 'Add something you sell so you can put it on invoices in one tap.', cta: 'Add a service', href: '/ims/inventory/create', icon: 'bx-briefcase' },
      { key: 'customer', title: 'Add a customer', body: 'Start your customer list so invoices and history stay tidy.', cta: 'Add a customer', href: '/customers', icon: 'bx-user-circle' },
      inviteTeam,
    ];
  }

  // retail / general / warehouse — the shop-shaped default
  return [
    { key: 'sale', title: 'Make your first sale', body: 'Open the POS, add items to the cart, and take payment — you have rung up your first sale.', cta: 'Open the POS', href: '/pos', icon: 'bx-cart' },
    { key: 'product', title: 'Add your first product', body: 'Put an item in your catalogue with its price and stock so it is ready to sell.', cta: 'Add a product', href: '/ims/inventory/create', icon: 'bx-package' },
    { key: 'invoice', title: 'Send an invoice', body: 'Bill a customer and get paid — great for wholesale or on-account orders.', cta: 'Create an invoice', href: '/sales/invoices/new', icon: 'bx-receipt' },
    inviteTeam,
  ];
}

export default function OnboardingModal() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { businessType } = useTenantStore();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [gifBroken, setGifBroken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(SEEN_KEY) !== '1') setOpen(true);
  }, []);

  if (!open) return null;

  const slides = slidesFor(businessType);
  const slide = slides[i];
  const isLast = i === slides.length - 1;
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const close = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  };
  const start = () => {
    close();
    router.push(slide.href);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
        {/* Visual area — real GIF at /onboarding/<key>.gif, else an animated panel */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-600">
          {!gifBroken[slide.key] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/onboarding/${slide.key}.gif`}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setGifBroken((m) => ({ ...m, [slide.key]: true }))}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="absolute h-28 w-28 animate-ping rounded-full bg-white/20" aria-hidden="true" />
              <i className={`bx ${slide.icon} relative text-6xl text-white`} />
            </div>
          )}
          <button
            onClick={close}
            className="absolute right-3 top-3 rounded-md bg-black/20 p-1.5 text-white/90 transition hover:bg-black/40"
            aria-label="Close"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-5">
          {i === 0 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Welcome, {firstName} 👋
            </p>
          )}
          <h2 id="onboarding-title" className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {slide.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{slide.body}</p>

          {/* Step dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.key}
                onClick={() => setI(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? 'w-6 bg-brand-600 dark:bg-brand-400' : 'w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={close}
              className="text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={start}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <i className={`bx ${slide.icon} text-base`} />
                {slide.cta}
              </button>
              {!isLast && (
                <button
                  onClick={() => setI((n) => Math.min(n + 1, slides.length - 1))}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800"
                >
                  Next
                  <i className="bx bx-right-arrow-alt text-base" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
