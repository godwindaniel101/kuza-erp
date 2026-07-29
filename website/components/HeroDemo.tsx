/*
 * The site's one authored motion moment: a WhatsApp DM becomes a structured
 * order — stock, ledger and books — in one choreographed sequence.
 * Demo data throughout; labeled on the frame.
 */

const d = (s: number) => ({ animationDelay: `${s}s` });

export default function HeroDemo() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-[85%]">
      <div className="rounded-3xl border border-line bg-white p-4 shadow-lift sm:p-5">
        {/* Chat panel */}
        <div className="rounded-2xl bg-paper p-3.5 sm:p-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf font-display text-sm font-bold text-white">
              A
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">
                Amara · Kuza Agent
              </p>
              <p className="text-xs text-muted">WhatsApp · Mama Nkechi Stores</p>
            </div>
            <span className="ml-auto rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-leaf">
              Online
            </span>
          </div>

          <div className="demo-seq mt-3 flex flex-col gap-2.5 text-[0.9rem] leading-snug">
            <p
              className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-card"
              style={d(0.3)}
            >
              Good morning, how much for 10 crates of malt?
            </p>
            <p
              className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-leaf px-3.5 py-2.5 text-white"
              style={d(1.1)}
            >
              Good morning! 10 crates is ₦85,000 — we have them in stock at
              Surulere. Should I reserve them for you?
            </p>
            <p
              className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-card"
              style={d(1.9)}
            >
              Yes. Send account details
            </p>
            <p
              className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-leaf px-3.5 py-2.5 text-white"
              style={d(2.6)}
            >
              Transfer ₦85,000 to your order account 9012 3456 78 (Wema Bank).
              I&apos;ll confirm the moment it lands.
            </p>
            <p
              className="demo-tick self-center rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-forest shadow-card"
              style={d(3.4)}
            >
              Order sent to your approval queue → approved by you
            </p>
            <p
              className="demo-tick self-center rounded-full bg-forest px-3.5 py-1.5 text-xs font-semibold text-amber"
              style={d(4.2)}
            >
              ✓ Transfer received · matched to order · verified
            </p>
          </div>
        </div>

        {/* ERP panel — what the sale did inside Kuza */}
        <div className="mt-4 rounded-2xl border border-line p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Inside your Kuza — order KD-1042
            </p>
            <span
              className="demo-tick rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-leaf"
              style={d(4.9)}
            >
              Paid
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-[0.85rem]">
            <li className="demo-row flex items-center justify-between gap-3" style={d(5.1)}>
              <span className="text-muted">Stock · Surulere branch</span>
              <span className="font-semibold">Malt 33cl crate −10 · batch B-218</span>
            </li>
            <li className="demo-row flex items-center justify-between gap-3" style={d(5.4)}>
              <span className="text-muted">Stock ledger</span>
              <span className="font-semibold">SALE rows appended · immutable</span>
            </li>
            <li className="demo-row flex items-center justify-between gap-3" style={d(5.7)}>
              <span className="text-muted">Books</span>
              <span className="font-semibold">
                Dr Cash ₦85,000 · Cr Revenue ₦85,000
              </span>
            </li>
            <li className="demo-row flex items-center justify-between gap-3" style={d(6.0)}>
              <span className="text-muted">Dashboard</span>
              <span className="font-semibold text-leaf">Updated — nothing to reconcile</span>
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        Demo conversation with illustrative figures — this is the real order
        path Kuza agents use, and money moves only after your approval.
      </p>
    </div>
  );
}
