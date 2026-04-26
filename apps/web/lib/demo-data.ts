import type { AuditEvent, Credential, DeploymentNote, DiaryEntry, KnowledgeItem, PlatformConnection, Playground, Project, ProjectEnvironment, ProjectLink, Todo, UserFileRecord } from "./api";

export const demoData: {
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
} = {
  projects: [
    {
      id: "demo-project-1",
      name: "noteos.in rebuild",
      description: "Fresh Personal LLM OS with vault, diary, project graph, and assistant.",
      platform: "Hostinger + Azure Ollama",
      status: "active"
    },
    {
      id: "demo-project-2",
      name: "Azure Ollama runtime",
      description: "Quality-first local model host for Gemma/Qwen routing.",
      platform: "Azure",
      status: "active"
    },
    {
      id: "demo-project-3",
      name: "Supabase knowledge vault",
      description: "Relational graph, audit events, vector search, encrypted secrets.",
      platform: "Postgres + pgvector",
      status: "design"
    }
  ],
  notes: [
    {
      id: "demo-note-1",
      kind: "idea",
      title: "Life graph assistant",
      content: "Every idea, repo, account, credential, and goal should connect to projects and timelines."
    },
    {
      id: "demo-note-2",
      kind: "business",
      title: "Business cockpit",
      content: "Track experiments, domains, funnels, customers, expenses, decisions, and founder notes."
    }
  ],
  diary: [
    {
      id: "demo-diary-1",
      title: "Today",
      content: "Build the foundation, make it beautiful, then connect models and platforms.",
      mood: "focused"
    }
  ],
  todos: [
    {
      id: "demo-todo-1",
      title: "Deploy staging subdomain",
      detail: "Run API and web behind HTTPS before replacing current noteos.in.",
      status: "pending",
      priority: "high"
    },
    {
      id: "demo-todo-2",
      title: "Connect Azure Ollama",
      detail: "Point gateway to Azure base URL and test coding/deep reasoning routes.",
      status: "in_progress",
      priority: "high"
    }
  ],
  credentials: [
    {
      id: "demo-cred-1",
      label: "GitHub automation token",
      kind: "api_key",
      secret_preview: "********"
    },
    {
      id: "demo-cred-2",
      label: "Supabase project URL",
      kind: "database",
      secret_preview: "********"
    }
  ],
  audit: [
    {
      id: "demo-audit-1",
      action: "assistant.chat",
      resource_type: "assistant_session",
      created_at: new Date().toISOString()
    },
    {
      id: "demo-audit-2",
      action: "credential.create",
      resource_type: "credential",
      created_at: new Date().toISOString()
    }
  ],
  projectLinks: [
    {
      id: "demo-link-1",
      project_id: "demo-project-1",
      project_name: "noteos.in rebuild",
      link_type: "repo",
      link_label: "GitHub repo",
      link_value: "https://github.com/hy4k/m.os"
    },
    {
      id: "demo-link-2",
      project_id: "demo-project-2",
      project_name: "Azure Ollama runtime",
      link_type: "deployment",
      link_label: "Ollama endpoint",
      link_value: "Azure VM :11434"
    }
  ],
  playgrounds: [
    {
      id: "demo-playground-1",
      project_id: "demo-project-1",
      project_name: "noteos.in rebuild",
      title: "m.OS product cockpit",
      brief: "Turn the beautiful shell into a working personal command system.",
      stage: "prototype",
      current_focus: "Project intelligence, platform links, playgrounds",
      next_actions: ["Connect database", "Verify Azure Ollama", "Add connector sync"]
    }
  ],
  platformConnections: [
    {
      id: "demo-connection-1",
      project_id: "demo-project-1",
      project_name: "noteos.in rebuild",
      provider: "github",
      label: "m.OS repository",
      base_url: "https://github.com/hy4k/m.os",
      status: "connected"
    },
    {
      id: "demo-connection-2",
      project_id: "demo-project-2",
      project_name: "Azure Ollama runtime",
      provider: "azure",
      label: "Ollama VM",
      base_url: "http://azure-ollama:11434",
      status: "manual"
    }
  ],
  environments: [
    {
      id: "demo-env-1",
      project_id: "demo-project-1",
      project_name: "noteos.in rebuild",
      name: "staging",
      url: "http://localhost:57666",
      runtime: "Next.js",
      region: "Hostinger",
      status: "healthy"
    }
  ],
  deploymentNotes: [
    {
      id: "demo-deploy-1",
      project_id: "demo-project-1",
      project_name: "noteos.in rebuild",
      environment_name: "staging",
      title: "Preview server online",
      summary: "m.OS UI is reviewable through the forwarded local port.",
      status: "succeeded",
      version_ref: "local-main"
    }
  ],
  files: []
};
