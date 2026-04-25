import { query } from "./db.js";

/**
 * Assembles a single text block for the assistant: projects, links, ops, knowledge, todos.
 * No credential secrets are included.
 */
export async function buildAssistantContext(userId: string): Promise<string> {
  const [projects, links, conns, envs, deploys, todos, knowledge] = await Promise.all([
    query<{ name: string; status: string; platform: string | null; description: string | null }>(
      `select name, status, platform, description from projects where user_id = $1 order by updated_at desc limit 20`,
      [userId]
    ),
    query<{ link_type: string; link_label: string | null; link_value: string; project_name: string }>(
      `select pl.link_type, pl.link_label, pl.link_value, p.name as project_name
       from project_links pl
       join projects p on p.id = pl.project_id
       where pl.user_id = $1
       order by pl.created_at desc
       limit 30`,
      [userId]
    ),
    query<{ label: string; provider: string; base_url: string | null; status: string; project_name: string | null }>(
      `select pc.label, pc.provider, pc.base_url, pc.status, p.name as project_name
       from platform_connections pc
       left join projects p on p.id = pc.project_id
       where pc.user_id = $1
       order by pc.updated_at desc
       limit 20`,
      [userId]
    ),
    query<{ name: string; url: string | null; status: string; runtime: string | null; project_name: string }>(
      `select pe.name, pe.url, pe.status, pe.runtime, p.name as project_name
       from project_environments pe
       join projects p on p.id = pe.project_id
       where pe.user_id = $1
       order by pe.updated_at desc
       limit 20`,
      [userId]
    ),
    query<{ title: string; summary: string | null; status: string; project_name: string | null }>(
      `select dn.title, dn.summary, dn.status, p.name as project_name
       from deployment_notes dn
       left join projects p on p.id = dn.project_id
       where dn.user_id = $1
       order by dn.created_at desc
       limit 12`,
      [userId]
    ),
    query<{ title: string; status: string; priority: string; detail: string | null }>(
      `select title, status, priority, detail from todos where user_id = $1 order by created_at desc limit 20`,
      [userId]
    ),
    query<{ kind: string; title: string; content: string }>(
      `select kind, title, content from knowledge_items
       where user_id = $1
       order by updated_at desc
       limit 12`,
      [userId]
    )
  ]);

  const parts: string[] = [];

  if (projects.length) {
    parts.push(
      "## Projects\n" +
        projects
          .map(
            (p) =>
              `- ${p.name} (${p.status})${p.platform ? ` [${p.platform}]` : ""}${p.description ? `: ${p.description}` : ""}`
          )
          .join("\n")
    );
  }

  if (links.length) {
    parts.push(
      "## Project links (repos, deployments, etc.)\n" +
        links
          .map((l) => `- [${l.project_name}] ${l.link_type} ${l.link_label ? `${l.link_label} ` : ""}→ ${l.link_value}`)
          .join("\n")
    );
  }

  if (conns.length) {
    parts.push(
      "## Platform connections\n" +
        conns
          .map(
            (c) =>
              `- ${c.label} (${c.provider}) ${c.status}${c.project_name ? ` [${c.project_name}]` : ""}${c.base_url ? ` ${c.base_url}` : ""}`
          )
          .join("\n")
    );
  }

  if (envs.length) {
    parts.push(
      "## Environments\n" +
        envs
          .map(
            (e) => `- [${e.project_name}] ${e.name} ${e.status}${e.url ? ` ${e.url}` : ""}${e.runtime ? ` (${e.runtime})` : ""}`
          )
          .join("\n")
    );
  }

  if (deploys.length) {
    parts.push(
      "## Recent deployments / releases (notes)\n" +
        deploys
          .map((d) => `- [${d.project_name ?? "unscoped"}] ${d.title} (${d.status})${d.summary ? `: ${d.summary}` : ""}`)
          .join("\n")
    );
  }

  if (todos.length) {
    parts.push(
      "## Todos\n" + todos.map((t) => `- [${t.status}/${t.priority}] ${t.title}${t.detail ? `: ${t.detail}` : ""}`).join("\n")
    );
  }

  if (knowledge.length) {
    parts.push(
      "## Notes & knowledge\n" +
        knowledge.map((k) => `### ${k.kind}: ${k.title}\n${k.content}`).join("\n\n")
    );
  }

  if (parts.length === 0) {
    return "No project data yet. Suggest creating a project, linking a repository, or capturing notes.";
  }

  return parts.join("\n\n");
}
