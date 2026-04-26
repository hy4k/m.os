"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
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
  createDeploymentNote,
  createDiary,
  createNote,
  createPlatformConnection,
  createPlayground,
  createProject,
  createProjectEnvironment,
  createTodo,
  downloadUserFileBlob,
  getAuthMe,
  getStoredSession,
  importGithubRepos,
  loadCommandCenter,
  loadLlmStatus,
  login,
  register,
  totpDisable,
  totpEnrollStart,
  totpEnrollVerify,
  TotpRequiredError,
  updatePlayground,
  uploadUserFile,
  type AuthMe,
  type AuthSession,
  type AuditEvent,
  type Credential,
  type DeploymentNote,
  type DiaryEntry,
  type KnowledgeItem,
  type LlmStatus,
  type PlatformConnection,
  type Playground,
  type Project,
  type ProjectEnvironment,
  type ProjectLink,
  type Todo,
  type UserFileRecord
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CommandCenterData = {
  projects: Project[];
  notes: KnowledgeItem[];
  diary: DiaryEntry[];
  todos: Todo[];
  credentials: Credential[];
  audit: AuditEvent[];
  projectLinks: ProjectLink[];
  playgrounds: Playground[];
  platformConnections: PlatformConnection[];
  environments: ProjectEnvironment[];
  deploymentNotes: DeploymentNote[];
  files: UserFileRecord[];
};

type Props = {
  initialData: CommandCenterData;
  live: boolean;
};

const KNOWLEDGE_KINDS: KnowledgeItem["kind"][] = ["note", "idea", "goal", "contact", "business", "life"];

function parseKnowledgeKind(raw: string): KnowledgeItem["kind"] {
  return KNOWLEDGE_KINDS.includes(raw as KnowledgeItem["kind"]) ? (raw as KnowledgeItem["kind"]) : "idea";
}

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
  const [assistantRag, setAssistantRag] = useState<Array<{ id: string; kind: string; title: string; similarity: number }>>([]);
  const [prompt, setPrompt] = useState("What should I focus on next across my projects and life OS?");
  const [activeComposer, setActiveComposer] = useState<"project" | "note" | "todo" | "diary" | "credential">("note");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authMessage, setAuthMessage] = useState("Sign in to write into your private workspace.");
  const [totpChallenge, setTotpChallenge] = useState<{ email: string; password: string } | null>(null);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [opsMessage, setOpsMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSession(getStoredSession());
    loadLlmStatus()
      .then(setLlmStatus)
      .catch(() => setLlmStatus(null));
  }, []);

  useEffect(() => {
    if (!session || !live) {
      setMe(null);
      return;
    }
    getAuthMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, [session, live]);

  const stats = useMemo(() => [
    { label: "Projects", value: data.projects.length, icon: Network },
    { label: "Connections", value: data.platformConnections.length, icon: Code2 },
    { label: "Playgrounds", value: data.playgrounds.length, icon: Lightbulb },
    { label: "Secrets", value: data.credentials.length, icon: KeyRound }
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
          const kind = parseKnowledgeKind(String(form.get("knowledge_kind") ?? "idea"));
          const created = await createNote({ title, content, kind });
          refreshCreated("notes", { id: created.id, title, content, kind });
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
        if (activeComposer === "note") {
          const kind = parseKnowledgeKind(String(form.get("knowledge_kind") ?? "idea"));
          refreshCreated("notes", { id: fallbackId, title, content, kind });
        }
        if (activeComposer === "todo") refreshCreated("todos", { id: fallbackId, title, detail: content, priority: "high", status: "pending" });
        if (activeComposer === "diary") refreshCreated("diary", { id: fallbackId, title, content, mood: "offline" });
        if (activeComposer === "credential") refreshCreated("credentials", { id: fallbackId, label: title, kind: "secret", secret_preview: "local-only" });
      }
    });
  }

  async function submitAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssistantResponse("Retrieving similar notes, then your full project graph; routing to the LLM…");
    setAssistantRag([]);
    startTransition(async () => {
      try {
        const response = await askAssistant({ prompt, policy: "life-os", include_rag: true, rag_limit: 8 });
        setAssistantRag(response.rag_sources ?? []);
        setAssistantResponse(`${response.output}\n\nProvider: ${response.provider} / ${response.model}`);
      } catch {
        setAssistantRag([]);
        setAssistantResponse("The API or LLM runtime is not reachable yet. Once Azure Ollama and the backend are online, this panel will answer with RAG + your live context.");
      }
    });
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const display_name = String(form.get("display_name") ?? "");
    const totp_code = String(form.get("totp_code") ?? "").trim();

    setAuthMessage("Opening private session...");
    startTransition(async () => {
      try {
        if (authMode === "register") {
          setTotpChallenge(null);
          const nextSession = await register({ email, password, display_name: display_name || undefined });
          setSession(nextSession);
          setAuthMessage(`Signed in as ${nextSession.user.email}`);
          formEl.reset();
          return;
        }

        if (totpChallenge) {
          if (!/^\d{6}$/.test(totp_code)) {
            setAuthMessage("Enter the 6-digit authenticator code.");
            return;
          }
          const nextSession = await login({
            email: totpChallenge.email,
            password: totpChallenge.password,
            totp_code
          });
          setTotpChallenge(null);
          setSession(nextSession);
          setAuthMessage(`Signed in as ${nextSession.user.email}`);
          formEl.reset();
          return;
        }

        const nextSession = await login({ email, password });
        setSession(nextSession);
        setAuthMessage(`Signed in as ${nextSession.user.email}`);
        formEl.reset();
      } catch (error) {
        if (error instanceof TotpRequiredError) {
          setTotpChallenge({ email, password });
          setAuthMessage("Enter the 6-digit code from your authenticator app.");
          return;
        }
        setAuthMessage(error instanceof Error ? error.message : "Authentication failed");
      }
    });
  }

  function signOut() {
    clearSession();
    setSession(null);
    setTotpChallenge(null);
    setMe(null);
    setAuthMessage("Signed out. Preview mode is still available.");
  }

  function refreshCommandData() {
    if (!live) {
      return;
    }
    startTransition(async () => {
      try {
        setData(await loadCommandCenter());
      } catch {
        setOpsMessage("Could not refresh from API.");
      }
    });
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
          totpChallenge={Boolean(totpChallenge)}
          onModeChange={(mode) => {
            setAuthMode(mode);
            setTotpChallenge(null);
          }}
          onSubmit={submitAuth}
          onSignOut={signOut}
          onCancelTotp={() => {
            setTotpChallenge(null);
            setAuthMessage("Sign in cancelled. Enter email and password again.");
          }}
        />
        {session && live ? (
          <TotpSecurityCard
            me={me}
            pending={isPending}
            onMeUpdated={() => {
              getAuthMe()
                .then(setMe)
                .catch(() => setMe(null));
            }}
            onMessage={setAuthMessage}
          />
        ) : null}
        <LlmRuntimePanel status={llmStatus} />
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
            ragSources={assistantRag}
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
        <LifePanorama notes={data.notes} />
        <ProjectIntelligence
          data={data}
          pending={isPending}
          onPlaygroundStageChange={(id, stage) => {
            startTransition(async () => {
              try {
                if (!live) {
                  setData((d) => ({
                    ...d,
                    playgrounds: d.playgrounds.map((p) => (p.id === id ? { ...p, stage } : p))
                  }));
                  return;
                }
                const updated = await updatePlayground(id, { stage });
                setData((d) => ({
                  ...d,
                  playgrounds: d.playgrounds.map((p) => (p.id === id ? { ...p, ...updated } : p))
                }));
              } catch {
                setOpsMessage("Could not update playground stage.");
              }
            });
          }}
        />
        <OperationsCommandStrip
          data={data}
          live={live}
          message={opsMessage}
          onMessage={setOpsMessage}
          pending={isPending}
          onRefresh={refreshCommandData}
          startTransition={startTransition}
          onDataPatch={setData}
        />
        <OperationsDeck data={data} />
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
  totpChallenge: boolean;
  onModeChange: (mode: "login" | "register") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  onCancelTotp: () => void;
}) {
  const showTotpStep = props.totpChallenge && props.mode === "login" && !props.session;

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">Private Session</p>
          <h2 className="mt-1 font-display text-3xl text-white">
            {props.session ? props.session.user.email : showTotpStep ? "Authenticator" : "Unlock m.OS"}
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
        ) : showTotpStep ? (
          <form onSubmit={props.onSubmit} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center lg:max-w-2xl">
            <input
              name="totp_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              placeholder="6-digit code"
              className="command-input rounded-2xl px-4 py-3 text-white sm:flex-1"
            />
            <button
              disabled={props.pending}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:bg-cyan-100"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={props.onCancelTotp}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/50 transition hover:text-white"
            >
              Back
            </button>
          </form>
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

function TotpSecurityCard(props: {
  me: AuthMe | null;
  pending: boolean;
  onMeUpdated: () => void;
  onMessage: (value: string) => void;
}) {
  const [enroll, setEnroll] = useState<{ otpauth_url: string; secret: string } | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [cardPending, startCardTransition] = useTransition();
  const busy = props.pending || cardPending;

  if (!props.me) {
    return null;
  }

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-300/10 blur-3xl" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">Authenticator (TOTP)</p>
          <h3 className="mt-1 font-display text-2xl text-white">Second factor</h3>
          <p className="mt-2 text-sm text-white/42">
            {props.me.totp_enabled
              ? "Your account requires a 6-digit code from an authenticator app when you sign in."
              : props.me.totp_enrollment_pending
                ? "Finish enrollment by entering a code from your app."
                : "Add an authenticator app for stronger sign-in."}
          </p>
        </div>
        <div className="flex max-w-xl flex-1 flex-col gap-3">
          {!props.me.totp_enabled && !enroll && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                props.onMessage("");
                startCardTransition(async () => {
                  try {
                    const started = await totpEnrollStart();
                    setEnroll(started);
                    props.onMessage("Scan the otpauth URL or enter the secret manually, then confirm with a code.");
                  } catch (e) {
                    props.onMessage(e instanceof Error ? e.message : "Could not start TOTP enrollment.");
                  }
                });
              }}
              className="rounded-2xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-black"
            >
              Start enrollment
            </button>
          )}
          {enroll && !props.me.totp_enabled && (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/55">
              <div className="break-all font-mono text-[11px] text-cyan-100/70">{enroll.otpauth_url}</div>
              <div className="font-mono text-[11px] text-white/40">Secret: {enroll.secret}</div>
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const code = String(fd.get("enroll_code") ?? "").trim();
                  if (!/^\d{6}$/.test(code)) {
                    props.onMessage("Enter a 6-digit code.");
                    return;
                  }
                  startCardTransition(async () => {
                    try {
                      await totpEnrollVerify(code);
                      setEnroll(null);
                      props.onMeUpdated();
                      props.onMessage("Authenticator enabled.");
                    } catch (err) {
                      props.onMessage(err instanceof Error ? err.message : "Verification failed.");
                    }
                  });
                }}
              >
                <input
                  name="enroll_code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Code"
                  className="command-input rounded-xl px-3 py-2 text-white"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                >
                  Confirm
                </button>
              </form>
            </div>
          )}
          {props.me.totp_enabled && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Password to disable TOTP"
                className="command-input flex-1 rounded-2xl px-4 py-3 text-sm text-white"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!disablePassword) {
                    props.onMessage("Password required to disable TOTP.");
                    return;
                  }
                  startCardTransition(async () => {
                    try {
                      await totpDisable(disablePassword);
                      setDisablePassword("");
                      props.onMeUpdated();
                      props.onMessage("Authenticator disabled.");
                    } catch (err) {
                      props.onMessage(err instanceof Error ? err.message : "Could not disable TOTP.");
                    }
                  });
                }}
                className="rounded-2xl border border-rose-300/25 bg-rose-300/[0.08] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-rose-100/80"
              >
                Disable
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LlmRuntimePanel({ status }: { status: LlmStatus | null }) {
  const azureOk = Boolean(status?.azure.ok);
  const gemmaInstalled = Boolean(status?.azure.expectedModelInstalled);
  const lifeOs = status?.routes.find((route) => route.policy === "life-os");
  const mos = status?.mosAssistant;

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1.2fr] lg:items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">m.OS primary brain (Azure Ollama)</p>
          <h2 className="mt-1 font-display text-3xl text-white">
            {azureOk ? "Gemma 4 command stack online" : "Azure Ollama not verified"}
          </h2>
          <p className="mt-2 text-sm text-white/42">
            {status
              ? `Copilot uses Ollama /api/chat on your Azure host with ${
                  status.azure.expectedModel ?? "AZURE_OLLAMA_MODEL"
                } — ${gemmaInstalled ? "model present in Ollama" : "model not seen in ollama list yet"}.`
              : "API status endpoint is not reachable yet."}
          </p>
          {mos && (
            <p className="mt-2 text-xs leading-relaxed text-cyan-100/50">
              Advanced stack: {mos.numCtx.toLocaleString()} token context window · T={mos.temperature} · system prompt:{" "}
              {mos.systemPrompt} · {mos.model}
            </p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <RuntimeChip
            label="Azure endpoint"
            value={status?.azure.baseUrl ? formatHost(status.azure.baseUrl) : "—"}
            active={azureOk}
          />
          <RuntimeChip label="Gemma 4" value={gemmaInstalled ? "ready" : "missing"} active={gemmaInstalled} />
          <RuntimeChip
            label="m.OS (life-os)"
            value={lifeOs?.model?.split("/").pop() ?? lifeOs?.model ?? "—"}
            active={Boolean(lifeOs)}
          />
          <RuntimeChip
            label="RAG + graph"
            value="vector + project graph"
            active={Boolean(status)}
          />
        </div>
      </div>
    </section>
  );
}

function formatHost(url: string) {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function RuntimeChip({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.8)]" : "bg-rose-300/70")} />
        <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</span>
      </div>
      <div className="mt-2 truncate text-sm font-medium text-white/75">{value}</div>
    </div>
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
  ragSources: Array<{ id: string; kind: string; title: string; similarity: number }>;
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
          <p className="mt-12 text-xs uppercase tracking-[0.35em] text-violet-100/45">Azure Ollama · Gemma 4 + RAG</p>
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
      {props.ragSources.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-white/35">Grounded in your notes (semantic match)</p>
          <div className="flex flex-wrap gap-2">
            {props.ragSources.map((s) => (
              <span
                key={s.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-[11px] text-cyan-100/80"
                title={`${s.kind} — relevance ${(s.similarity * 100).toFixed(0)}% (approx.)`}
              >
                <span className="shrink-0 text-[9px] uppercase text-white/40">{s.kind}</span>
                <span className="truncate">{s.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}
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
        {props.active === "note" && (
          <select
            name="knowledge_kind"
            className="command-input w-full rounded-2xl px-4 py-3 text-sm text-white"
            defaultValue="idea"
          >
            <option value="idea">Idea</option>
            <option value="note">Note</option>
            <option value="goal">Goal</option>
            <option value="contact">Contact</option>
            <option value="business">Business</option>
            <option value="life">Life & family</option>
          </select>
        )}
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

function LifePanorama({ notes }: { notes: KnowledgeItem[] }) {
  const lanes: Array<{ label: string; kind: KnowledgeItem["kind"]; chip: string }> = [
    { label: "Life & family", kind: "life", chip: "north star" },
    { label: "Goals", kind: "goal", chip: "milestones" },
    { label: "Business", kind: "business", chip: "empire ledger" },
    { label: "People", kind: "contact", chip: "rolodex" }
  ];
  return (
    <section className="glass-panel rounded-[2.5rem] p-5 sm:p-7">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">Life OS lanes</p>
          <h2 className="font-display text-4xl text-white md:text-5xl">Personal graph</h2>
        </div>
        <p className="max-w-xl text-sm text-white/45">
          Goals, business, contacts, and life planning surface here from your knowledge stream. Capture with the note tab and pick a lane.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {lanes.map((lane) => {
          const items = notes.filter((n) => n.kind === lane.kind).slice(0, 4);
          return (
            <div key={lane.kind} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white/88">{lane.label}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/32">{lane.chip}</span>
              </div>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                    <div className="text-sm font-medium text-white/75">{item.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/38">{item.content}</div>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="text-xs text-white/30">Nothing in this lane yet.</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
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

function ProjectIntelligence({
  data,
  pending,
  onPlaygroundStageChange
}: {
  data: CommandCenterData;
  pending: boolean;
  onPlaygroundStageChange: (id: string, stage: Playground["stage"]) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="glass-panel relative min-h-96 overflow-hidden rounded-[2.5rem] p-6">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
          <div className="ml-6 mt-4 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-200/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/50" />
          </div>
        </div>
        <div className="mt-12 flex items-center gap-3">
          <Network className="h-5 w-5 text-cyan-200" />
          <h3 className="font-display text-4xl">Project Intelligence</h3>
        </div>
        <div className="mt-6 grid gap-3">
          {data.projectLinks.slice(0, 6).map((link) => (
            <div key={link.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.06]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-white/90">{link.link_label ?? link.link_type}</div>
                  <div className="mt-1 text-sm text-white/40">{link.project_name ?? link.project_id}</div>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
                  {link.link_type}
                </span>
              </div>
              <div className="mt-3 truncate font-mono text-xs text-cyan-100/45">{link.link_value}</div>
            </div>
          ))}
          {data.projectLinks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
              No project links yet.
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel relative min-h-96 overflow-hidden rounded-[2.5rem] p-6">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
          <div className="ml-6 mt-4 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-200/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/50" />
          </div>
        </div>
        <div className="mt-12 flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-amber-200" />
          <h3 className="font-display text-4xl">Idea Playgrounds</h3>
        </div>
        <div className="mt-6 grid gap-3">
          {data.playgrounds.slice(0, 4).map((playground) => (
            <div key={playground.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.06]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white/90">{playground.title}</div>
                  <div className="mt-1 text-sm text-white/40">{playground.project_name ?? playground.current_focus ?? "unlinked"}</div>
                </div>
                <select
                  value={playground.stage}
                  disabled={pending}
                  onChange={(e) => onPlaygroundStageChange(playground.id, e.target.value as Playground["stage"])}
                  className="command-input shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/80"
                >
                  {(["seed", "research", "prototype", "build", "paused", "launched"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 text-sm leading-6 text-white/45">{playground.brief ?? "No brief yet."}</div>
            </div>
          ))}
          {data.playgrounds.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
              No playgrounds yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OperationsCommandStrip(props: {
  data: CommandCenterData;
  live: boolean;
  message: string;
  onMessage: (value: string) => void;
  pending: boolean;
  onRefresh: () => void;
  startTransition: (fn: () => void | Promise<void>) => void;
  onDataPatch: Dispatch<SetStateAction<CommandCenterData>>;
}) {
  const { data, live, onMessage, onRefresh, startTransition, onDataPatch } = props;
  const githubCreds = useMemo(
    () => data.credentials.filter((c) => c.kind === "github_pat"),
    [data.credentials]
  );

  function addDemoItem<K extends keyof CommandCenterData>(kind: K, item: CommandCenterData[K][number]) {
    onDataPatch((current) => ({
      ...current,
      [kind]: [item, ...(current[kind] as CommandCenterData[K])]
    }));
  }

  return (
    <div className="space-y-4">
      {props.message && (
        <p className="text-sm text-cyan-100/50">{props.message}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <form
          className="glass-panel space-y-3 rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const projectId = String(fd.get("conn_project_id") ?? "").trim();
            const label = String(fd.get("conn_label") ?? "").trim();
            const baseUrl = String(fd.get("conn_base_url") ?? "").trim();
            const provider = String(fd.get("conn_provider") ?? "other") as PlatformConnection["provider"];
            if (!label) {
              onMessage("Add a label for the connection.");
              return;
            }
            startTransition(async () => {
              try {
                if (live) {
                  await createPlatformConnection({
                    project_id: projectId || undefined,
                    label,
                    base_url: baseUrl || undefined,
                    provider: provider as never,
                    status: "manual"
                  });
                  onMessage("Connection saved.");
                  onRefresh();
                } else {
                  const p = data.projects.find((x) => x.id === projectId);
                  addDemoItem("platformConnections", {
                    id: `local-conn-${Date.now()}`,
                    project_id: projectId || undefined,
                    project_name: p?.name,
                    label,
                    base_url: baseUrl || undefined,
                    provider: provider as never,
                    status: "manual"
                  });
                  onMessage("Preview: connection added locally.");
                }
                e.currentTarget.reset();
              } catch (err) {
                onMessage(err instanceof Error ? err.message : "Could not save connection.");
              }
            });
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Add connection</p>
          <p className="text-xs text-white/45">Link a project to a platform (no secrets in this form).</p>
          <select name="conn_project_id" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Project (optional)</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            name="conn_provider"
            className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white"
            defaultValue="github"
          >
            <option value="github">GitHub</option>
            <option value="supabase">Supabase</option>
            <option value="azure">Azure</option>
            <option value="hostinger">Hostinger</option>
            <option value="google_ai_studio">Google AI Studio</option>
            <option value="cursor">Cursor</option>
            <option value="openclaw">OpenClaw</option>
            <option value="other">Other</option>
          </select>
          <input name="conn_label" required placeholder="Label" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <input name="conn_base_url" placeholder="Base URL" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <button
            type="submit"
            disabled={props.pending}
            className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Save connection
          </button>
        </form>

        <form
          className="glass-panel space-y-3 rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const projectId = String(fd.get("env_project_id") ?? "");
            const name = String(fd.get("env_name") ?? "").trim();
            if (!projectId || !name) {
              onMessage("Environment needs a project and a name.");
              return;
            }
            const url = String(fd.get("env_url") ?? "").trim();
            const runtime = String(fd.get("env_runtime") ?? "").trim();
            const region = String(fd.get("env_region") ?? "").trim();
            const status = String(fd.get("env_status") ?? "unknown");
            const project = data.projects.find((p) => p.id === projectId);
            startTransition(async () => {
              try {
                if (live) {
                  await createProjectEnvironment({
                    project_id: projectId,
                    name,
                    url: url || undefined,
                    runtime: runtime || undefined,
                    region: region || undefined,
                    status: status as never
                  });
                  onMessage("Environment saved.");
                  onRefresh();
                } else {
                  addDemoItem("environments", {
                    id: `local-env-${Date.now()}`,
                    project_id: projectId,
                    project_name: project?.name,
                    name,
                    url: url || undefined,
                    runtime: runtime || undefined,
                    region: region || undefined,
                    status: status as never
                  });
                  onMessage("Preview: environment added locally.");
                }
                e.currentTarget.reset();
              } catch (err) {
                onMessage(err instanceof Error ? err.message : "Could not save environment.");
              }
            });
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Environment</p>
          <p className="text-xs text-white/45">Staging, production, or a named stack.</p>
          <select name="env_project_id" required className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Project *</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="env_name" required placeholder="Name (e.g. staging)" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <input name="env_url" placeholder="URL" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <div className="grid grid-cols-2 gap-2">
            <input name="env_runtime" placeholder="Runtime" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
            <input name="env_region" placeholder="Region" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          </div>
          <select name="env_status" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" defaultValue="unknown">
            <option value="unknown">unknown</option>
            <option value="healthy">healthy</option>
            <option value="degraded">degraded</option>
            <option value="down">down</option>
            <option value="paused">paused</option>
          </select>
          <button
            type="submit"
            disabled={props.pending}
            className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Save environment
          </button>
        </form>

        <form
          className="glass-panel space-y-3 rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const projectId = String(fd.get("dep_project_id") ?? "").trim();
            const envId = String(fd.get("dep_env_id") ?? "").trim();
            const title = String(fd.get("dep_title") ?? "").trim();
            if (!title) {
              onMessage("Deployment needs a title.");
              return;
            }
            const summary = String(fd.get("dep_summary") ?? "").trim();
            const depStatus = String(fd.get("dep_status") ?? "planned");
            const versionRef = String(fd.get("dep_version") ?? "").trim();
            const project = data.projects.find((p) => p.id === projectId);
            const env = data.environments.find((x) => x.id === envId);
            startTransition(async () => {
              try {
                if (live) {
                  await createDeploymentNote({
                    project_id: projectId || undefined,
                    environment_id: envId || undefined,
                    title,
                    summary: summary || undefined,
                    status: depStatus as never,
                    version_ref: versionRef || undefined
                  });
                  onMessage("Deployment note saved.");
                  onRefresh();
                } else {
                  addDemoItem("deploymentNotes", {
                    id: `local-dep-${Date.now()}`,
                    project_id: projectId || undefined,
                    project_name: project?.name,
                    environment_id: envId || undefined,
                    environment_name: env?.name,
                    title,
                    summary: summary || undefined,
                    status: depStatus as never,
                    version_ref: versionRef || undefined
                  });
                  onMessage("Preview: deployment note added locally.");
                }
                e.currentTarget.reset();
              } catch (err) {
                onMessage(err instanceof Error ? err.message : "Could not save deployment note.");
              }
            });
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Deployment</p>
          <p className="text-xs text-white/45">Release log entry for a project or environment.</p>
          <select name="dep_project_id" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Project (optional)</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="dep_env_id" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Environment (optional)</option>
            {data.environments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.project_name ?? "project"} / {x.name}
              </option>
            ))}
          </select>
          <input name="dep_title" required placeholder="Title" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <input name="dep_version" placeholder="Version / ref" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <input name="dep_summary" placeholder="Summary" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <select name="dep_status" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" defaultValue="planned">
            <option value="planned">planned</option>
            <option value="running">running</option>
            <option value="succeeded">succeeded</option>
            <option value="failed">failed</option>
            <option value="rolled_back">rolled_back</option>
          </select>
          <button
            type="submit"
            disabled={props.pending}
            className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Save note
          </button>
        </form>

        <form
          className="glass-panel space-y-3 rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const title = String(fd.get("pg_title") ?? "").trim();
            if (!title) {
              onMessage("Playground needs a title.");
              return;
            }
            const projectId = String(fd.get("pg_project_id") ?? "").trim();
            const brief = String(fd.get("pg_brief") ?? "").trim();
            const stage = String(fd.get("pg_stage") ?? "seed");
            const project = data.projects.find((p) => p.id === projectId);
            startTransition(async () => {
              try {
                if (live) {
                  await createPlayground({
                    project_id: projectId || undefined,
                    title,
                    brief: brief || undefined,
                    stage: stage as Playground["stage"]
                  });
                  onMessage("Playground created.");
                  onRefresh();
                } else {
                  addDemoItem("playgrounds", {
                    id: `local-pg-${Date.now()}`,
                    project_id: projectId || undefined,
                    project_name: project?.name,
                    title,
                    brief: brief || undefined,
                    stage: stage as Playground["stage"],
                    next_actions: []
                  });
                  onMessage("Preview: playground added locally.");
                }
                e.currentTarget.reset();
              } catch (err) {
                onMessage(err instanceof Error ? err.message : "Could not create playground.");
              }
            });
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Playground</p>
          <p className="text-xs text-white/45">Quick-create an idea board linked to a project.</p>
          <select name="pg_project_id" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Project (optional)</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="pg_title" required placeholder="Title" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <input name="pg_brief" placeholder="Brief" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" />
          <select name="pg_stage" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" defaultValue="seed">
            <option value="seed">seed</option>
            <option value="research">research</option>
            <option value="prototype">prototype</option>
            <option value="build">build</option>
            <option value="paused">paused</option>
            <option value="launched">launched</option>
          </select>
          <button
            type="submit"
            disabled={props.pending}
            className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Create playground
          </button>
        </form>

        <form
          className="glass-panel space-y-3 rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const file = fd.get("user_file");
            if (!(file instanceof File) || file.size === 0) {
              onMessage("Choose a file to upload.");
              return;
            }
            const projectId = String(fd.get("file_project_id") ?? "").trim();
            startTransition(async () => {
              try {
                if (live) {
                  await uploadUserFile(file, projectId || undefined);
                  onMessage("File uploaded.");
                  onRefresh();
                } else {
                  addDemoItem("files", {
                    id: `local-file-${Date.now()}`,
                    file_name: file.name,
                    mime_type: file.type || null,
                    size_bytes: file.size,
                    project_id: projectId || null,
                    created_at: new Date().toISOString()
                  });
                  onMessage("Preview: file recorded locally.");
                }
                e.currentTarget.reset();
              } catch (err) {
                onMessage(err instanceof Error ? err.message : "Upload failed.");
              }
            });
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Files</p>
          <p className="text-xs text-white/45">Uploads stay on the API host ({live ? "live" : "preview"}).</p>
          <select name="file_project_id" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Project (optional)</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="user_file" type="file" className="w-full text-xs text-white/60 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
          <button
            type="submit"
            disabled={props.pending}
            className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Upload
          </button>
          <div className="space-y-1 border-t border-white/5 pt-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Recent</p>
            {data.files.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 text-[11px] text-white/50">
                <span className="truncate">{f.file_name}</span>
                {live ? (
                  <button
                    type="button"
                    disabled={props.pending}
                    className="shrink-0 text-cyan-200/80 hover:text-cyan-100"
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          const blob = await downloadUserFileBlob(f.id);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = f.file_name;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          onMessage("Download failed.");
                        }
                      });
                    }}
                  >
                    Get
                  </button>
                ) : null}
              </div>
            ))}
            {data.files.length === 0 && <p className="text-[11px] text-white/30">No files yet.</p>}
          </div>
        </form>

        <form
          className="glass-panel space-y-3 rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const projectId = String(fd.get("gh_project_id") ?? "");
            if (!projectId) {
              onMessage("Select a m.OS project for these repos.");
              return;
            }
            const token = String(fd.get("gh_token") ?? "").trim();
            const storeToken = fd.get("gh_store") === "on";
            const credentialId = String(fd.get("gh_credential_id") ?? "").trim();
            const project = data.projects.find((p) => p.id === projectId);
            startTransition(async () => {
              try {
                if (live) {
                  const result = await importGithubRepos({
                    project_id: projectId,
                    token: token || undefined,
                    credential_id: credentialId || undefined,
                    store_token: storeToken
                  });
                  onMessage(
                    `GitHub: added ${result.imported} repo link(s), skipped ${result.skipped} duplicate(s).`
                  );
                  onRefresh();
                } else {
                  addDemoItem("projectLinks", {
                    id: `local-gh-${Date.now()}-1`,
                    project_id: projectId,
                    project_name: project?.name,
                    link_type: "repo",
                    link_label: "sample-repo",
                    link_value: "https://github.com/example/sample-repo"
                  });
                  addDemoItem("projectLinks", {
                    id: `local-gh-${Date.now()}-2`,
                    project_id: projectId,
                    project_name: project?.name,
                    link_type: "repo",
                    link_label: "demo-ui",
                    link_value: "https://github.com/example/demo-ui"
                  });
                  addDemoItem("platformConnections", {
                    id: `local-gh-conn-${Date.now()}`,
                    project_id: projectId,
                    project_name: project?.name,
                    provider: "github",
                    label: "GitHub",
                    base_url: "https://github.com",
                    status: "connected"
                  });
                  onMessage("Preview: sample GitHub links added (no network).");
                }
                e.currentTarget.reset();
              } catch (err) {
                onMessage(err instanceof Error ? err.message : "GitHub import failed.");
              }
            });
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">GitHub</p>
          <p className="text-xs text-white/45">Import your repos as project links. Fine-grained PAT: repo read.</p>
          <select name="gh_project_id" required className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white">
            <option value="">Project *</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {githubCreds.length > 0 && (
            <select name="gh_credential_id" className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white" defaultValue="">
              <option value="">Use saved github_pat (optional)</option>
              {githubCreds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <input
            name="gh_token"
            type="password"
            autoComplete="off"
            placeholder="PAT, or use saved credential / server GITHUB_TOKEN"
            className="command-input w-full rounded-2xl px-3 py-2 text-sm text-white"
          />
          <label className="flex items-center gap-2 text-xs text-white/50">
            <input name="gh_store" type="checkbox" className="rounded border-white/20" />
            Store PAT as credential (github_pat)
          </label>
          <button
            type="submit"
            disabled={props.pending}
            className="w-full rounded-2xl bg-cyan-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Import GitHub repos
          </button>
        </form>
      </div>
    </div>
  );
}

function OperationsDeck({ data }: { data: CommandCenterData }) {
  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <OpsPanel
        title="Connector Matrix"
        icon={SquareStack}
        items={data.platformConnections.map((connection) => ({
          id: connection.id,
          title: connection.label,
          meta: `${connection.provider} - ${connection.status}`,
          detail: connection.project_name ?? connection.base_url ?? "manual"
        }))}
      />
      <OpsPanel
        title="Environments"
        icon={Cloud}
        items={data.environments.map((environment) => ({
          id: environment.id,
          title: environment.name,
          meta: `${environment.runtime ?? "runtime"} - ${environment.status}`,
          detail: environment.project_name ?? environment.url ?? "unlinked"
        }))}
      />
      <OpsPanel
        title="Deployment Footage"
        icon={Activity}
        items={data.deploymentNotes.map((note) => ({
          id: note.id,
          title: note.title,
          meta: `${note.status}${note.version_ref ? ` - ${note.version_ref}` : ""}`,
          detail: note.project_name ?? note.summary ?? "recorded"
        }))}
      />
    </section>
  );
}

function OpsPanel({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: Array<{ id: string; title: string; meta: string; detail: string }> }) {
  return (
    <div className="glass-panel relative min-h-80 overflow-hidden rounded-[2.5rem] p-5">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-300/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-black/10">
        <div className="ml-5 mt-4 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-200/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/50" />
        </div>
      </div>
      <div className="mt-12 flex items-center gap-3">
        <Icon className="h-5 w-5 text-violet-200" />
        <h3 className="font-display text-3xl">{title}</h3>
      </div>
      <div className="mt-6 space-y-3">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-white/90">{item.title}</div>
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                {item.meta}
              </span>
            </div>
            <div className="mt-2 line-clamp-2 text-sm leading-6 text-white/42">{item.detail}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
            Nothing connected yet.
          </div>
        )}
      </div>
    </div>
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
  const [actionQ, setActionQ] = useState("");
  const [resourceQ, setResourceQ] = useState("");
  const filtered = useMemo(() => {
    const a = actionQ.trim().toLowerCase();
    const r = resourceQ.trim().toLowerCase();
    return events.filter((e) => {
      if (a && !e.action.toLowerCase().includes(a)) {
        return false;
      }
      if (r && !e.resource_type.toLowerCase().includes(r)) {
        return false;
      }
      return true;
    });
  }, [events, actionQ, resourceQ]);
  const visibleEvents = filtered.slice(0, 12);
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
      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-violet-200" />
          <h3 className="font-display text-3xl">System Footage</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={actionQ}
            onChange={(e) => setActionQ(e.target.value)}
            placeholder="Filter action"
            className="command-input min-w-[8rem] rounded-xl px-3 py-2 text-xs text-white"
          />
          <input
            value={resourceQ}
            onChange={(e) => setResourceQ(e.target.value)}
            placeholder="Resource type"
            className="command-input min-w-[8rem] rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>
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
              {item.resource_type}
              {item.resource_id ? ` · ${item.resource_id}` : ""} - {formatTimestamp(item.created_at)}
            </div>
          </div>
        ))}
        {visibleEvents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
            {events.length === 0 ? "No footage recorded yet." : "No events match these filters."}
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
