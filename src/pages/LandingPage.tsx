import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import NotifyIphoneSection from "../components/NotifyIphoneSection";
import DevicePlaceholder from "../components/ui/DevicePlaceholder";
import { isNightTheme } from "../lib/theme";

const features = [
  ["Import any script", "Scan a paper script with your camera or import a PDF — Actors Lines reads it on your device and builds your scenes, characters and lines automatically."],
  ["Practise with a full cast", "Synthesised voices (or your own recordings) speak every other character's lines while you play your part. Your lines stay hidden until you say them."],
  ["Practice that adapts", "Read along, hide lines as you learn them, run cue-to-cue, loop tricky sections, and get accuracy scores on every line via on-device speech recognition."],
  ["Selftape mode", "Record cue lines in your own voice for self-tapes and practice runs — no internet needed, nothing leaves your phone."],
  ["Track your progress", "Accuracy heat-maps show exactly which lines and scenes need work, scene by scene, run by run."],
  ["Private by design", "Everything happens on your device. Your scripts are your business."],
] as const;

export default function LandingPage() {
  const { session } = useAuth();
  // Production keeps the pre-redesign hero until the single release after slice 6 (Robert, WIP #257).
  const night = isNightTheme();
  return (
    <>
      {night ? (
        <section className="al-hero" aria-labelledby="hero-heading">
          <div className="al-hero__inner">
            <h1 id="hero-heading" className="al-hero__title">
              Learn your lines. <span className="al-hero__accent">Your way.</span>
            </h1>
            <p className="al-hero__lead">
              Actors Lines is the on-device line-learning companion for actors — from a
              scanned script to a word-perfect performance, with a full synthetic cast
              in your pocket.
            </p>
            <div className="al-hero__cta">
              {/* [PLACEHOLDER: Robert/Clarity per Interview Pack CTA]: label and target are not final */}
              {!session && (
                <Link to="/register" className="al-btn al-btn--primary">
                  Create account
                </Link>
              )}
              {session ? (
                <Link to="/board" className="al-btn al-btn--primary">
                  Enhancement board
                </Link>
              ) : (
                <Link to="/login" className="al-btn al-btn--secondary">
                  Sign in
                </Link>
              )}
            </div>
            {/* Placeholder panels must not reach a production page (checklist 17): night previews only. */}
            <DevicePlaceholder />
          </div>
        </section>
      ) : (
        <section className="text-center pt-16 pb-8 mx-auto w-full max-w-5xl px-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand">
            Learn your lines. Your way.
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Actors Lines is the on-device line-learning companion for actors — from a
            scanned script to a word-perfect performance, with a full synthetic cast
            in your pocket.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            {!session && (
              <Link
                to="/register"
                className="px-6 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-light"
              >
                Coming soon
              </Link>
            )}
            <Link
              to={session ? "/board" : "/login"}
              className="px-6 py-3 rounded-lg border border-brand text-brand font-semibold hover:bg-gray-100"
            >
              {session ? "Enhancement board" : "Sign in"}
            </Link>
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-16">
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, body]) => (
            <div key={title} className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-brand">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-brand">Help shape Actors Lines</h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Registered members get our line-learning knowledge base and a direct
            line to development: suggest enhancements, vote on other actors' ideas,
            and watch the best ones get built.
          </p>
        </section>

        <NotifyIphoneSection />
      </div>
    </>
  );
}
