import { useEffect, useRef, useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { MenuTheme, TemplateProps } from './types';
import {
  accentOf,
  BackBar,
  Hamburger,
  ItemSheet,
  KuzaFooter,
  Preloader,
  SideDrawer,
  SoldOut,
  subGroups,
  TemplateRoot,
  useMenuPager,
} from './shared';

/* ------------------------------------------------------------------ *
 * SPACE — a cosmic bar / lounge menu that feels like drifting through
 * deep space. Void-black + nebula violet/magenta/cyan grounds, star-white
 * text and the venue accent as a neon glow. Multi-page:
 *   Preloader → cosmic COVER (menu name among the stars + "Enter")
 *   → HOME: an orbital constellation where each category is a glowing
 *     "world" you tap to travel to a sector
 *   → per-category SECTOR pages (glassmorphism rows, BackBar).
 * Signature motion is an rAF-driven <canvas> starfield (twinkle + drift +
 * parallax + occasional shooting star, capped at 120 stars) layered over a
 * CSS nebula. All motion disables under prefers-reduced-motion; every menu
 * text node is in the SSR DOM regardless (the cosmos is purely decorative).
 * Deliberately single-look (dark) — the theme's accent is the only variable.
 * ------------------------------------------------------------------ */

// Fixed deep-space palette (this template commits to one dark look).
const VOID = '#04030e';
const INK = '#0a0820';
const STAR = '#f6f7ff';
const HAZE = '#aab0e8'; // muted secondary text (indigo haze)
const GLASS = 'rgba(255,255,255,0.045)';
const GLASS_BORDER = 'rgba(180,190,255,0.14)';
// Nebula hues cycled across the category "worlds".
const NEBULA = ['#a78bfa', '#f0abfc', '#67e8f9', '#7dd3fc', '#c4b5fd', '#f9a8d4', '#818cf8', '#5eead4'];

interface Star {
  x: number;
  y: number;
  r: number;
  z: number; // depth 0..1 → parallax + drift speed
  tw: number; // twinkle phase
  sp: number; // twinkle speed
  c: string; // color
}

/**
 * The living cosmos: a CSS nebula layer + an rAF canvas of twinkling,
 * drifting stars with light scroll parallax and rare shooting stars.
 * Mounts once (outside the screen switch) so the sky never restarts.
 */
function CosmosBackground({ accent }: { accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nebulaRef = useRef<HTMLDivElement | null>(null);
  const parallax = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const STAR_COUNT = 120;
    const starHues = [STAR, STAR, STAR, '#c7d2fe', '#a5f3fc', accent, '#f5d0fe'];
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;
    // Shooting star (at most one at a time).
    let shot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    const makeStar = (): Star => {
      const z = Math.random() * 0.85 + 0.15;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: z * 1.5 + 0.3,
        z,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.9 + 0.25,
        c: starHues[(Math.random() * starHues.length) | 0],
      };
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: STAR_COUNT }, makeStar);
    };

    const drawStar = (s: Star, alpha: number, py: number) => {
      let y = s.y - py * s.z * 0.12;
      y = ((y % h) + h) % h;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.2) {
        // faint glow halo for the brighter stars
        ctx.globalAlpha = alpha * 0.25;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const py = parallax.current;
      for (const s of stars) {
        s.y += s.z * 0.14; // slow drift downward
        if (s.y > h) s.y -= h;
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 * s.sp + s.tw));
        drawStar(s, alpha, py);
      }

      // Occasionally launch a shooting star.
      if (!shot && Math.random() < 0.004) {
        const startX = Math.random() * w;
        shot = { x: startX, y: Math.random() * h * 0.4, vx: 5 + Math.random() * 4, vy: 2 + Math.random() * 2, life: 1 };
      }
      if (shot) {
        shot.x += shot.vx;
        shot.y += shot.vy;
        shot.life -= 0.012;
        const grad = ctx.createLinearGradient(shot.x, shot.y, shot.x - shot.vx * 9, shot.y - shot.vy * 9);
        grad.addColorStop(0, `rgba(255,255,255,${Math.max(0, shot.life)})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shot.x, shot.y);
        ctx.lineTo(shot.x - shot.vx * 9, shot.y - shot.vy * 9);
        ctx.stroke();
        if (shot.life <= 0 || shot.x > w + 40 || shot.y > h + 40) shot = null;
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) drawStar(s, 0.5 + s.z * 0.4, 0);
      ctx.globalAlpha = 1;
    };

    const onScroll = () => {
      parallax.current = window.scrollY;
      if (nebulaRef.current && !reduce) {
        nebulaRef.current.style.transform = `translate3d(0, ${window.scrollY * 0.12}px, 0)`;
      }
    };

    resize();
    if (reduce) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, [accent]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ backgroundColor: VOID }}>
      {/* CSS nebula clouds (always present — the reduced-motion static ground). */}
      <div
        ref={nebulaRef}
        className="absolute -inset-[20%]"
        style={{
          background: `
            radial-gradient(38% 30% at 22% 20%, ${accent}2e, transparent 70%),
            radial-gradient(42% 34% at 82% 26%, #7c3aed3d, transparent 70%),
            radial-gradient(46% 40% at 68% 82%, #db277730, transparent 72%),
            radial-gradient(40% 34% at 14% 78%, #0891b233, transparent 72%),
            radial-gradient(120% 120% at 50% 0%, ${INK}, ${VOID} 70%)`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Vignette to sink the edges into the void. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.65) 100%)' }}
      />
    </div>
  );
}

/** A small ringed planet motif (inline SVG) used on the cover. */
function RingedPlanet({ accent }: { accent: string }) {
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden="true" className="space-float">
      <defs>
        <radialGradient id="sp-globe" cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={accent} />
          <stop offset="100%" stopColor="#1e1b4b" />
        </radialGradient>
      </defs>
      <ellipse cx="46" cy="50" rx="40" ry="12" stroke={accent} strokeWidth="1.5" opacity="0.55" transform="rotate(-18 46 50)" />
      <circle cx="46" cy="46" r="22" fill="url(#sp-globe)" />
      <ellipse cx="46" cy="50" rx="40" ry="12" stroke="#ffffff" strokeWidth="1" opacity="0.28" transform="rotate(-18 46 50)" strokeDasharray="2 6" />
    </svg>
  );
}

/**
 * Orbital constellation navigation. Each category is a glowing "world"
 * absolutely positioned on concentric orbits around a pulsing core.
 * The orbit rings and satellites move; the tappable worlds stay put.
 */
function OrbitalNav({
  categories,
  onPick,
  menuInitial,
  accent,
}: {
  categories: { id: string; name: string }[];
  onPick: (id: string) => void;
  menuInitial: string;
  accent: string;
}) {
  const n = categories.length;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      {/* Faint rotating orbit rings. */}
      <svg viewBox="0 0 100 100" className="space-spin-slow absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="30" fill="none" stroke={HAZE} strokeOpacity="0.18" strokeWidth="0.4" strokeDasharray="1 3" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={HAZE} strokeOpacity="0.13" strokeWidth="0.4" strokeDasharray="1 4" />
      </svg>

      {/* Pulsing core. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div
          className="space-pulse flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black"
          style={{
            color: VOID,
            background: `radial-gradient(circle at 34% 30%, #fff, ${accent} 60%, #4c1d95)`,
            boxShadow: `0 0 30px ${accent}, 0 0 60px ${accent}66`,
          }}
        >
          {menuInitial}
        </div>
      </div>

      {/* Worlds. */}
      {categories.map((c, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = n <= 5 ? 38 : i % 2 === 0 ? 30 : 42;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        const hue = NEBULA[i % NEBULA.length];
        return (
          <div
            key={c.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%`, width: 62 }}
          >
            <button
              type="button"
              onClick={() => onPick(c.id)}
              aria-label={`Explore ${c.name}`}
              className="group relative mx-auto block h-[62px] w-[62px] rounded-full transition-transform duration-200 active:scale-95"
              style={{ filter: `drop-shadow(0 0 14px ${hue}aa)` }}
            >
              {/* orbiting satellite — motion without moving the tap target */}
              <span
                className="space-spin absolute -inset-2 rounded-full"
                style={{ animationDelay: `${i * -1.3}s` }}
              >
                <span
                  className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: STAR, boxShadow: `0 0 6px ${STAR}` }}
                />
              </span>
              <span
                className="space-float block h-full w-full rounded-full"
                style={{
                  animationDelay: `${i * -0.7}s`,
                  background: `radial-gradient(circle at 32% 28%, #ffffff, ${hue} 46%, #17123a 100%)`,
                  boxShadow: `inset -6px -8px 14px rgba(0,0,0,0.55), 0 0 18px ${hue}55`,
                }}
              />
            </button>
            <div
              className="mx-auto mt-2 max-w-[92px] text-center text-[11px] font-semibold uppercase leading-tight tracking-wide"
              style={{ color: STAR, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
            >
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SpaceTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const activeCategory =
    screen.name === 'category' ? categories.find((c) => c.id === screen.categoryId) || null : null;
  const menuInitial = (menuName.charAt(0) || '★').toUpperCase();

  // A dark theme surrogate so shared primitives (BackBar/ItemSheet/Drawer)
  // read as part of the cosmos rather than the app's default palette.
  const spaceTheme: MenuTheme = {
    ...theme,
    mode: 'dark',
    bg: VOID,
    surface: '#100d28',
    text: STAR,
    muted: HAZE,
    accent,
    border: GLASS_BORDER,
  };

  return (
    <TemplateRoot theme={spaceTheme}>
      <div ref={topRef} />
      <CosmosBackground accent={accent} />
      <Preloader theme={spaceTheme} accent={accent} venue={venue} />

      <style>{`
        @keyframes space-pulse { 0%,100%{ transform:scale(1); filter:brightness(1);} 50%{ transform:scale(1.06); filter:brightness(1.25);} }
        @keyframes space-float { 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-6px);} }
        @keyframes space-spin { to { transform:rotate(360deg);} }
        @keyframes space-glow { 0%,100%{ text-shadow:0 0 14px var(--sp-a), 0 0 34px var(--sp-a);} 50%{ text-shadow:0 0 22px var(--sp-a), 0 0 54px var(--sp-a);} }
        .space-pulse{ animation:space-pulse 4s ease-in-out infinite; }
        .space-float{ animation:space-float 6s ease-in-out infinite; }
        .space-spin{ animation:space-spin 9s linear infinite; }
        .space-spin-slow{ animation:space-spin 70s linear infinite; transform-origin:50% 50%; }
        .space-glow{ animation:space-glow 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){
          .space-pulse,.space-float,.space-spin,.space-spin-slow,.space-glow{ animation:none !important; }
        }
      `}</style>

      <div className="relative z-10">
        {/* ---------------------------------- COVER ---------------------------------- */}
        {screen.name === 'cover' && (
          <section
            key="cover"
            className="menu-fade relative flex min-h-[100svh] flex-col items-center justify-center px-6 text-center"
          >
            {venue.logoUrl && !logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={venue.logoUrl}
                alt={venue.name}
                onError={() => setLogoFailed(true)}
                className="mb-7 h-32 w-32 object-contain"
                style={{ filter: `drop-shadow(0 0 34px ${accent}aa)` }}
              />
            ) : (
              <div className="mb-4">
                <RingedPlanet accent={accent} />
              </div>
            )}

            <p
              className="text-[11px] font-semibold uppercase tracking-[0.6em]"
              style={{ color: accent, textShadow: `0 0 16px ${accent}aa` }}
            >
              A Cosmic Menu
            </p>

            <h1
              className="space-glow mt-5 text-4xl font-black uppercase leading-[1.05] tracking-[0.14em] sm:text-6xl"
              style={{ color: STAR, fontFamily: theme.headingFont, ['--sp-a' as string]: accent }}
            >
              {menuName}
            </h1>

            {venue.tagline && (
              <p className="mt-5 max-w-sm text-sm leading-relaxed tracking-wide" style={{ color: HAZE }}>
                {venue.tagline}
              </p>
            )}

            <button
              type="button"
              onClick={() => setScreen({ name: 'home' })}
              className="mt-11 inline-flex items-center gap-2 rounded-full px-9 py-3.5 text-sm font-bold uppercase tracking-[0.28em] transition-transform active:scale-95"
              style={{
                color: STAR,
                background: `linear-gradient(180deg, ${accent}33, ${accent}14)`,
                border: `1px solid ${accent}`,
                boxShadow: `0 0 24px ${accent}66, inset 0 0 22px ${accent}22`,
              }}
            >
              Enter
              <span aria-hidden>→</span>
            </button>

            <p className="mt-8 text-[10px] uppercase tracking-[0.4em]" style={{ color: `${HAZE}99` }}>
              Tap to launch
            </p>
          </section>
        )}

        {/* ----------------------------------- HOME ---------------------------------- */}
        {screen.name === 'home' && (
          <section key="home" className="menu-page relative min-h-[100svh]">
            <div
              className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3"
              style={{ backgroundColor: 'rgba(4,3,14,0.62)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${GLASS_BORDER}` }}
            >
              <button
                type="button"
                onClick={() => setScreen({ name: 'cover' })}
                aria-label="Back"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none transition-transform active:scale-90"
                style={{ color: accent, border: `1px solid ${accent}55` }}
              >
                ‹
              </button>
              <span
                className="flex-1 truncate text-center text-sm font-bold uppercase tracking-[0.3em]"
                style={{ color: STAR }}
              >
                {menuName}
              </span>
              <Hamburger color={accent} onClick={() => setDrawer(true)} className="shrink-0" />
            </div>

            <div className="mx-auto w-full max-w-2xl px-6 pt-10">
              <h2
                className="text-center text-xs font-semibold uppercase tracking-[0.45em]"
                style={{ color: accent, textShadow: `0 0 14px ${accent}88` }}
              >
                Choose your world
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-center text-[13px]" style={{ color: HAZE }}>
                Each world holds a constellation of taste. Tap one to travel in.
              </p>

              <div className="mt-8">
                {categories.length > 0 ? (
                  <OrbitalNav
                    categories={categories}
                    onPick={(id) => setScreen({ name: 'category', categoryId: id })}
                    menuInitial={menuInitial}
                    accent={accent}
                  />
                ) : (
                  <p className="py-16 text-center text-sm" style={{ color: HAZE }}>
                    The galaxy is still forming. Check back soon.
                  </p>
                )}
              </div>

              <KuzaFooter theme={spaceTheme} />
            </div>
          </section>
        )}

        {/* --------------------------------- SECTOR ---------------------------------- */}
        {screen.name === 'category' && activeCategory && (
          <section key={activeCategory.id} className="menu-page-slide relative min-h-[100svh]">
            <BackBar
              title={activeCategory.name}
              theme={spaceTheme}
              accent={accent}
              onBack={() => setScreen({ name: 'home' })}
            />

            <div className="mx-auto w-full max-w-2xl px-6 pt-8">
              <div className="mb-6 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.5em]" style={{ color: accent }}>
                  Sector
                </p>
                <h2
                  className="mt-2 text-3xl font-black uppercase tracking-[0.1em]"
                  style={{ color: STAR, fontFamily: theme.headingFont, textShadow: `0 0 24px ${accent}66` }}
                >
                  {activeCategory.name}
                </h2>
                {activeCategory.description && (
                  <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed" style={{ color: HAZE }}>
                    {activeCategory.description}
                  </p>
                )}
              </div>

              <ul className="menu-stagger space-y-3">
                {subGroups(activeCategory.items).map((group) => (
                  <li key={group.name ?? '__nosub'} className="space-y-3">
                    {group.name && (
                      <div className="flex items-center gap-3 pt-3">
                        <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.35em]" style={{ color: accent }}>
                          {group.name}
                        </span>
                        <span className="h-px flex-1" style={{ background: `linear-gradient(to right, ${accent}66, transparent)` }} />
                      </div>
                    )}
                    <ul className="space-y-3">
                      {group.items.map((item, idx) => {
                        const hue = NEBULA[idx % NEBULA.length];
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(item)}
                              className="flex w-full items-start gap-4 px-4 py-4 text-left transition-transform active:scale-[0.99]"
                              style={{
                                backgroundColor: GLASS,
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: `1px solid ${GLASS_BORDER}`,
                                borderRadius: '16px',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                                opacity: item.isAvailable ? 1 : 0.5,
                              }}
                            >
                              {/* little world bullet */}
                              <span
                                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                                style={{
                                  background: `radial-gradient(circle at 32% 30%, #fff, ${hue} 55%, #17123a)`,
                                  boxShadow: `0 0 10px ${hue}aa`,
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="text-[15px] font-semibold tracking-wide" style={{ color: STAR }}>
                                    {item.name}
                                    {!item.isAvailable && <SoldOut theme={spaceTheme} />}
                                  </span>
                                  {venue.showPrices && (
                                    <span
                                      className="whitespace-nowrap text-[15px] font-bold tracking-wide"
                                      style={{ color: accent, textShadow: `0 0 12px ${accent}88` }}
                                    >
                                      {formatMenuPrice(item.price, venue.currency)}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: HAZE }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>

              <KuzaFooter theme={spaceTheme} />
            </div>
          </section>
        )}
      </div>

      <SideDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        venue={venue}
        theme={spaceTheme}
        accent={accent}
        links={categories.map((c) => ({
          id: c.id,
          label: c.name,
          onClick: () => setScreen({ name: 'category', categoryId: c.id }),
        }))}
      />

      <ItemSheet item={selected} venue={venue} theme={spaceTheme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
