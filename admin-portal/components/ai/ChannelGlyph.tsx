import type { ChannelType } from '@/lib/agents';

/**
 * Hand-drawn, brand-style inline SVG glyphs for each messaging channel — no
 * external assets. Each renders inside a soft tinted tile in the vendor's own
 * mark colour (a third-party logo, deliberately NOT the app accent). Web chat
 * is Kuza's own surface, so it wears the app accent.
 */

interface Meta {
  /** Tile tint (very soft) and glyph colour. */
  tint: string;
  color: string;
  glyph: JSX.Element;
}

const G: Record<ChannelType, Meta> = {
  whatsapp: {
    tint: 'rgba(37,211,102,0.12)',
    color: '#1FA855',
    glyph: (
      <path
        d="M12 3.2a8.8 8.8 0 0 0-7.52 13.38L3.3 20.8l4.36-1.14A8.8 8.8 0 1 0 12 3.2Zm4.9 12.35c-.2.57-1.18 1.1-1.63 1.14-.44.04-.85.2-2.86-.6-2.42-.95-3.94-3.44-4.06-3.6-.12-.16-.98-1.3-.98-2.48 0-1.18.62-1.76.84-2 .22-.24.48-.3.64-.3l.46.01c.16 0 .35-.03.53.42.2.48.66 1.66.72 1.78.06.12.1.26.02.42-.08.16-.12.26-.24.4l-.36.42c-.12.12-.24.25-.1.49.14.24.62 1.02 1.34 1.66.92.82 1.7 1.08 1.94 1.2.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.14 1.15Z"
        fill="currentColor"
      />
    ),
  },
  instagram: {
    tint: 'rgba(228,64,95,0.12)',
    color: '#D6306B',
    glyph: (
      <g fill="none" stroke="currentColor" strokeWidth={1.7}>
        <rect x="4" y="4" width="16" height="16" rx="4.6" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="16.6" cy="7.4" r="1" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  tiktok: {
    tint: 'rgba(15,23,42,0.10)',
    color: '#111827',
    glyph: (
      <path
        d="M14 3.5c.3 2 1.5 3.6 3.7 3.9v2.5c-1.3.03-2.6-.36-3.7-1.1v5.3a4.9 4.9 0 1 1-4.9-4.9c.26 0 .5.02.75.06v2.6a2.35 2.35 0 1 0 1.65 2.24V3.5H14Z"
        fill="currentColor"
      />
    ),
  },
  messenger: {
    tint: 'rgba(0,132,255,0.12)',
    color: '#0084FF',
    glyph: (
      <g>
        <path
          d="M12 3.4c-4.86 0-8.6 3.56-8.6 8.28 0 2.47 1.03 4.6 2.7 6.06.14.12.22.3.23.48l.05 1.53c.02.5.53.82.98.62l1.7-.75c.14-.06.3-.07.45-.03 1.03.28 2.14.36 3.29.24 4.28-.44 7.4-3.72 7.4-7.92 0-4.72-3.74-8.28-8.6-8.28Z"
          fill="currentColor"
        />
        <path
          d="M6.9 14.2l2.9-3.1 1.7 1.3 2-1.9 2.6 1.4-2.9 3.1-1.7-1.3-2 1.9-2.6-1.4Z"
          fill="#fff"
        />
      </g>
    ),
  },
  telegram: {
    tint: 'rgba(34,158,217,0.12)',
    color: '#1B92CE',
    glyph: (
      <path
        d="M20.3 4.5 3.9 10.9c-.9.35-.88 1.63.03 1.94l3.9 1.32 1.5 4.55c.22.66 1.06.85 1.55.35l2-2.03 3.6 2.66c.5.37 1.2.1 1.34-.5l3-13.4c.16-.72-.55-1.32-1.22-1.05ZM9.7 13.9l7-4.3-5.6 5.1c-.2.18-.32.43-.36.7l-.2 1.5-.84-3Z"
        fill="currentColor"
      />
    ),
  },
  webchat: {
    tint: 'var(--accent-soft)',
    color: 'var(--accent)',
    glyph: (
      <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        <path d="M4.5 7.2A2.7 2.7 0 0 1 7.2 4.5h9.6a2.7 2.7 0 0 1 2.7 2.7v6a2.7 2.7 0 0 1-2.7 2.7H9.4l-3.5 2.9c-.5.4-1.4.05-1.4-.6V7.2Z" />
        <path d="M8.5 10.2h7M8.5 12.9h4.5" />
      </g>
    ),
  },
};

export default function ChannelGlyph({
  type,
  size = 44,
}: {
  type: ChannelType;
  size?: number;
}) {
  const meta = G[type] ?? G.webchat;
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: meta.tint, color: meta.color }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {meta.glyph}
      </svg>
    </span>
  );
}
