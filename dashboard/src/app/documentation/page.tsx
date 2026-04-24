import { ArrowUpRight, BookOpen, MessageSquare, Rocket, Users } from 'lucide-react';

const docsSections = [
  {
    title: 'Start the stack',
    body: 'Copy the environment file, build the containers, and bring OpenSwarm up from the project root.',
    code: ['cp .env.example .env', 'make build', 'make up'],
    icon: Rocket,
  },
  {
    title: 'Open the dashboard',
    body: 'Visit the dashboard and begin chatting with Aria, the main agent, from the selected workspace.',
    code: ['http://localhost:8277'],
    icon: MessageSquare,
  },
  {
    title: 'Work with the team',
    body: 'You can keep the flow natural. Ask for status, mention a teammate by name, or let Aria run the full discussion.',
    code: ['Aria, what is the team doing?', 'Dex, take the API integration task.', '/create-project my-new-app'],
    icon: Users,
  },
];

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="glass rounded-[2.5rem] border-stone-200/80 p-8 bg-[var(--panel-strong)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] border border-stone-200 bg-white">
              <BookOpen className="h-6 w-6 text-[color:var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">OpenSwarm Documentation</h1>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                A quick guide for installing the stack, starting the dashboard, and chatting with the named agent team.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {docsSections.map((section) => (
            <article key={section.title} className="glass rounded-[2rem] border-stone-200/80 bg-[var(--panel-strong)] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white">
                <section.icon className="h-5 w-5 text-[color:var(--color-accent)]" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{section.body}</p>
              <div className="mt-4 space-y-2 rounded-2xl border border-stone-200 bg-white p-4 font-mono text-[12px] text-stone-700">
                {section.code.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="glass rounded-[2.5rem] border-stone-200/80 bg-[var(--panel-strong)] p-8">
          <h2 className="text-sm font-black uppercase tracking-[0.25em] text-stone-500">Agent Team</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ['Aria', 'Main Agent', 'Receives initiatives, answers updates, and routes the team.'],
              ['Dex', 'Coder', 'Builds features, fixes bugs, and works in the selected workspace.'],
              ['Mira', 'Tester', 'Validates flows, quality, and regressions.'],
              ['Nova', 'PM', 'Shapes scope, milestones, and product clarity.'],
              ['Sol', 'Tech Lead', 'Owns architecture and technical tradeoffs.'],
              ['Lumi', 'Designer', 'Improves UX, layout, and polish.'],
            ].map(([name, role, description]) => (
              <div key={name} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="text-sm font-black text-stone-900">{name}</div>
                <div className="text-[11px] uppercase tracking-widest text-stone-400">{role}</div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <a
          href="https://github.com/Not-Just-Web/openswarm"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-stone-700 transition-colors hover:text-stone-900"
        >
          View Repository <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}
