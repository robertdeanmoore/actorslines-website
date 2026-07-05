// Knowledge-base loader: every .md file in src/content/kb/ becomes an article.
// Front-matter (between --- lines) supplies title/summary/date; the rest is the
// markdown body. Adding an article = adding a file and pushing (see SETUP.md).

export interface KbArticle {
  slug: string;
  title: string;
  summary: string;
  date: string;
  body: string;
}

const raw = import.meta.glob("../content/kb/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseFrontMatter(text: string): { meta: Record<string, string>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

export const kbArticles: KbArticle[] = Object.entries(raw)
  .map(([path, text]) => {
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    const { meta, body } = parseFrontMatter(text);
    return {
      slug,
      title: meta.title ?? slug,
      summary: meta.summary ?? "",
      date: meta.date ?? "",
      body,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export function kbArticle(slug: string): KbArticle | undefined {
  return kbArticles.find((a) => a.slug === slug);
}
