"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarCheck,
  CircleDollarSign,
  Cloud,
  Code2,
  Cpu,
  DatabaseZap,
  Gem,
  Goal,
  HeartHandshake,
  KeyRound,
  Landmark,
  Layers3,
  Lightbulb,
  LockKeyhole,
  Network,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  SquareStack,
  type LucideIcon
} from "lucide-react";
import {
  askAssistant,
  clearSession,
  createCredential,
  createDiary,
  createNote,
  createProject,
  createTodo,
  getStoredSession,
  login,
  register,
  type AuthSession,
  type AuditEvent,
  type Credential,
  type DiaryEntry,
  type KnowledgeItem,
  type Project,
  type Todo
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CommandCenterData = {
  projects: Project[];
  notes: KnowledgeItem[];
  diary: DiaryEntry[];
  todos: Todo[];
  credentials: Credential[];
  audit: AuditEvent[];
};

type Props = {
  initialData: CommandCenterData;
  live: boolean;
};

const zones = [
  {
    label: "Projects",
    signature: "Launch Deck",
    font: "font-sans",
    icon: Rocket,
    tone: "from-cyan-300 to-blue-500",
    character: "orbital project ports, repo trails, deployment maps"
  },
  {
    label: "Vault",
    signature: "Black Key Cabinet",
    font: "font-mono",
    icon: LockKeyhole,
    tone: "from-violet-300 to-fuchsia-500",
    character: "sealed keys, quiet alarms, deliberate reveal rituals"
  },
  {
    label: "Diary",
    signature: "Memory Garden",
    font: "font-display italic",
    icon: BrainCircuit,
    tone: "from-rose-300 to-orange-500",
    character: "daily reflections, emotional weather, private timelines"
  },
  {
    label: "Ideas",
    signature: "Spark Foundry",
    font: "font-sans",
    icon: Lightbulb,
    tone: "from-amber-200 to-yellow-500",
    character: "raw sparks, playgrounds, research loops, invention boards"
  },
  {
    label: "Business",
    signature: "Empire Ledger",
    font: "font-display",
    icon: CircleDollarSign,
    tone: "from-emerald-300 to-teal-500",
    character: "cashflow, offers, customers, experiments, decisions"
  },
  {
    label: "Life",
    signature: "North Star",
    font: "font-display",
    icon: Goal,
    tone: "from-indigo-300 to-violet-500",
    character: "family plans, passions, health, dreams, identity"
  }
];

const platforms = [
  { name: "Supabase", mark: "S", icon: DatabaseZap, tone: "text-emerald-300" },
  { name: "GitHub", mark: "GH", icon: Code2, tone: "text-white" },
  { name: "Azure", mark: "Az", icon: Cloud, tone: "text-cyan-300" },
  { name: "Ollama", mark: "Ol", icon: Cpu, tone: "text-violet-300" },
  { name: "Cursor", mark: "Cu", icon: SquareStack, tone: "text-amber-200" },
  { name: "Hostinger", mark: "H", icon: Network, tone: "text-rose-200" }
];

export function CommandCenter({ initialData, live }: Props) {
  const [data, setData] = useState(initialData);
  const [assistantResponse, setAssistantResponse] = useState("Ask me anything about your projects, vault, diary, goals, todos, or next moves.");
  const [prompt, setPrompt] = useState("What should I focus on next across my projects and life OS?");
  const [activeComposer, setActiveComposer] = useState<"project" | "note" | "todo" | "diary" | "credential">("note");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authMessage, setAuthMessage] = useState("Sign in to write into your private workspace.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  const stats = useMemo(() => [
    { label: "Projects", value: data.projects.length, icon: Network },
    { label: "Knowledge", value: data.notes.length + data.diary.length, icon: BrainCircuit },
    { label: "Secrets", value: data.credentials.length, icon: KeyRound },
    { label: "Open Tasks", value: data.todos.filter((todo) => todo.status !== "done").length, icon: CalendarCheck }
  ], [data]);

  function refreshCreated(kind: keyof CommandCenterData, item: CommandCenterData[keyof CommandCenterData][number]) {
    setData((current) => ({
      ...current,
      [kind]: [item, ...(current[kind] as typeof item[])]
    }));
  }

  async function submitQuickCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const content = String(form.get("content") ?? "");
    const secret = String(form.get("secret") ?? "");
    event.currentTarget.reset();

    startTransition(async () => {
      try {
        if (activeComposer === "project") {
          const created = await createProject({ name: title, description: content, platform: "manual" });
          refreshCreated("projects", { id: created.id, name: title, description: content, platform: "manual", status: "active" });
        }
        if (activeComposer === "note") {
          const created = await createNote({ title, content, kind: "idea" });
          refreshCreated("notes", { id: created.id, title, content, kind: "idea" });
        }
        if (activeComposer === "todo") {
          const created = await createTodo({ title, detail: content, priority: "high" });
          refreshCreated("todos", { id: created.id, title, detail: content, priority: "high", status: "pending" });
        }
        if (activeComposer === "diary") {
          const created = await createDiary({ title, content, mood: "recorded" });
          refreshCreated("diary", { id: created.id, title, content, mood: "recorded" });
        }
        if (activeComposer === "credential") {
          const created = await createCredential({ label: title, kind: "secret", secret: secret || content });
          refreshCreated("credentials", { id: created.id, label: title, kind: "secret", secret_preview: "********" });
        }
      } catch {
        const fallbackId = `local-${Date.now()}`;
        if (activeComposer === "project") refreshCreated("projects", { id: fallbackId, name: title, description: content, platform: "local", status: "draft" });
        if (activeComposer === "note") refreshCreated("notes", { id: fallbackId, title, content, kind: "idea" });
        if (activeComposer === "todo") refreshCreated("todos", { id: fallbackId, title, detail: content, priority: "high", status: "pending" });
        if (activeComposer === "diary") refreshCreated("diary", { id: fallbackId, title, content, mood: "offline" });
        if (activeComposer === "credential") refreshCreated("credentials", { id: fallbackId, label: title, kind: "secret", secret_preview: "local-only" });
      }
    });
  }

  async function submitAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssistantResponse("Thinking across your project graph, diary, todos, and knowledge base...");
    startTransition(async () => {
      try {
        const response = await askAssistant({ prompt, policy: "coding" });
        setAssistantResponse(`${response.output}\n\nProvider: ${response.provider} / ${response.model}`);
      } catch {
        setAssistantResponse("The API or LLM runtime is not reachable yet. Once Azure Ollama and the backend are online, this panel will answer with your live context.");
      }
    });
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const display_name = String(form.get("display_name") ?? "");

    setAuthMessage("Opening private session...");
    startTransition(async () => {
      try {
        const nextSession = authMode === "register"
          ? await register({ email, password, display_name: display_name || undefined })
          : await login({ email, password });
        setSession(nextSession);
        setAuthMessage(`Signed in as ${nextSession.user.email}`);
      } catch (error) {
        setAuthMessage(error instanceof Error ? error.message : "Authentication failed");
      }
    });
  }

  function signOut() {
    clearSession();
    setSession(null);
    setAuthMessage("Signed out. Preview mode is still available.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="grain" />
      <OrbitalBackdrop />

      <section className="relative z-10 mx-auto flex max-w-[96rem] flex-col gap-6">
        <BrandHeader live={live} />
        <SessionConsole
          mode={authMode}
          message={authMessage}
          pending={isPending}
          session={session}
          onModeChange={setAuthMode}
          onSubmit={submitAuth}
          onSignOut={signOut}
        />
        <Hero />
        <PlatformConstellation />

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="glass-panel animate-rise rounded-3xl p-5"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <stat.icon className="mb-5 h-5 w-5 text-cyan-200" />
              <div className="text-4xl font-semibold tracking-tight">{stat.value}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.28em] text-white/35">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-panel rounded-[2.5rem] p-5 sm:p-7 lg:p-9">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/50">Desktop Environments</p>
                <h2 className="mt-2 font-display text-5xl text-white md:text-6xl">Six kingdoms of m.OS</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/60">
                <Activity className="h-4 w-4 text-emerald-300" />
                {live ? "Live backend connected" : "Demo mode until API is running"}
              </div>
            </div>

            <DesktopDomainMap />
          </section>

          <AssistantPanel
            prompt={prompt}
            response={assistantResponse}
            pending={isPending}
            onPromptChange={setPrompt}
            onSubmit={submitAssistant}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Composer
            active={activeComposer}
            pending={isPending}
            onActiveChange={setActiveComposer}
            onSubmit={submitQuickCapture}
          />
          <IntelligenceGrid data={data} />
        </div>
      </section>
    </main>
  );
}

function BrandHeader({ live }: { live: boolean }) {
  return (
    <header className="glass-panel flex flex-col gap-5 rounded-[2rem] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <LogoMark />
        <div>
          <div className="flex items-end gap-3">
            <h1 className="font-display text-4xl leading-none tracking-tight text-white sm:text-5xl">
              m<span className="text-cyan-200">.</span>OS
            </h1>
            <span className="mb-1 hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/45 sm:inline-flex">
              Midhun&apos;s Operating System
            </span>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.32em] text-white/35">
            personal kernel for projects, secrets, memory, and empire building
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {platforms.map((platform) => (
          <div key={platform.name} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/52">
            <span className={cn("grid h-6 w-6 place-items-center rounded-full bg-white/[0.07] text-[10px] font-bold", platform.tone)}>
              {platform.mark}
            </span>
            <platform.icon className={cn("h-3.5 w-3.5", platform.tone)} />
            <span>{platform.name}</span>
          </div>
        ))}
        <div className="ml-0 flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-xs text-emerald-100/70 lg:ml-2">
          <Activity className="h-3.5 w-3.5" />
          {live ? "online" : "preview"}
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] border border-white/15 bg-white/[0.07] shadow-glow">
      <div className="absolute inset-2 rounded-full border border-cyan-100/20" />
      <div className="absolute h-2 w-2 translate-x-6 -translate-y-5 rounded-full bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
      <div className="font-display text-3xl font-bold tracking-tighter text-white">m</div>
      <div className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-violet-300" />
    </div>
  );
}

function SessionConsole(props: {
  mode: "login" | "register";
  message: string;
  pending: boolean;
  session: AuthSession | null;
  onModeChange: (mode: "login" | "register") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
}) {
  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">Private Session</p>
          <h2 className="mt-1 font-display text-3xl text-white">
            {props.session ? props.session.user.email : "Unlock m.OS"}
          </h2>
          <p className="mt-2 text-sm text-white/42">{props.message}</p>
        </div>
        {props.session ? (
          <button
            type="button"
            onClick={props.onSignOut}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/65 transition hover:bg-white/[0.08]"
          >
            Lock Session
          </button>
        ) : (
          <form onSubmit={props.onSubmit} className="grid flex-1 gap-3 lg:max-w-4xl lg:grid-cols-[1fr_1fr_1fr_auto]">
            {props.mode === "register" && (
              <input name="display_name" placeholder="Name" className="command-input rounded-2xl px-4 py-3 text-white" />
            )}
            <input name="email" type="email" required placeholder="Email" className="command-input rounded-2xl px-4 py-3 text-white" />
            <input name="password" type="password" required minLength={props.mode === "register" ? 10 : 1} placeholder="Password" className="command-input rounded-2xl px-4 py-3 text-white" />
            <button disabled={props.pending} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:bg-cyan-100">
              {props.mode === "register" ? "Create" : "Unlock"}
            </button>
            <button
              type="button"
              onClick={() => props.onModeChange(props.mode === "login" ? "register" : "login")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/50 transition hover:text-white lg:col-span-4"
            >
              {props.mode === "login" ? "Create first account" : "Use existing account"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="glass-panel relative overflow-hidden rounded-[3rem] p-6 sm:p-8 lg:p-12">
      <div className="absolute right-8 top-8 hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-white/55 md:flex">
        <ShieldCheck className="h-4 w-4 text-emerald-300" />
        encrypted vault plus audit trail
      </div>
      <div className="max-w-6xl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-100/70">
          <Sparkles className="h-4 w-4" />
          New age personal OS
        </div>
        <h1 className="font-display text-6xl leading-[0.86] tracking-tight text-white sm:text-8xl lg:text-[9.5rem]">
          Command Center
        </h1>
      </div>
    </section>
  );
}

function PlatformConstellation() {
  return (
    <section className="glass-panel overflow-hidden rounded-[2rem] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-3xl lg:grid-cols-6">
          {platforms.map((platform) => (
            <div key={platform.name} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className={cn("absolute -right-6 -top-6 h-16 w-16 rounded-full bg-current opacity-0 blur-2xl transition group-hover:opacity-20", platform.tone)} />
              <div className="relative z-10 flex items-center gap-2">
                <span className={cn("grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/20 text-xs font-black", platform.tone)}>
                  {platform.mark}
                </span>
                <div>
                  <platform.icon className={cn("mb-1 h-3.5 w-3.5", platform.tone)} />
                  <div className="text-xs text-white/55">{platform.name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopDomainMap() {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      {zones.map((zone, index) => (
        <div
          key={zone.label}
          className={cn(
            "group relative min-h-80 animate-rise overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5",
            index < 2 ? "lg:col-span-3" : "lg:col-span-2"
          )}
          style={{ animationDelay: `${120 + index * 60}ms` }}
        >
          <div className={cn("absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br opacity-25 blur-3xl transition group-hover:opacity-55", zone.tone)} />
          <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
            <div className="ml-5 mt-4 flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-200/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/60" />
            </div>
          </div>
          <div className="relative z-10 mt-14 flex h-full flex-col">
            <div className="flex items-start justify-between">
              <DomainLogo zone={zone} />
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/36">
                {zone.signature}
              </span>
            </div>
            <h3 className={cn("mt-8 text-4xl leading-none text-white", zone.font)}>
              {zone.label}
            </h3>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/45">{zone.character}</p>
            <div className="mt-auto pt-8">
              <DomainIllustration label={zone.label} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DomainLogo({ zone }: { zone: (typeof zones)[number] }) {
  return (
    <div className={cn("relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br shadow-violet", zone.tone)}>
      <div className="absolute inset-1 rounded-[1rem] border border-white/30 bg-black/10" />
      <zone.icon className="relative z-10 h-7 w-7 text-black/75" />
    </div>
  );
}

function DomainIllustration({ label }: { label: string }) {
  if (label === "Projects") {
    return (
      <div className="grid grid-cols-3 gap-2 opacity-80">
        {["repo", "api", "deploy", "db", "ai", "prod"].map((item) => (
          <div key={item} className="rounded-xl border border-cyan-100/15 bg-cyan-100/[0.05] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
            {item}
          </div>
        ))}
      </div>
    );
  }
  if (label === "Vault") {
    return (
      <div className="flex gap-2 opacity-80">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-16 flex-1 rounded-2xl border border-violet-100/15 bg-violet-100/[0.05] p-3">
            <div className="h-2 w-8 rounded-full bg-violet-100/25" />
            <div className="mt-5 h-1.5 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    );
  }
  if (label === "Diary") {
    return (
      <div className="space-y-2 opacity-80">
        <div className="h-3 w-2/3 rounded-full bg-rose-100/20" />
        <div className="h-3 w-full rounded-full bg-white/10" />
        <div className="h-3 w-4/5 rounded-full bg-white/10" />
      </div>
    );
  }
  if (label === "Ideas") {
    return (
      <div className="flex items-end gap-2 opacity-80">
        {[4, 9, 6, 12, 7].map((height, index) => (
          <div key={index} className="w-full rounded-t-2xl bg-amber-100/15" style={{ height: `${height * 0.5}rem` }} />
        ))}
      </div>
    );
  }
  if (label === "Business") {
    return (
      <div className="grid grid-cols-4 gap-2 opacity-80">
        {[Landmark, BriefcaseBusiness, CircleDollarSign, Layers3].map((Icon, index) => (
          <div key={index} className="grid h-14 place-items-center rounded-2xl border border-emerald-100/15 bg-emerald-100/[0.05]">
            <Icon className="h-5 w-5 text-emerald-100/45" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 opacity-80">
      {[HeartHandshake, Goal, Gem].map((Icon, index) => (
        <div key={index} className="grid h-16 place-items-center rounded-2xl border border-indigo-100/15 bg-indigo-100/[0.05]">
          <Icon className="h-6 w-6 text-indigo-100/45" />
        </div>
      ))}
    </div>
  );
}

function AssistantPanel(props: {
  prompt: string;
  response: string;
  pending: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="glass-panel relative overflow-hidden rounded-[2.5rem] p-5 sm:p-7">
      <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-violet-300/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
        <div className="ml-6 mt-4 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-200/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/60" />
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="mt-12 text-xs uppercase tracking-[0.35em] text-violet-100/45">LLM Copilot</p>
          <h2 className="mt-2 font-display text-5xl">Ask your life OS</h2>
        </div>
        <BrainCircuit className="h-8 w-8 text-violet-200" />
      </div>
      <form onSubmit={props.onSubmit} className="space-y-4">
        <textarea
          value={props.prompt}
          onChange={(event) => props.onPromptChange(event.target.value)}
          className="command-input min-h-32 w-full resize-none rounded-3xl p-4 text-sm leading-7 text-white"
        />
        <button className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.24em] text-black transition hover:bg-cyan-100 disabled:opacity-50" disabled={props.pending}>
          {props.pending ? "Thinking..." : "Run Assistant"}
        </button>
      </form>
      <div className="mt-5 min-h-40 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm leading-7 text-white/68">
        {props.response}
      </div>
    </section>
  );
}

function Composer(props: {
  active: "project" | "note" | "todo" | "diary" | "credential";
  pending: boolean;
  onActiveChange: (value: "project" | "note" | "todo" | "diary" | "credential") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const tabs = ["project", "note", "todo", "diary", "credential"] as const;
  return (
    <section className="glass-panel relative overflow-hidden rounded-[2.5rem] p-5 sm:p-7">
      <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-rose-300/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
        <div className="ml-6 mt-4 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-200/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/60" />
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="mt-12 text-xs uppercase tracking-[0.35em] text-rose-100/45">Capture</p>
          <h2 className="mt-2 font-display text-5xl">Record anything</h2>
        </div>
        <Plus className="h-7 w-7 text-rose-200" />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => props.onActiveChange(tab)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition",
              props.active === tab ? "border-white/40 bg-white text-black" : "border-white/10 bg-white/[0.04] text-white/45 hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <form onSubmit={props.onSubmit} className="space-y-3">
        <input name="title" required placeholder={`${props.active} title`} className="command-input w-full rounded-2xl px-4 py-4 text-white" />
        <textarea name="content" required={props.active !== "credential"} placeholder="Details, context, next action, platform, or memory..." className="command-input min-h-28 w-full resize-none rounded-2xl p-4 text-white" />
        {props.active === "credential" && (
          <input name="secret" type="password" placeholder="Secret value" className="command-input w-full rounded-2xl px-4 py-4 text-white" />
        )}
        <button disabled={props.pending} className="w-full rounded-2xl bg-gradient-to-r from-cyan-200 via-white to-violet-200 px-5 py-4 text-sm font-bold uppercase tracking-[0.24em] text-black">
          Save to OS
        </button>
      </form>
    </section>
  );
}

function IntelligenceGrid({ data }: { data: CommandCenterData }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <ListPanel title="Active Projects" icon={BriefcaseBusiness} items={data.projects.map((item) => ({
        id: item.id,
        title: item.name,
        detail: item.description ?? item.platform ?? "No details yet"
      }))} />
      <ListPanel title="Knowledge Stream" icon={Sparkles} items={data.notes.map((item) => ({
        id: item.id,
        title: item.title,
        detail: `${item.kind} - ${item.content}`
      }))} />
      <ListPanel title="Diary Pulse" icon={BrainCircuit} items={data.diary.map((item) => ({
        id: item.id,
        title: item.title,
        detail: `${item.mood ?? "recorded"} - ${item.content}`
      }))} />
      <ListPanel title="Mission Queue" icon={CalendarCheck} items={data.todos.map((item) => ({
        id: item.id,
        title: item.title,
        detail: `${item.priority} - ${item.status} - ${item.detail ?? ""}`
      }))} />
      <ListPanel title="Vault Index" icon={KeyRound} items={data.credentials.map((item) => ({
        id: item.id,
        title: item.label,
        detail: `${item.kind} - ${item.secret_preview}`
      }))} />
      <SystemFootage events={data.audit} />
    </section>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function ListPanel({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: Array<{ id: string; title: string; detail: string }> }) {
  return (
    <div className="glass-panel group relative min-h-80 overflow-hidden rounded-[2.5rem] p-5">
      <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
        <div className="ml-5 mt-4 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-200/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/50" />
        </div>
      </div>
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/10 opacity-70 blur-3xl transition group-hover:opacity-100" />
      <div className="mb-4 flex items-center gap-3">
        <Icon className="mt-12 h-5 w-5 text-cyan-200" />
        <h3 className="mt-12 font-display text-3xl">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]">
            <div className="font-medium text-white/90">{item.title}</div>
            <div className="mt-1 line-clamp-2 text-sm leading-6 text-white/42">{item.detail}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
            Nothing captured yet.
          </div>
        )}
      </div>
    </div>
  );
}

function SystemFootage({ events }: { events: AuditEvent[] }) {
  const visibleEvents = events.slice(0, 4);
  return (
    <div className="glass-panel relative min-h-80 overflow-hidden rounded-[2.5rem] p-5">
      <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
        <div className="ml-5 mt-4 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-200/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/50" />
        </div>
      </div>
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-300/10 blur-3xl" />
      <div className="mt-12 flex items-center gap-3">
        <Search className="h-5 w-5 text-violet-200" />
        <h3 className="font-display text-3xl">System Footage</h3>
      </div>
      <div className="mt-6 space-y-3">
        {visibleEvents.map((item, index) => (
          <div key={item.id} className="relative rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="absolute left-0 top-1/2 h-px w-8 -translate-x-8 bg-gradient-to-l from-violet-200/40 to-transparent" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-white/85">{item.action}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
                frame {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-2 text-xs leading-6 text-white/38">
              {item.resource_type} - {formatTimestamp(item.created_at)}
            </div>
          </div>
        ))}
        {visibleEvents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
            No footage recorded yet.
          </div>
        )}
      </div>
      <div className="mt-5 grid grid-cols-5 gap-1.5 opacity-60">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-1.5 rounded-full bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function OrbitalBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="orbital-ring absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.035]"
      />
      <div
        className="orbital-ring-reverse absolute left-1/2 top-1/2 h-[64rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/[0.04]"
      />
    </div>
  );
}
