import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown, { type ExtraProps } from "react-markdown";
import { kbArticle } from "../../lib/kb";
import { youTubeId } from "../../components/YouTubeEmbed";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Callout from "../../components/ui/Callout";
import VideoCard, { VIDEO_PRIVACY_NOTE } from "../../components/ui/VideoCard";

const CALLOUT_LEAD = /^(Tip|Note):$/;

/**
 * If the paragraph is a bare YouTube link (react-markdown renders it as <p><a href=…>same text</a></p>),
 * return the video id, else null.
 */
function bareYouTubeIdFromParagraph(node: ExtraProps["node"]): string | null {
  const children = node?.children;
  if (!children || children.length !== 1) return null;
  const child = children[0];
  if (child.type !== "element" || child.tagName !== "a") return null;
  const href = child.properties?.href;
  if (typeof href !== "string") return null;
  if (child.children.length !== 1 || child.children[0].type !== "text") return null;
  if (child.children[0].value !== href) return null;
  return youTubeId(href) || null;
}

/**
 * A blockquote that opens with a bold "Tip:" or "Note:" (how the KB articles mark asides) becomes a
 * Callout; the bold lead-in is dropped because the Callout title says it. Any other blockquote stays one.
 */
function asCallout(children: ReactNode): ReactNode | null {
  const items = Children.toArray(children);
  const firstIdx = items.findIndex((c) => isValidElement(c));
  if (firstIdx < 0) return null;
  const para = items[firstIdx] as ReactElement<{ children?: ReactNode }>;
  const inner = Children.toArray(para.props.children);
  const lead = inner[0];
  if (!isValidElement(lead)) return null;
  const leadText = Children.toArray((lead as ReactElement<{ children?: ReactNode }>).props.children).join("");
  const m = CALLOUT_LEAD.exec(leadText);
  if (!m) return null;
  const rest = [cloneElement(para, undefined, ...inner.slice(1)), ...items.slice(firstIdx + 1)];
  return (
    <Callout tone={m[1] === "Tip" ? "tip" : "note"} title={m[1]}>
      {rest}
    </Callout>
  );
}

export default function KbArticlePage() {
  const { slug } = useParams();
  const article = slug ? kbArticle(slug) : undefined;
  const night = isNightTheme();

  if (!article && night) {
    return (
      <Container size="prose" className="al-doc">
        <p className="al-page-intro">That article couldn't be found.</p>
        <Link to="/kb" className="al-doc__back">Back to the knowledge base</Link>
      </Container>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-gray-600">That article couldn't be found.</p>
        <Link to="/kb" className="text-brand hover:underline text-sm">Back to the knowledge base</Link>
      </div>
    );
  }

  if (night) {
    const hasVideo = (article.body.match(/https?:\/\/[^\s)>\]]+/g) ?? []).some((u) => youTubeId(u));
    return (
      <Container size="prose" as="article" className="al-doc">
        <Link to="/kb" className="al-doc__back">← Knowledge base</Link>
        <h1 className="al-page-title mt-2">{article.title}</h1>
        {article.date && <p className="al-prose__meta">{article.date}</p>}
        <div className="al-prose mt-6">
          <Markdown
            components={{
              // A bare YouTube link on its own line becomes a click-to-play video card (nothing is
              // requested from YouTube until the viewer presses play).
              p: ({ node, children }) => {
                const id = bareYouTubeIdFromParagraph(node);
                if (id) return <VideoCard videoId={id} title={article.title} headingLevel={2} />;
                return <p>{children}</p>;
              },
              a: ({ href, children }) => {
                const kbSlug = href ? /^\.?\/?([\w-]+)\.md$/.exec(href)?.[1] : null;
                if (kbSlug) return <Link to={`/kb/${kbSlug}`}>{children}</Link>;

                return (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                    <span className="al-sr-only"> (opens in a new tab)</span>
                  </a>
                );
              },
              blockquote: ({ children }) => asCallout(children) ?? <blockquote>{children}</blockquote>,
            }}
          >
            {article.body}
          </Markdown>
          {hasVideo && <p className="al-prose__meta">{VIDEO_PRIVACY_NOTE}</p>}
        </div>
      </Container>
    );
  }

  return (
    <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <Link to="/kb" className="text-sm text-brand hover:underline">← Knowledge base</Link>
      <h1 className="mt-2 text-2xl font-bold text-brand">{article.title}</h1>
      {article.date && <p className="mt-1 text-xs text-gray-400">{article.date}</p>}
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-gray-800
        [&_h2:not(.al-video__title)]:text-lg [&_h2:not(.al-video__title)]:font-semibold [&_h2:not(.al-video__title)]:text-brand [&_h2:not(.al-video__title)]:mt-6
        [&_h3]:font-semibold [&_h3]:mt-4
        [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5
        [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic
        [&_img]:max-w-full [&_img]:rounded-lg">
        <Markdown
          components={{
            // A bare YouTube link on its own line becomes a click-to-play video card (nothing is
            // requested from YouTube until the viewer presses play).
            p: ({ node, children }) => {
              const id = bareYouTubeIdFromParagraph(node);
              if (id) return <VideoCard videoId={id} title={article.title} headingLevel={2} />;
              return <p>{children}</p>;
            },
            a: ({ href, children }) => {
              // A relative "<slug>.md" link (how one KB article refers to another in its own
              // "Related" section) resolves against the browser's current URL, not the kb
              // route table — always 404s. Route it through /kb/<slug> instead.
              const kbSlug = href ? /^\.?\/?([\w-]+)\.md$/.exec(href)?.[1] : null;
              if (kbSlug) {
                return (
                  <Link to={`/kb/${kbSlug}`} className="text-brand hover:underline">
                    {children}
                  </Link>
                );
              }

              return (
                <a href={href} target="_blank" rel="noreferrer"
                  className="text-brand hover:underline">{children}</a>
              );
            },
          }}
        >
          {article.body}
        </Markdown>
      </div>
    </article>
  );
}
