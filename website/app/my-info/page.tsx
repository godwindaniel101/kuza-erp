import { headers } from "next/headers";
import type { Metadata } from "next";

/**
 * /my-info — a diagnostic page that shows exactly what the edge/proxy forwards
 * about the incoming request. Used to confirm (a) whether Cloudflare is in front
 * and sending client geo (cf-* headers), and (b) that language is chosen from the
 * BROWSER's Accept-Language, not the visitor's location.
 *
 * Server-rendered per request (force-dynamic) so it reads live request headers.
 * Not indexed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My info — Kuza",
  robots: { index: false, follow: false },
};

export default async function MyInfoPage() {
  const h = await headers();

  const get = (k: string) => h.get(k);
  const all: [string, string][] = [];
  h.forEach((v, k) => all.push([k, v]));
  all.sort((a, b) => a[0].localeCompare(b[0]));

  const ip =
    get("cf-connecting-ip") ||
    get("x-forwarded-for")?.split(",")[0]?.trim() ||
    get("x-real-ip") ||
    "—";
  const country = get("cf-ipcountry") || "—";
  const city = get("cf-ipcity") || "—";
  const region = get("cf-region") || get("cf-region-code") || "—";
  const timezone = get("cf-timezone") || "—";
  const language = get("accept-language") || "—";
  const userAgent = get("user-agent") || "—";
  const cfRay = get("cf-ray");

  const throughCloudflare = !!(cfRay || get("cf-connecting-ip") || get("cf-ipcountry"));
  const hasGeo = country !== "—";

  const facts = [
    { label: "IP address", value: ip, hint: "cf-connecting-ip / x-forwarded-for" },
    { label: "Country", value: country, hint: "cf-ipcountry" },
    { label: "City", value: city, hint: "cf-ipcity (Cloudflare paid feature)" },
    { label: "Region", value: region, hint: "cf-region" },
    { label: "Timezone", value: timezone, hint: "cf-timezone" },
    { label: "Browser language", value: language, hint: "accept-language" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-5 py-14 md:px-8">
      <h1 className="font-display text-3xl font-extrabold text-forest">Your request info</h1>
      <p className="mt-2 text-muted">
        What the edge forwarded about this request. Live, server-rendered per visit.
      </p>

      {/* Verdicts */}
      <div className="mt-8 space-y-3">
        <Verdict
          ok={throughCloudflare}
          okText={`Coming through Cloudflare — it is forwarding client info${cfRay ? ` (cf-ray: ${cfRay})` : ""}.`}
          noText="No Cloudflare headers seen — either Cloudflare isn’t in front of this host, or its cf-* headers aren’t reaching the app."
        />
        <Verdict
          ok={hasGeo}
          okText={`Cloudflare is sending geo — country = ${country}.`}
          noText="No country/geo header (cf-ipcountry) — geo is not being forwarded, so location-based logic has nothing to read."
        />
      </div>

      {/* Language note */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm font-semibold text-forest">Language ≠ location</p>
        <p className="mt-1 text-sm text-muted">
          The site picks its language from your <strong>browser</strong> (<code>accept-language: {language}</code>),
          not from where you are. It does <strong>not</strong> change with your location. This is consistent across
          the marketing site, the app (user-portal), and the backend — none of them read geo for language.
          {hasGeo
            ? " (The country header IS available above, so location-based language could be added if you want it.)"
            : ""}
        </p>
      </div>

      {/* Key facts */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{f.label}</p>
            <p className="mt-1 break-words font-mono text-sm text-forest">{f.value}</p>
            <p className="mt-1 text-[11px] text-muted">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">User agent</p>
        <p className="mt-1 break-words font-mono text-xs text-forest">{userAgent}</p>
      </div>

      {/* Full header dump */}
      <h2 className="mt-10 font-display text-xl font-bold text-forest">All request headers</h2>
      <p className="mt-1 text-sm text-muted">Everything the edge/proxy attached to this request.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-semibold">Header</th>
              <th className="px-4 py-2.5 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {all.map(([k, v]) => (
              <tr key={k} className="border-b border-line/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 font-semibold text-forest">{k}</td>
                <td className="break-all px-4 py-2 text-ink">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Verdict({ ok, okText, noText }: { ok: boolean; okText: string; noText: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        ok ? "border-leaf/30 bg-mint/40" : "border-amber/40 bg-amber/10"
      }`}
    >
      <span className={`mt-0.5 text-lg ${ok ? "text-leaf" : "text-amber"}`}>{ok ? "✓" : "!"}</span>
      <p className="text-sm text-forest">{ok ? okText : noText}</p>
    </div>
  );
}
