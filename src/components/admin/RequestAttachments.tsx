import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  ATTACHMENT_BUCKET,
  SIGNED_URL_SECONDS,
  summariseAttachments,
  type AttachmentRow,
} from "../../lib/attachments";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Badge } from "../ui/Badge";
import Callout from "../ui/Callout";
import { LoadingState } from "../ui/States";

interface Props {
  requestId: number;
  attachmentsComplete: boolean | null | undefined;
}

interface RenderItem {
  id: number;
  kind: "image" | "audio";
  state: "viewable" | "incomplete" | "rejected";
  label: string;
  sizeLabel: string;
  url: string | null;
}

export default function RequestAttachments({ requestId, attachmentsComplete }: Props) {
  const [items, setItems] = useState<RenderItem[] | null>(null);
  const [incompleteFlag, setIncompleteFlag] = useState(false);
  const [headline, setHeadline] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data, error: selError } = await supabase
        .from("request_attachments")
        .select("*")
        .eq("request_id", requestId)
        .order("id");
      if (!alive) return;
      if (selError) {
        setItems(null);
        setError(true);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as AttachmentRow[];
      const summary = summariseAttachments(rows, attachmentsComplete);
      const withUrls: RenderItem[] = [];
      for (const item of summary.items) {
        const row = rows.find((r) => r.id === item.id);
        let url: string | null = null;
        if (row && item.state === "viewable") {
          const { data: signed } = await supabase.storage
            .from(ATTACHMENT_BUCKET)
            .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
          url = signed?.signedUrl ?? null;
        }
        withUrls.push({ ...item, url });
      }
      if (!alive) return;
      setItems(withUrls);
      setIncompleteFlag(summary.incompleteFlag);
      setHeadline(summary.headline);
      setError(false);
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [requestId, attachmentsComplete, tick]);

  if (loading) return <LoadingState label="Loading attachments…" />;

  if (error) {
    return (
      <Card as="article">
        <h2 className="al-card__title">Attachments</h2>
        <Callout tone="error">Could not load attachments.</Callout>
        <div className="mt-3">
          <Button onClick={() => { setLoading(true); setTick((t) => t + 1); }}>Reload</Button>
        </div>
      </Card>
    );
  }

  if (items !== null && items.length === 0 && !incompleteFlag) return null;

  return (
    <Card as="article">
      <h2 className="al-card__title">Attachments</h2>
      <p className="mt-2 text-sm text-fg-muted">{headline}</p>
      {incompleteFlag && (
        <div className="mt-3">
          <Callout tone="warning">
            Attachment upload incomplete: the app did not finish sending a file.
          </Callout>
        </div>
      )}
      {items !== null && items.length > 0 && (
        <ul className="mt-3 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-semibold">
                {item.label} <span className="text-fg-muted font-normal">({item.sizeLabel})</span>
              </p>
              {item.state === "viewable" && item.kind === "image" && item.url && (
                <img src={item.url} alt="Screenshot attached to the report"
                  className="mt-2 max-w-full rounded-md" loading="lazy" />
              )}
              {item.state === "viewable" && item.kind === "audio" && item.url && (
                <audio controls preload="none" src={item.url} className="mt-2 w-full" />
              )}
              {item.state === "rejected" && (
                <div className="mt-2">
                  <Badge tone="danger">Rejected: file did not match its type</Badge>
                </div>
              )}
              {item.state === "incomplete" && (
                <div className="mt-2">
                  <Badge tone="warn">Not uploaded</Badge>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
