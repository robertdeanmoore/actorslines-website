import { useEffect } from "react";
import { Link } from "react-router-dom";
import LiteYouTube, { isValidVideoId, VIDEO_PRIVACY_NOTE } from "../components/tutorials/LiteYouTube";
import { TUTORIALS, type Tutorial } from "../content/tutorials";
import "../styles/tutorials.css";

const videos = TUTORIALS.filter((t) => isValidVideoId(t.videoId));

type Group = { title: string; videos: Tutorial[] };

/** Groups by category in order of first appearance; uncategorised videos go last. */
function groupByCategory(list: readonly Tutorial[]): Group[] {
  const groups: Group[] = [];
  const byTitle = new Map<string, Tutorial[]>();
  const uncategorised: Tutorial[] = [];
  for (const video of list) {
    if (video.category) {
      const bucket = byTitle.get(video.category);
      if (bucket) bucket.push(video);
      else byTitle.set(video.category, [video]);
    } else {
      uncategorised.push(video);
    }
  }
  for (const [title, items] of byTitle) groups.push({ title, videos: items });
  if (uncategorised.length > 0) groups.push({ title: "More videos", videos: uncategorised });
  return groups;
}

export default function TutorialsPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Tutorials | Actors Lines";
    let meta: HTMLMetaElement | null = null;
    if (videos.length === 0) {
      meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex";
      document.head.appendChild(meta);
    }
    return () => {
      document.title = previousTitle;
      if (meta) document.head.removeChild(meta);
    };
  }, []);

  const hasCategories = videos.some((t) => t.category);

  return (
    <div className="al-tut">
      <h1>Tutorials</h1>
      {/* PLACEHOLDER wording: Clarity to approve */}
      <p className="al-tut-lead">Short videos that show how to use Actors Lines.</p>
      {videos.length === 0 ? (
        <section className="al-tut-empty" aria-labelledby="al-tut-empty-heading">
          <h2 id="al-tut-empty-heading">Videos coming soon</h2>
          <p>
            We are making short tutorial videos. In the meantime the help articles cover the
            same ground.
          </p>
          <div className="al-tut-empty__actions">
            <Link to="/kb" className="al-btn al-btn--secondary">
              Browse help
            </Link>
          </div>
        </section>
      ) : (
        <>
          <p className="al-tut-note">{VIDEO_PRIVACY_NOTE}</p>
          {hasCategories ? (
            groupByCategory(videos).map((group, index) => {
              const headingId = `al-tut-group-${index}`;
              return (
                <section key={group.title} className="al-tut-group" aria-labelledby={headingId}>
                  <h2 id={headingId}>{group.title}</h2>
                  <ul className="al-tut-grid" role="list">
                    {group.videos.map((t) => (
                      <li key={t.id} className="al-tut-item">
                        <LiteYouTube videoId={t.videoId} title={t.title} poster={t.poster} />
                        <h3 className="al-tut-title">{t.title}</h3>
                        <p className="al-tut-duration">{t.duration}</p>
                        <p className="al-tut-desc">{t.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          ) : (
            <ul className="al-tut-grid" role="list">
              {videos.map((t) => (
                <li key={t.id} className="al-tut-item">
                  <LiteYouTube videoId={t.videoId} title={t.title} poster={t.poster} />
                  <h2 className="al-tut-title">{t.title}</h2>
                  <p className="al-tut-duration">{t.duration}</p>
                  <p className="al-tut-desc">{t.description}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
