"use client";

import { AccountPanel } from "./AccountPanel";
import { CreateEscrowModal } from "./CreateEscrowModal";

function Mark({ className = "" }: { className?: string }) {
  // Two overlapping circles: a client and a freelancer meeting at the escrow.
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8" />
      <circle cx="22" cy="10" r="8" fill="currentColor" />
    </svg>
  );
}

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <a href="#top" className="flex items-center gap-2.5" aria-label="MilestoneEscrow home">
          <Mark className="h-5 w-8" />
          <span className="text-lg font-bold tracking-tight">MilestoneEscrow</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Sections">
          <a href="#escrows" className="text-muted-foreground transition-colors hover:text-foreground">
            Escrows
          </a>
          <a href="#how" className="text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#rules" className="text-muted-foreground transition-colors hover:text-foreground">
            What code decides
          </a>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <CreateEscrowModal />
          <AccountPanel />
        </div>
      </div>
    </header>
  );
}
