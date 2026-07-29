/* ==========================================================================
   Kuza icon family — one 24×24 outline set, stroke 1.8, rounded joins.
   Inline SVG only (no CDN). `currentColor` so tiles/links drive the colour.
   Pure functions → safe in App-Router server components.
   ========================================================================== */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const ArrowR = (p: P) => (<svg {...base(p)}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>);
export const Check = (p: P) => (<svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>);
export const Sparkle = (p: P) => (<svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /><path d="M19 15l.7 1.9L21.6 18l-1.9.7L19 20.6l-.7-1.9L16.4 18l1.9-.7L19 15Z" /></svg>);

/* Modules */
export const Restaurant = (p: P) => (<svg {...base(p)}><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" /></svg>);
export const Inventory = (p: P) => (<svg {...base(p)}><path d="M3 7 12 3l9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10" /></svg>);
export const Invoice = (p: P) => (<svg {...base(p)}><path d="M6 2h9l3 3v17l-2.5-1.5L13 22l-2.5-1.5L8 22l-2.5-1.5L4 22V4a2 2 0 0 1 2-2Zm2 6h8M8 12h8M8 16h5" /></svg>);
export const Accounting = (p: P) => (<svg {...base(p)}><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 4h8M8 11h3m-3 4h3m4-4v4" /></svg>);
export const People = (p: P) => (<svg {...base(p)}><path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>);
export const Payments = (p: P) => (<svg {...base(p)}><path d="M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20M6 15h4" /></svg>);

/* AI + channels */
export const Chat = (p: P) => (<svg {...base(p)}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /><path d="M8.5 11h7M8.5 14h4" /></svg>);
export const Whatsapp = (p: P) => (<svg {...base(p)}><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-.5l-1.3-1.2-1.2.6a4 4 0 0 1-2-2l.6-1.2L9.5 9s-.5.1-.5.5Z" /></svg>);
export const Instagram = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>);
export const Telegram = (p: P) => (<svg {...base(p)}><path d="M21 5 3 12l5 2 2 5 3-3.5 4 3 4-13.5Z" /><path d="m8 14 8-6-6 7" /></svg>);
export const Copilot = (p: P) => (<svg {...base(p)}><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 7v5l3 2" /><path d="M18 3l.8 2.2L21 6l-2.2.8L18 9l-.8-2.2L15 6l2.2-.8L18 3Z" /></svg>);

/* Signals / industries */
export const Store = (p: P) => (<svg {...base(p)}><path d="M4 9V6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V9M3 9h18l-1 3H4l-1-3Zm2 3v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></svg>);
export const Truck = (p: P) => (<svg {...base(p)}><path d="M3 6h11v9H3V6Zm11 3h4l3 3v3h-7V9ZM7 18a2 2 0 1 0 0 .01M18 18a2 2 0 1 0 0 .01" /></svg>);
export const Briefcase = (p: P) => (<svg {...base(p)}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></svg>);
export const Tag = (p: P) => (<svg {...base(p)}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.3" /></svg>);
export const Fuel = (p: P) => (<svg {...base(p)}><path d="M4 22V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v17M3 22h12M6 9h5M15 12h2a2 2 0 0 1 2 2v3a1.5 1.5 0 0 0 3 0V9l-3-3" /></svg>);
export const Factory = (p: P) => (<svg {...base(p)}><path d="M3 21V11l6 3V11l6 3V7l6 3v11H3ZM8 21v-4m6 4v-4M17 7V3h2v4" /></svg>);
export const Table = (p: P) => (<svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11M3 14h18" /></svg>);
export const Shield = (p: P) => (<svg {...base(p)}><path d="M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const Sync = (p: P) => (<svg {...base(p)}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" /></svg>);
