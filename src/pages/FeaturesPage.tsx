import { Link } from "react-router-dom";
import MarketingHead from "../components/marketing/MarketingHead";
import Card from "../components/ui/Card";

export default function FeaturesPage() {
  return (
    <div className="al-mkt">
      <MarketingHead
        title="What Actors Lines does"
        lead="A line-learning app for actors on Android. Bring your script, practise your part, and let the app read everyone else."
      />
      <div className="al-mkt-stack">
        <Card
          as="section"
          tone="marketing"
          headingLevel={2}
          title="Scan or import your script"
        >
          <p>
            Scan a paper script with your phone camera, or import a PDF. Actors Lines builds your
            scenes, characters and lines from it, and you check the result before it is saved.
          </p>
          <ul className="al-mkt-list">
            <li>Handles one page per scan or two pages per sheet (an A5 booklet opened flat).</li>
            <li>Fix any line the scanner misread, and teach the app your script&apos;s layout.</li>
            <li>On some phones an optional AI check helps with uncertain lines (experimental).</li>
          </ul>
        </Card>

        <Card
          as="section"
          tone="marketing"
          headingLevel={2}
          title="Hide and reveal your lines"
        >
          <p>
            Choose how much you see. Hide whole lines, or show only the first word, the first
            letters or random words. Practise just your own lines, or from cue to cue. Drill one
            section or one speech on a loop.
          </p>
          <ul className="al-mkt-list">
            <li>You set how much is hidden, and it can differ from line to line.</li>
            <li>A running count shows how many of your lines are hidden.</li>
          </ul>
        </Card>

        <Card as="section" tone="marketing" headingLevel={2} title="Hear the other parts">
          <p>
            Every other character is read aloud, each in their own voice, while you play yours.
            Fill-in Teach pauses on your lines so you can say them.
          </p>
          <ul className="al-mkt-list">
            <li>
              Ten natural voices ship with the app, four of them British. Download the voice pack
              once; until then the app uses your phone&apos;s own voice.
            </li>
            <li>
              Blend voices to make your own, or record the other parts yourself (see{" "}
              <a href="#selftape">Selftape</a>).
            </li>
          </ul>
        </Card>

        <Card as="section" tone="marketing" headingLevel={2} title="See how each line went">
          <p>
            Say a line and the app listens and scores it. A heat-map shows which lines and scenes
            you know and which need more work, and the words you keep missing are highlighted.
          </p>
          <ul className="al-mkt-list">
            <li>Score a whole speech in one continuous take with a live accuracy readout.</li>
            <li>
              Speech may be processed by your phone&apos;s speech service, which on some phones is
              Google&apos;s (see our <Link to="/privacy">privacy policy</Link>).
            </li>
          </ul>
        </Card>

        <Card as="section" tone="marketing" headingLevel={2} title="Built for theatre">
          <p>
            Entrances and exits are marked with arrows, sound cues play between lines, and lighting
            cues are shown silently so you know when they fall. Jump to your next line, entrance or
            exit. Keep the printed page together with page breaks. Add notes against any line, as
            you would in pencil.
          </p>
        </Card>

        <div id="selftape">
          <Card as="section" tone="marketing" headingLevel={2} title="Selftape">
            <p>
              Prefer a real voice to a synthetic one? Record your scene partners (or friends)
              reading their lines and run the scene with those recordings.
            </p>
          </Card>
        </div>

        <Card as="section" tone="marketing" headingLevel={2} title="Your plays are yours">
          <p>
            In the app, your scripts are stored on your phone and are not uploaded to us. Back up a
            play and share it with other cast members, or export it. Android backup, if you have it
            on, copies your plays to your own Google account.
          </p>
        </Card>

        <Card
          as="section"
          tone="marketing"
          headingLevel={2}
          title="Learn Lines on the website"
        >
          <p>
            Members can also upload a script to the Learn Lines page on this site and practise in
            the browser. Scripts uploaded there are stored on our server, and can be shared with
            other members.
          </p>
          <p className="al-mkt-note">Accounts are by invitation at present.</p>
        </Card>
      </div>
    </div>
  );
}
