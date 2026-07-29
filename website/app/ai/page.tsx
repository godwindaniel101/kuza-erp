import type { Metadata } from "next";
import { REGISTER_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kuza AI — Copilot & Agents",
  description:
    "Kuza Copilot answers questions from your own business data. Kuza Agents sell to your customers on WhatsApp, Instagram and more — with humans approving every money move.",
};

const channels = [
  "WhatsApp",
  "Instagram",
  "Messenger",
  "Telegram",
  "Web chat",
];

const guardrails = [
  {
    title: "Agents read; they don't touch",
    body: "The agent runtime is read-only against your operation. It converses from your catalog and knowledge — it cannot silently change your data.",
  },
  {
    title: "Money moves need a human",
    body: "When a conversation reaches a payment or fulfilment decision, it lands in your approval queue. You (or your manager) clear it — every time.",
  },
  {
    title: "Every turn on the record",
    body: "A full action log covers every message and every tool call an agent makes. Nothing happens off the books.",
  },
  {
    title: "Take over any conversation",
    body: "Step into a chat, reply as yourself, hand it back when you're done. The agent waits.",
  },
  {
    title: "Hardened against manipulation",
    body: "The conversation runtime is built to resist prompt-injection — customers talk to your storefront, not your database.",
  },
  {
    title: "Rules-based clearing, next",
    body: "Set conditions — amount, payer name, date — and matching payments will clear automatically, escalating only exceptions.",
    flag: "In development — today, all money-path actions go to your approval queue.",
  },
];

export default function AiPage() {
  return (
    <>
      {/* HERO */}
      <section className="bg-forest-deep text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              One AI answers to you. The other answers your customers.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Kuza Copilot turns your own data into answers you can act on.
              Kuza Agents work your storefront on WhatsApp, Instagram and
              beyond — turning conversations into structured orders your ERP
              already understands.
            </p>
            <a
              href={REGISTER_URL}
              className="mt-8 inline-block rounded-full bg-amber px-7 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-white"
            >
              Start free — agents included
            </a>
          </div>

          {/* Approval queue mock */}
          <div>
            <div className="rounded-3xl bg-white p-5 text-ink shadow-lift">
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-bold">
                  Approval queue
                </p>
                <span className="rounded-full bg-amber/20 px-2.5 py-1 text-xs font-semibold text-amber-deep">
                  2 awaiting you
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                <li className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      Confirm transfer of ₦85,000 — order KD-1042
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Drafted by Amara · WhatsApp · Surulere branch
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-leaf px-4 py-1.5 text-xs font-semibold text-white">
                      Approve
                    </span>
                    <span className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-muted">
                      Reject
                    </span>
                  </div>
                </li>
                <li className="rounded-2xl border border-line p-4">
                  <p className="text-sm font-semibold">
                    Release order KD-1043 for delivery
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Drafted by Amara · Instagram · Yaba branch
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-leaf px-4 py-1.5 text-xs font-semibold text-white">
                      Approve
                    </span>
                    <span className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-muted">
                      Reject
                    </span>
                  </div>
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted">
                Illustrative data — agents escalate every money move to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COPILOT */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              Kuza Copilot — answers from your own numbers.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Ask in plain language, across your whole business or one branch:
              What sold best last month? Which branch is bleeding stock? Can I
              afford another employee?
            </p>
            <ul className="mt-6 space-y-4 text-[1.02rem] leading-relaxed">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                <span>
                  <strong>The numbers are computed in code.</strong> The AI only
                  explains them — it can&apos;t invent a figure, so you can act
                  on what it says.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                <span>
                  <strong>It knows its limits.</strong> Ask about payroll
                  without the People module enabled and it tells you so —
                  instead of guessing.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                <span>
                  <strong>Branch-scoped, like everything else.</strong> Staff
                  get answers only for the branches they can see.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="text-sm font-semibold">Ask Kuza</p>
            <div className="mt-4 space-y-3 text-[0.9rem] leading-relaxed">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-paper px-4 py-3">
                Which items should I reorder before Friday?
              </p>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line px-4 py-3">
                <p>
                  Three items at Surulere will run out within 4 days at current
                  pace: <strong>Peak milk 400g</strong> (2 days),{" "}
                  <strong>semovita 1kg</strong> (3 days),{" "}
                  <strong>malt 33cl crates</strong> (4 days). Two suppliers on
                  your network list all three — the cheaper combination is
                  ₦412,000.
                </p>
              </div>
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-paper px-4 py-3">
                Draft the purchase order.
              </p>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line px-4 py-3">
                <p>
                  Drafted PO-2026-0114 — it&apos;s waiting for your approval.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">Illustrative conversation</p>
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              Kuza Agents — your storefront, staffed around the clock.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Give an agent a name, a tone of voice, languages, working hours
              and guardrails. Train it on your FAQs and catalog. Connect it
              where your customers already are:
            </p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-3">
            {channels.map((c) => (
              <li
                key={c}
                className="rounded-full border border-line bg-white px-5 py-2.5 font-semibold text-forest"
              >
                {c}
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            When a conversation turns into buying — “how much”, “I&apos;ll take
            it”, “where do I pay” — the agent drafts a structured order into
            the same pending-sale path your POS uses, and payment is verified
            against your rules before anything ships.
          </p>

          <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {guardrails.map((g) => (
              <div key={g.title}>
                <h3 className="font-display text-lg font-semibold text-forest">
                  {g.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted">{g.body}</p>
                {"flag" in g && g.flag && (
                  <p className="mt-2 w-fit rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber-deep">
                    {g.flag}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MCP */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-24">
        <div className="grid items-center gap-10 rounded-3xl border border-line p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-3xl font-bold text-forest">
              Plug Kuza into Claude.
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
              Kuza ships an MCP server, so you can connect your business to
              Claude and work with your live operation — ask questions, pull
              reports, draft actions — from the AI assistant you already use.
            </p>
          </div>
          <div className="rounded-2xl bg-forest-deep p-6 font-mono text-sm leading-relaxed text-white/90">
            <p className="text-amber">$ claude mcp add kuza</p>
            <p className="mt-2 text-white/60"># connected to your tenant</p>
            <p className="mt-2">
              &gt; “What did Surulere sell today?”
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <div className="rounded-3xl bg-paper px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-forest sm:text-4xl">
            Hire your first agent today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            AI is included with Kuza — not an add-on. Start the trial and
            connect WhatsApp in minutes.
          </p>
          <a
            href={REGISTER_URL}
            className="mt-8 inline-block rounded-full bg-leaf px-8 py-4 text-base font-semibold text-white shadow-lift transition-colors hover:bg-leaf-dark"
          >
            Start your free trial
          </a>
        </div>
      </section>
    </>
  );
}
