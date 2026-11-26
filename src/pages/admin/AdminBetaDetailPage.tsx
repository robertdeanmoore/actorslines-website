import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  BETA_CAP,
  BETA_STATUS_LABELS,
  isGmailDomain,
  placesLeft,
  type BetaApplication,
} from "../../lib/beta";
import { decideBeta, describeOutcome, type BetaAction } from "../../lib/betaDecide";
import { rejectionEmail } from "../../../supabase/functions/beta-decide/beta_text.ts";
import { Container } from "../../components/ui/Layout";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import Badge from "../../components/ui/Badge";
import Callout from "../../components/ui/Callout";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import { Checkbox, Field, Textarea } from "../../components/ui/Field";
import { ErrorState, EmptyState, LoadingState } from "../../components/ui/States";

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

type DecisionModal = "accept" | "reject" | "withdraw" | "group";

type Outcome = { tone: "success" | "warning" | "error"; message: string };

export default function AdminBetaDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<BetaApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<DecisionModal | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
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

  useEffect(() => {
    const countQuery = supabase
      .from("beta_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    void countQuery.then(({ count }) => setApprovedCount(count ?? 0));
  }, []);

  async function reloadRowAndCount() {
    if (numericId === null) return;
    const rowQuery = supabase.from("beta_applications").select("*").eq("id", numericId).maybeSingle();
    const countQuery = supabase
      .from("beta_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    const [{ data }, { count }] = await Promise.all([rowQuery, countQuery]);
    if (data) {
      const app = data as BetaApplication;
      setRow(app);
      setGroupAdded(app.group_added);
    }
    setApprovedCount(count ?? 0);
  }

  async function run(action: BetaAction, note?: string) {
    if (numericId === null || busy) return;
    setBusy(true);
    setOutcome(null);
    const result = await decideBeta(action, numericId, note);
    if (result.ok) {
      setOutcome(describeOutcome(action, result));
    } else {
      setOutcome({ tone: "error", message: result.error });
    }
    setModal(null);
    setBusy(false);
    await reloadRowAndCount();
  }

  function onGroupChange(checked: boolean) {
    if (checked && row !== null && row.group_email_sent_at === null) {
      setModal("group");
      return;
    }
    void saveGroupAdded(checked);
  }

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
  const placesLeftNow = placesLeft(approvedCount ?? 0);
  const rejection = rejectionEmail({ name: row.name });

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

      <div className="mt-4">
        <Callout tone="note">
          {approvedCount === null
            ? "Counting places…"
            : `${approvedCount} of ${BETA_CAP} places used, ${placesLeftNow} left`}
        </Callout>
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

      {outcome && (
        <div className="mt-4">
          <Callout tone={outcome.tone}>{outcome.message}</Callout>
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

      <Card as="section" className="mt-4" title="Decision" headingLevel={2}>
        {row.status === "pending" && (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || placesLeftNow === 0}
              disabledReason={placesLeftNow === 0 ? `All ${BETA_CAP} places are taken.` : undefined}
              onClick={() => {
                setInternalNote("");
                setModal("accept");
              }}
            >
              Accept
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => {
              setInternalNote("");
              setModal("reject");
            }}>
              Reject
            </Button>
          </div>
        )}
        {row.status === "approved" && (
          <>
            <ul className="al-panel-text">
              <li>
                Invitation sent:{" "}
                {row.invite_sent_at ? new Date(row.invite_sent_at).toLocaleString() : "Not sent"}
                {!row.user_id && !row.existing_user && (
                  <>
                    {" "}
                    <Button variant="secondary" disabled={busy} onClick={() => void run("resend_invite")}>
                      Resend invite
                    </Button>
                  </>
                )}
              </li>
              <li>Account created: {row.user_id ? "Yes" : "No"}</li>
              <li>
                Licence granted:{" "}
                {row.grant_applied_at ? new Date(row.grant_applied_at).toLocaleString() : "Not yet"}
              </li>
              {!row.user_id && (
                <li>
                  Invitation link expires: {when(row.invite_expires_at)} (only while the account is not
                  created)
                </li>
              )}
            </ul>
            <div className="mt-3">
              <Button variant="destructive" disabled={busy} onClick={() => setModal("withdraw")}>
                Withdraw
              </Button>
            </div>
          </>
        )}
        {row.status === "rejected" && (
          <div>
            <Button variant="secondary" disabled={busy} onClick={() => void run("reopen")}>
              Reopen
            </Button>
            <p className="al-hint">Moves the application back to pending.</p>
          </div>
        )}
        {row.status === "withdrawn" && (
          <p className="al-panel-text">This application was withdrawn.</p>
        )}
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
            disabled={row.status !== "approved"}
            onChange={(e) => onGroupChange(e.target.checked)}
            label="Added to the Google Group"
          />
        </div>
        {row.group_email_sent_at && (
          <p className="al-hint" role="status">
            Email sent {new Date(row.group_email_sent_at).toLocaleString()}
          </p>
        )}
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

      <div className="mt-4">
        <LinkButton to="/admin/beta" variant="secondary">← Back to beta list</LinkButton>
      </div>

      <Modal
        open={modal === "accept"}
        onClose={() => setModal(null)}
        title={`Accept ${row.name}?`}
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" disabled={busy} data-autofocus onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void run("accept")}>
              Accept and send
            </Button>
          </>
        }
      >
        <p>
          {row.existing_user
            ? "This email already has an Actors Lines account. No invitation is sent: six months of full access is added to it now, and an email tells them."
            : `This sends an invitation email to ${row.email}. Their six months of full access starts when they create their account.`}
        </p>
      </Modal>

      <Modal
        open={modal === "reject"}
        onClose={() => setModal(null)}
        title={`Reject ${row.name}?`}
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" disabled={busy} data-autofocus onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => {
              const note = internalNote.trim();
              void run("reject", note === "" ? undefined : note);
            }}>
              Reject and send
            </Button>
          </>
        }
      >
        <pre style={{ whiteSpace: "pre-wrap" }}>{`Subject: ${rejection.subject}\n\n${rejection.text}`}</pre>
        <div className="mt-3">
          <Field label="Internal note (never emailed)" help={`Maximum 1000 characters (${internalNote.length} used)`}>
            {(control) => (
              <Textarea {...control} rows={3} maxLength={1000} value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)} />
            )}
          </Field>
        </div>
      </Modal>

      <Modal
        open={modal === "withdraw"}
        onClose={() => setModal(null)}
        title={`Withdraw ${row.name}?`}
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" disabled={busy} data-autofocus onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void run("withdraw")}>
              Withdraw
            </Button>
          </>
        }
      >
        <p>This frees their place and revokes their licence if one was granted. No email is sent; write to them yourself.</p>
      </Modal>

      <Modal
        open={modal === "group"}
        onClose={() => setModal(null)}
        title={`Email ${row.name} the Google Play link?`}
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" disabled={busy} data-autofocus onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void run("group_added")}>
              Tick and send
            </Button>
          </>
        }
      >
        <p>
          Ticking this sends them an email with the Google Play opt-in link. Only do it after you
          have added {row.google_email} to the Google Group.
        </p>
      </Modal>
    </Container>
  );
}
