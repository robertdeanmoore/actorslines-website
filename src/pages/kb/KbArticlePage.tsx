import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { kbArticle } from "../../lib/kb";
import YouTubeEmbed, { youTubeId } from "../../components/YouTubeEmbed";

export default function KbArticlePage() {
  const { slug } = useParams();
  const article = slug ? kbArticle(slug) : undefined;

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-gray-600">That article couldn't be found.</p>
        <Link to="/kb" className="text-brand hover:underline text-sm">Back to the knowledge base</Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <Link to="/kb" className="text-sm text-brand hover:underline">← Knowledge base</Link>
      <h1 className="mt-2 text-2xl font-bold text-brand">{article.title}</h1>
      {article.date && <p className="mt-1 text-xs text-gray-400">{article.date}</p>}
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-gray-800
        [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand [&_h2]:mt-6
        [&_h3]:font-semibold [&_h3]:mt-4
        [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5
        [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic
        [&_img]:max-w-full [&_img]:rounded-lg">
        <Markdown
          components={{
            // A bare YouTube link on its own line becomes an embedded player.
            a: ({ href, children }) => {
              const id = href ? youTubeId(href) : null;
              const isBare =
                Array.isArray(children) ? children.join("") === href : children === href;
              if (id && isBare) return <YouTubeEmbed id={id} title={article.title} />;
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
