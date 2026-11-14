import { Link } from "react-router-dom";
import MarketingHead from "../components/marketing/MarketingHead";
import { Accordion, AccordionItem } from "../components/ui/Accordion";

const SUPPORT_EMAIL = "hello@actorslines.app";

export default function FaqPage() {
  return (
    <div className="al-mkt">
      <MarketingHead title="Frequently asked questions" />

      <section className="al-mkt-group" aria-labelledby="al-faq-getting">
        <h2 id="al-faq-getting">Getting it</h2>
        <Accordion>
          <AccordionItem summary="What is Actors Lines?">
            <p>
              A line-learning app for actors. You scan or import your script, then hide and reveal
              your lines, hear the other parts read aloud and see how each line went. It is made by
              You Never Know Productions.
            </p>
          </AccordionItem>
          <AccordionItem summary="Which phones does it run on?">
            <p>
              Android. There is no iPhone version, and nothing is promised. If you want a one-off
              email if that changes, use the iPhone notify form on the{" "}
              <Link to="/">home page</Link>.
            </p>
          </AccordionItem>
          <AccordionItem summary="How do I get the app?">
            {/* [CTA pending] interim wording until the notify CTA decision */}
            <p>
              Actors Lines is not on Google Play yet. Email{" "}
              <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a> and I will let you know.
            </p>
          </AccordionItem>
          <AccordionItem summary="How do I get an account?">
            <p>
              Accounts are by invitation for now, and sign-up is closed. If you would like an
              invitation, email <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>.
            </p>
          </AccordionItem>
          <AccordionItem summary="I forgot my password.">
            <p>
              Use &quot;Forgot password&quot; on the sign-in page. We email you a reset link.
            </p>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-faq-using">
        <h2 id="al-faq-using">Using it</h2>
        <Accordion>
          <AccordionItem summary="How do I get my script in?">
            <p>
              Open the app, tap Import, then scan the pages with your camera or choose a PDF. A PDF
              usually works best, especially for a whole play. Check the result and fix any line the
              scanner misread before you save.
            </p>
          </AccordionItem>
          <AccordionItem summary="Does it work with any script?">
            <p>
              It reads most plain scripts and booklets, but print and scan quality vary, so always
              check the import. You can also teach it your script&apos;s layout.
            </p>
          </AccordionItem>
          <AccordionItem summary="Who reads the other characters?">
            <p>
              The app does, in natural voices, one per character. Download the voice pack once;
              until then it uses your phone&apos;s own voice. Or record the parts yourself in
              Selftape.
            </p>
          </AccordionItem>
          <AccordionItem summary="Does it listen to me?">
            <p>
              Yes. Say a line and it scores your accuracy, and a heat-map shows where you need more
              work. Your phone&apos;s speech service does the listening and, depending on your
              phone, that may be Google&apos;s. We do not receive your speech.
            </p>
          </AccordionItem>
          <AccordionItem summary="Does it need the internet?">
            <p>
              Some things do: signing in, downloading voices and speech models, checking for
              updates, and your phone&apos;s speech service on some phones. I have not tested and do
              not promise a fully offline mode.
            </p>
          </AccordionItem>
          <AccordionItem summary="Can I use the website instead?">
            <p>
              Members can upload a script to Learn Lines on this site and practise in the browser.
              It is a lighter version of the app&apos;s Practice screen.
            </p>
          </AccordionItem>
          <AccordionItem summary="How do I suggest a feature?">
            <p>
              Signed-in members can use the &quot;Suggest an enhancement&quot; form or vote on the
              enhancement board. See Support.
            </p>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-faq-data">
        <h2 id="al-faq-data">Your data</h2>
        <Accordion>
          <AccordionItem summary="Where are my scripts kept?">
            <p>
              In the app, on your phone: they are not uploaded to us. On the website, scripts you
              put into Learn Lines are stored on our server so you can use them there, and you can
              share them with other members. Our <Link to="/privacy">privacy policy</Link> has the
              details.
            </p>
          </AccordionItem>
          <AccordionItem summary="Does Google see my scripts?">
            <p>
              We do not send your scripts to Google. But the scanner library the app uses (Google ML
              Kit) sends Google some device information, such as app version and error data, and
              Android backup, if you turn it on, saves your plays to your own Google account.
            </p>
          </AccordionItem>
          <AccordionItem summary="Can I back up or move my plays?">
            <p>
              Yes. Back up or export a play from the app and restore or share it on another phone.
            </p>
          </AccordionItem>
          <AccordionItem summary="Do you track me?">
            <p>
              This website sets no advertising or analytics cookies. In the app, anonymous usage
              data is off unless you turn it on in Settings.
            </p>
          </AccordionItem>
          <AccordionItem summary="What happens to my suggestions?">
            <p>
              Suggestions are processed by an AI service (Anthropic) to help me analyse them, and
              may be compared with other members&apos; suggestions. They do not oblige us to build
              anything. See the <Link to="/privacy">privacy policy</Link>.
            </p>
          </AccordionItem>
          <AccordionItem summary="Can I delete my account?">
            <p>
              Yes. Use Delete account on your Profile page. It deletes your account and its data.
              Accounts unused for 6 months are deleted too, after we email you a warning.
            </p>
          </AccordionItem>
          <AccordionItem summary="Is it for children?">
            <p>No. Actors Lines is for adults, aged 18 and over.</p>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-faq-help">
        <h2 id="al-faq-help">Help</h2>
        <Accordion>
          <AccordionItem summary="Who do I contact?">
            <p>
              Email <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>. We aim to reply within
              3 working days.
            </p>
          </AccordionItem>
          <AccordionItem summary="Who makes Actors Lines?">
            <p>Robert Dean Moore, trading as You Never Know Productions, Hadleigh, Essex.</p>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
