import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { supabase, supabaseConfigured } from "../lib/supabase";
import {
  BETA_CONSENT_LABEL,
  SUPPORT_EMAIL,
} from "../lib/beta";
import TurnstileWidget, { turnstileConfigured, useNightWidgetSize } from "../components/TurnstileWidget";
import Button from "../components/ui/Button";
import Callout from "../components/ui/Callout";
import { Container } from "../components/ui/Layout";
import ErrorSummary, { type FieldProblem } from "../components/ui/ErrorSummary";
import { Checkbox, Field, Input, Select, Textarea } from "../components/ui/Field";

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

const REASON_MIN = 20;
const REASON_MAX = 1000;

type Status = "received" | "already";

interface FormState {
  name: string;
  reason: string;
  email: string;
  sameGoogleEmail: boolean;
  googleEmail: string;
  town: string;
  actorType: "" | "professional" | "amateur";
  inCompany: "" | "yes" | "no";
  companyName: string;
  consent: boolean;
  website: string;
}

const INITIAL: FormState = {
  name: "",
  reason: "",
  email: "",
  sameGoogleEmail: true,
  googleEmail: "",
  town: "",
  actorType: "",
  inCompany: "",
  companyName: "",
  consent: false,
  website: "",
};

export default function BetaPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [doneStatus, setDoneStatus] = useState<Status | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const widgetSize = useNightWidgetSize();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (form.name.trim().length === 0) errs.name = "Enter your name.";
    if (form.reason.trim().length < REASON_MIN || form.reason.trim().length > REASON_MAX) {
      errs.reason = `Tell us why you would like to join, in ${REASON_MIN} to ${REASON_MAX} characters.`;
    }
    const email = form.email.trim();
    if (email.length < 6 || email.length > 254 || !EMAIL_RE.test(email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!form.sameGoogleEmail) {
      const google = form.googleEmail.trim();
      if (google.length < 6 || google.length > 254 || !EMAIL_RE.test(google)) {
        errs.googleEmail = "Enter the Google account email, or tick “Same as my email above”.";
      }
    }
    if (form.town.trim().length === 0) errs.town = "Enter your town or city.";
    if (form.actorType === "") errs.actorType = "Choose whether you are a professional or amateur actor.";
    if (form.inCompany === "") errs.inCompany = "Choose Yes or No.";
    if (form.inCompany === "yes" && form.companyName.trim().length === 0) {
      errs.companyName = "Enter your company’s name.";
    } else if (form.inCompany === "yes" && form.companyName.trim().length > 120) {
      errs.companyName = "Keep the company name to 120 characters or fewer.";
    }
    if (!form.consent) errs.consent = "Tick the box to agree, or we cannot take the application further.";
    return errs;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const errs = validate();
    setErrors(errs);
    setSubmitCount((c) => c + 1);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    const { data, error: fnErr } = await supabase.functions.invoke("beta-apply", {
      body: {
        name: form.name.trim(),
        reason: form.reason.trim(),
        email: form.email.trim(),
        same_google_email: form.sameGoogleEmail,
        google_email: (form.sameGoogleEmail ? form.email : form.googleEmail).trim(),
        town: form.town.trim(),
        actor_type: form.actorType,
        in_company: form.inCompany === "yes",
        company_name: form.inCompany === "yes" ? form.companyName.trim() : "",
        consent: true,
        turnstileToken: captchaToken,
        website: form.website,
      },
    });
    if (fnErr) {
      let msg = "Something went wrong. Please try again later.";
      const res = (fnErr as { context?: Response }).context;
      if (res && typeof res.json === "function") {
        const detail = await res.json().catch(() => null);
        if (detail?.error) msg = detail.error;
      }
      setFormError(msg);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      setBusy(false);
      return;
    }
    setDoneStatus((data as { status?: Status } | null)?.status === "already" ? "already" : "received");
    setBusy(false);
  }

  const problems: FieldProblem[] = Object.entries(errors).map(([fieldId, message]) => ({
    fieldId,
    message,
  }));

  if (doneStatus) {
    return (
      <Container size="form" className="al-members">
        <h1 className="al-page-title">Join the Actors Lines beta programme</h1>
        {doneStatus === "received" ? (
          <Callout tone="success">
            Thank you. Your application has arrived. I will email you once I have reviewed it.
            If you do not see the confirmation, check your spam folder.
          </Callout>
        ) : (
          <Callout tone="note">
            We already have your application, so there is nothing more to do. If you need to
            reach us, write to {SUPPORT_EMAIL}.
          </Callout>
        )}
      </Container>
    );
  }

  return (
    <Container size="form" className="al-members">
      <h1 className="al-page-title">Join the Actors Lines beta programme</h1>
      <p className="al-panel-text">
        The beta is for Android phones only, and places are limited. Every application is read
        and reviewed.
      </p>
      <form onSubmit={submit} noValidate>
        {problems.length > 0 && submitCount > 0 && (
          <ErrorSummary problems={problems} submitCount={submitCount} />
        )}
        <Field id="name" label="Name" required error={errors.name}>
          {(control) => (
            <Input {...control} maxLength={120} autoComplete="name"
              value={form.name} onChange={(e) => set("name", e.target.value)} />
          )}
        </Field>
        <Field
          id="reason"
          label="Why would you like to join?"
          required
          error={errors.reason}
          help={`${form.reason.trim().length} of ${REASON_MIN}–${REASON_MAX} characters`}
        >
          {(control) => (
            <Textarea {...control} rows={5} maxLength={REASON_MAX}
              value={form.reason} onChange={(e) => set("reason", e.target.value)} />
          )}
        </Field>
        <Field id="email" label="Email address (where we write to you)" required error={errors.email}>
          {(control) => (
            <Input {...control} type="email" maxLength={254} autoComplete="email"
              value={form.email} onChange={(e) => set("email", e.target.value)} />
          )}
        </Field>
        <Checkbox
          checked={form.sameGoogleEmail}
          onChange={(e) => set("sameGoogleEmail", e.target.checked)}
          label="Same as my email above"
        />
        {!form.sameGoogleEmail && (
          <Field
            id="googleEmail"
            label="Google account email on your Android phone"
            required
            error={errors.googleEmail}
            help="Gmail or a Google Workspace address; Google Play only recognises Google accounts."
          >
            {(control) => (
              <Input {...control} type="email" maxLength={254}
                value={form.googleEmail} onChange={(e) => set("googleEmail", e.target.value)} />
            )}
          </Field>
        )}
        <Field id="town" label="Town or city" required error={errors.town}>
          {(control) => (
            <Input {...control} maxLength={120} autoComplete="address-level2"
              value={form.town} onChange={(e) => set("town", e.target.value)} />
          )}
        </Field>
        <Field id="actorType" label="Are you a professional or amateur actor?" required error={errors.actorType}>
          {(control) => (
            <Select {...control} value={form.actorType}
              onChange={(e) => set("actorType", e.target.value as FormState["actorType"])}>
              <option value="">Choose…</option>
              <option value="professional">Professional</option>
              <option value="amateur">Amateur</option>
            </Select>
          )}
        </Field>
        <Field id="inCompany" label="Are you a member of a company?" required error={errors.inCompany}>
          {(control) => (
            <Select {...control} value={form.inCompany}
              onChange={(e) => set("inCompany", e.target.value as FormState["inCompany"])}>
              <option value="">Choose…</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          )}
        </Field>
        {form.inCompany === "yes" && (
          <Field id="companyName" label="Company name" required error={errors.companyName}>
            {(control) => (
              <Input {...control} maxLength={120}
                value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
            )}
          </Field>
        )}
        <Checkbox
          id="consent"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
          error={errors.consent}
          label={
            <>
              {BETA_CONSENT_LABEL} See our <Link to="/privacy">privacy policy</Link>.
            </>
          }
        />
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="beta-website">Website</label>
          <Input id="beta-website" name="website" tabIndex={-1} autoComplete="off"
            value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} theme="dark" size={widgetSize} />
        {formError && <Callout tone="error">{formError}</Callout>}
        <Button type="submit" block busy={busy}
          disabledReason={
            turnstileConfigured && !captchaToken ? "Complete the security check to continue." : undefined
          }
          disabled={
            !supabaseConfigured || (turnstileConfigured && !captchaToken)
          }>
          {busy ? "Sending…" : "Send application"}
        </Button>
      </form>
    </Container>
  );
}
