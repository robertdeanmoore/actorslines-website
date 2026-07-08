import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const features = [
  ["Import any script", "Scan a paper script with your camera or import a PDF — Actors Lines reads it on your device and builds your scenes, characters and lines automatically."],
  ["Rehearse with a full cast", "Synthesised voices (or your own recordings) speak every other character's lines while you play your part. Your lines stay hidden until you say them."],
  ["Practice that adapts", "Read along, hide lines as you learn them, run cue-to-cue, loop tricky sections, and get accuracy scores on every line via on-device speech recognition."],
  ["Selftape mode", "Record cue lines in your own voice for self-tapes and rehearsal runs — no internet needed, nothing leaves your phone."],
  ["Track your progress", "Accuracy heat-maps show exactly which lines and scenes need work, scene by scene, run by run."],
  ["Private by design", "Everything happens on your device. Your scripts are your business."],
] as const;

export default function LandingPage() {
  const { session } = useAuth();
  return (
    <div className="space-y-16">
      <section className="text-center pt-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-brand">
          Learn your lines. Your way.
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Actors Lines is the on-device rehearsal companion for actors — from a
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
          Registered members get our rehearsal-craft knowledge base and a direct
          line to development: suggest enhancements, vote on other actors' ideas,
          and watch the best ones get built.
        </p>
      </section>
    </div>
  );
}
