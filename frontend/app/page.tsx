"use client";

import { Navbar } from "@/components/Navbar";
import { NodeDiagram } from "@/components/NodeDiagram";
import { Ledger } from "@/components/Ledger";
import { EscrowList } from "@/components/EscrowList";
import { CreateEscrowModal } from "@/components/CreateEscrowModal";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Lock the funds",
    body: "The client describes the finished work in plain English, names the freelancer and attaches GEN. The contract holds it. Nobody can touch it yet.",
  },
  {
    title: "Show the work",
    body: "The freelancer links a public page that shows the finished work. The contract reads that page live from the web.",
  },
  {
    title: "Validators check, code pays",
    body: "Validators answer three yes/no questions about the page. All yes: the GEN goes to the freelancer. Rejected: the client can take it back at once, and after three rejections it returns automatically.",
  },
];

const CODE_DECIDES = [
  "Who the client and the freelancer are",
  "How much is locked, and how much leaves",
  "Who may submit evidence or cancel",
  "When the client may refund, and the three-attempt limit",
  "Whether money is released or refunded",
];

const VALIDATORS_ANSWER = [
  "Does the page show a real piece of finished work?",
  "Does that work meet every point in the requirements?",
  "Is the page about this specific work, and not a placeholder?",
];

const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { label: "Escrows", href: "#escrows" },
      { label: "How it works", href: "#how" },
      { label: "What code decides", href: "#rules" },
    ],
  },
  {
    heading: "Network",
    links: [
      { label: "Studio Next", href: "https://studio-next.genlayer.com" },
      { label: "Explorer", href: "https://explorer-studio-dev.genlayer.com/" },
      { label: "Chain ID 61997", href: "https://docs.genlayer.com/developers/consensus-v06-migration" },
    ],
  },
  {
    heading: "Build",
    links: [
      { label: "GenLayer docs", href: "https://docs.genlayer.com" },
      { label: "genlayer.com", href: "https://genlayer.com" },
    ],
  },
];

export default function HomePage() {
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow pt-16">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 text-center md:px-6 md:pt-24">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.02] tracking-[-0.04em] md:text-7xl">
            Pay when the work is done.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Lock GEN for a milestone. GenLayer validators read the freelancer&apos;s evidence, then the contract
            pays out or refunds.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <CreateEscrowModal label="Lock funds" size="lg" />
            <Button asChild variant="secondary" size="lg">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <NodeDiagram />
          </div>
        </section>

        <Ledger />

        {/* Escrows */}
        <section id="escrows" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mb-8 max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Escrows</h2>
            <p className="mt-3 text-muted-foreground">
              Every milestone on this contract. Freelancers submit evidence here. Clients can cancel before evidence is
              decided, and refund after a rejection.
            </p>
          </div>
          <EscrowList />
        </section>

        {/* How it works: a real sequence, so the steps are numbered */}
        <section id="how" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
            <h2 className="max-w-xl text-3xl font-bold tracking-tight md:text-4xl">How a milestone gets paid</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="border-t border-foreground pt-5">
                  <div className="text-5xl font-light tracking-tight">{i + 1}</div>
                  <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who decides what */}
        <section id="rules" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              Code moves the money. Validators only read the evidence.
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
              <div className="bg-background p-6 md:p-8">
                <h3 className="text-xl font-bold">The contract decides</h3>
                <ul className="mt-5 space-y-3">
                  {CODE_DECIDES.map((item) => (
                    <li key={item} className="border-t border-border pt-3 text-muted-foreground first:border-t-0 first:pt-0">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-foreground p-6 text-background md:p-8">
                <h3 className="text-xl font-bold">Validators answer three questions</h3>
                <ul className="mt-5 space-y-3">
                  {VALIDATORS_ANSWER.map((item) => (
                    <li key={item} className="border-t border-background/25 pt-3 first:border-t-0 first:pt-0">
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-background/70">
                  An approval must also quote text that really appears on the page. Unclear answers never pay out.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[2fr_1fr_1fr_1fr] md:px-6">
          <div>
            <div className="text-lg font-bold tracking-tight">MilestoneEscrow</div>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Milestone payments checked by GenLayer validators. Running on Studio Next.
            </p>
          </div>
          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <div className="text-sm font-bold">{group.heading}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          Built on GenLayer. This is a hackathon demo, not a replacement for a trusted escrow service.
        </div>
      </footer>
    </div>
  );
}
