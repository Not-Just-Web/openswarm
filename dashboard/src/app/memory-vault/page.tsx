import { Brain, FileText, LibraryBig, Map } from 'lucide-react';

export default function MemoryVaultPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="glass rounded-[2.5rem] border-stone-200/80 p-8 bg-[var(--panel-strong)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] border border-stone-200 bg-white">
              <Brain className="h-6 w-6 text-[color:var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Memory Vault</h1>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                OpenSwarm stores long-term context in an Obsidian-style vault so the team can retain architecture, decisions, and project history.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            ['raw/', 'Immutable source material and captured notes.', FileText],
            ['wiki/', 'Agent-maintained architecture and project knowledge.', LibraryBig],
            ['index.md + log.md', 'Entry map and chronological memory history.', Map],
          ].map(([title, body, Icon]) => (
            <article key={title} className="glass rounded-[2rem] border-stone-200/80 bg-[var(--panel-strong)] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white">
                <Icon className="h-5 w-5 text-[color:var(--color-accent)]" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </article>
          ))}
        </section>

        <section className="glass rounded-[2.5rem] border-stone-200/80 bg-[var(--panel-strong)] p-8">
          <h2 className="text-sm font-black uppercase tracking-[0.25em] text-stone-500">How the team uses memory</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-stone-600">
            <p>Aria can use the vault to keep a stable view of initiatives, architectural decisions, and ongoing work across sessions.</p>
            <p>Specialists can write durable notes into the vault so future tasks start with more context and less re-explaining.</p>
            <p>If you are following the Obsidian memory pattern, keep durable project knowledge in the vault and let transient execution logs stay in runtime files.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
