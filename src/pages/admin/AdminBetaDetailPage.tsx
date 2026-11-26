import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  BETA_STATUS_LABELS,
  isGmailDomain,
  type BetaApplication,
} from "../../lib/beta";
import { Container } from "../../components/ui/Layout";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import Badge from "../../components/ui/Badge";
import Callout from "../../components/ui/Callout";
import Card from "../../components/ui/Card";
import { Checkbox, Field, Textarea } from "../../components/ui/Field";
import { ErrorState, EmptyState, LoadingState } from "../../components/ui/States";

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function AdminBetaDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<BetaApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groupAdded, setGroupAdded] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");

  const numericId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;

  useEffect(() => {
    if (numericId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.from("beta_applications").select("*").eq("id", numericId).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else if (data) {
          const app = data as BetaApplication;
          setRow(app);
          setGroupAdded(app.group_added);
          setNotes(app.notes ?? "");
        }
        setLoading(false);
      });
  }, [numericId]);

  async function saveGroupAdded(checked: boolean) {
    setGroupAdded(checked);
    setGroupError("");
    const { error } = await supabase
      .from("beta_applications")
      .update({ group_added: checked })
      .eq("id", numericId as number);
    if (error) {
      setGroupAdded(!checked);
      setGroupError(error.message);
    }
  }

  async function copyGoogleEmail() {
    if (!row) return;
    try {
      await navigator.clipboard.writeText(row.google_email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context): fail silently.
    }
  }

  async function saveNotes() {
    if (numericId === null) return;
    setNotesError("");
    const { error } = await supabase
      .from("beta_applications")
      .update({ notes })
      .eq("id", numericId);
    if (error) {
      setNotesError(error.message);
    } else {
      setNotesSaved(true);
      window.setTimeout(() => setNotesSaved(false), 2000);
    }
  }

  if (numericId === null) {
    return (
      <Container size="detail" className="al-members">
        <ErrorState message="That application id is not valid." />
        <div className="mt-6">
          <LinkButton to="/admin/beta" variant="secondary">← Back to beta list</LinkButton>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container size="detail" className="al-members">
        <LoadingState label="Loading…" />
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container size="detail" className="al-members">
        <ErrorState message={loadError} />
        <div className="mt-6">
          <LinkButton to="/admin/beta" variant="secondary">← Back to beta list</LinkButton>
        </div>
      </Container>
    );
  }

  if (!row) {
    return (
      <Container size="detail" className="al-members">
        <EmptyState title="Application not found" />
        <div className="mt-6">
          <LinkButton to="/admin/beta" variant="secondary">← Back to beta list</LinkButton>
        </div>
      </Container>
    );
  }

  const googleEmailWarning = !isGmailDomain(row.google_email);

  return (
    <Container size="detail" className="al-members">
      <h1 className="al-page-title">Beta application — {row.name}</h1>
      <p className="al-panel-text">
        <Badge tone={row.status === "approved" ? "ok" : row.status === "rejected" ? "danger" : "neutral"}>
          {BETA_STATUS_LABELS[row.status]}
        </Badge>
      </p>
      <div className="mt-4">
        <LinkButton href={`mailto:${encodeURIComponent(row.email).replace("%40", "@")}`} variant="secondary">
          Email {row.email}
        </LinkButton>
      </div>

      {googleEmailWarning && (
        <div className="mt-4">
          <Callout tone="warning">
            This is not a Gmail address. Google Workspace addresses work, but check it is a
            Google account.
          </Callout>
        </div>
      )}
      {row.existing_user && (
        <div className="mt-4">
          <Callout tone="warning">This email already has an Actors Lines account.</Callout>
        </div>
      )}
      {row.reapplied && (
        <div className="mt-4">
          <Callout tone="warning">
            This person has applied before.{" "}
            {row.prior_application_id !== null && (
              <Link to={`/admin/beta/${row.prior_application_id}`}>See the earlier application.</Link>
            )}
          </Callout>
        </div>
      )}

      <Card as="section" className="mt-6" title="Application" headingLevel={2}>
        <dl className="al-panel-text">
          <dt>Name</dt>
          <dd>{row.name}</dd>
          <dt>Email</dt>
          <dd>{row.email}</dd>
          <dt>Google account email</dt>
          <dd>{row.google_email}</dd>
          <dt>Town</dt>
          <dd>{row.town}</dd>
          <dt>Actor type</dt>
          <dd>{row.actor_type === "professional" ? "Professional" : "Amateur"}</dd>
          <dt>Member of a company</dt>
          <dd>{row.in_company ? "Yes" : "No"}</dd>
          {row.in_company && row.company_name && (
            <>
              <dt>Company</dt>
              <dd>{row.company_name}</dd>
            </>
          )}
          <dt>Why they would like to join</dt>
          <dd style={{ whiteSpace: "pre-wrap" }}>{row.reason}</dd>
          <dt>Consent</dt>
          <dd>
            Given {new Date(row.consent_at).toLocaleString()} ({row.consent_version})
          </dd>
        </dl>
      </Card>

      <Card as="section" className="mt-4" title="Timeline" headingLevel={2}>
        <ul className="al-panel-text">
          <li>Applied: {when(row.created_at)}</li>
          <li>Decided: {when(row.decided_at)}</li>
          <li>Invite sent: {when(row.invite_sent_at)}</li>
          <li>Account created: {row.user_id ? "Yes" : "No"}</li>
        </ul>
      </Card>

      <Card as="section" className="mt-4" title="Google Group checklist" headingLevel={2}>
        <p className="al-panel-text">{row.google_email}</p>
        <div className="mt-2">
          <Button variant="secondary" onClick={copyGoogleEmail}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-4">
          <Checkbox
            checked={groupAdded}
            onChange={(e) => void saveGroupAdded(e.target.checked)}
            label="Added to the Google Group"
          />
        </div>
        {groupError && (
          <div className="mt-2">
            <Callout tone="error">{groupError}</Callout>
          </div>
        )}
      </Card>

      <Card as="section" className="mt-4" title="Internal notes" headingLevel={2}>
        <Field label="Notes" help={`Maximum 2000 characters (${notes.length} used)`}>
          {(control) => (
            <Textarea {...control} rows={5} maxLength={2000}
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          )}
        </Field>
        <div className="mt-3">
          <Button onClick={() => void saveNotes()}>Save notes</Button>
          {notesSaved && <span className="al-hint" role="status"> Saved.</span>}
        </div>
        {notesError && (
          <div className="mt-2">
            <Callout tone="error">{notesError}</Callout>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <Callout tone="note">Accept and reject arrive in the next phase.</Callout>
      </div>
      <div className="mt-4">
        <LinkButton to="/admin/beta" variant="secondary">← Back to beta list</LinkButton>
      </div>
    </Container>
  );
}
