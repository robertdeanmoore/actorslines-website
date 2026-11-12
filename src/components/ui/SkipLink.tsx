/** First focusable element on every page: jumps keyboard and screen-reader users past the header. */
export default function SkipLink() {
  return (
    <a className="al-skip-link" href="#main">
      Skip to main content
    </a>
  );
}
