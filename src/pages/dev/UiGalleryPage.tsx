// Preview-only gallery of every shared UI component, in the page theme and again inside a paper panel,
// with every state (WIP 257 slice 2). Reached at /_ui-gallery, only when the night theme flag is on
// (see UiGalleryRoute); content here is demo text, never site copy.
import { useState } from "react";
import { Accordion, AccordionItem } from "../../components/ui/Accordion";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { Bento, BentoTile } from "../../components/ui/Bento";
import Button, { IconButton } from "../../components/ui/Button";
import Callout from "../../components/ui/Callout";
import Card from "../../components/ui/Card";
import DeviceFrame from "../../components/ui/DeviceFrame";
import ErrorSummary from "../../components/ui/ErrorSummary";
import { Checkbox, Field, Input, Select, Textarea } from "../../components/ui/Field";
import { FeatureRow, FeatureSection } from "../../components/ui/FeatureRow";
import FormError from "../../components/ui/FormError";
import { Container, Section } from "../../components/ui/Layout";
import LinkButton from "../../components/ui/LinkButton";
import Modal, { ConfirmDialog } from "../../components/ui/Modal";
import NotFound from "../../components/ui/NotFound";
import PaperPanel from "../../components/ui/PaperPanel";
import PricingCard from "../../components/ui/PricingCard";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "../../components/ui/States";
import Table, { TableActionButton } from "../../components/ui/Table";
import VideoCard, { VIDEO_PRIVACY_NOTE } from "../../components/ui/VideoCard";
import type { RequestStatus } from "../../lib/types";

const STATUSES: RequestStatus[] = ["submitted", "reported", "published", "planned", "implemented", "closed", "rejected", "abandoned"];

const DEMO_ITEMS = [
  { title: "Demo item one", body: "One plain sentence of demo body text." },
  { title: "Demo item two", body: "One plain sentence of demo body text." },
  { title: "Demo item three", body: "One plain sentence of demo body text." },
  { title: "Demo item four", body: "One plain sentence of demo body text." },
  { title: "Demo item five", body: "One plain sentence of demo body text." },
  { title: "Demo item six", body: "One plain sentence of demo body text." },
];

function Showcase({ prefix }: { prefix: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [checked, setChecked] = useState(false);

  return (
    <>
      <div className="al-gallery__group">
        <h3>Buttons</h3>
        <div className="al-gallery__row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <IconButton label="Close">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l12 12M17 5L5 17" />
            </svg>
          </IconButton>
        </div>
        <div className="al-gallery__row">
          <Button disabled disabledReason="Complete the security check to continue">Disabled with reason</Button>
          <Button busy>Signing in...</Button>
          <LinkButton to="/" variant="secondary">Link styled as button</LinkButton>
          <LinkButton href="https://example.org/" variant="ghost" newTab>External link</LinkButton>
        </div>
      </div>

      <div className="al-gallery__group">
        <h3>Badges and status</h3>
        <div className="al-gallery__row">
          <Badge>Neutral</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="ok">Ok</Badge>
          <Badge tone="warn">Warn</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="lilac">Beta</Badge>
        </div>
        <div className="al-gallery__row">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </div>

      <div className="al-gallery__group">
        <h3>Callouts</h3>
        <Callout tone="tip" title="Tip">Demo tip text.</Callout>
        <Callout tone="note" title="Note">Demo note text.</Callout>
        <Callout tone="success" title="Saved">Demo success text.</Callout>
        <Callout tone="warning" title="Careful">Demo warning text.</Callout>
        <Callout tone="error" title="Problem">Demo error text.</Callout>
        <FormError message="Demo form-level error in plain words." />
      </div>

      <div className="al-gallery__group">
        <h3>Cards</h3>
        <div className="al-gallery__grid">
          <Card title="Dense card" headingLevel={4}>Card body text.</Card>
          <Card title="Marketing card" tone="marketing" eyebrow="Eyebrow" headingLevel={4}>Card body text.</Card>
          <Card title="Clickable card" to="/" headingLevel={4}>The whole card is one link target.</Card>
        </div>
      </div>

      <div className="al-gallery__group">
        <h3>Form controls</h3>
        <form onSubmit={(e) => { e.preventDefault(); setSubmitCount((n) => n + 1); }} noValidate>
          <ErrorSummary
            submitCount={submitCount}
            problems={[
              { fieldId: `${prefix}-email`, message: "Enter your email address like name@example.com" },
              { fieldId: `${prefix}-consent`, message: "Tick the box to continue" },
            ]}
          />
          <Field label="Email" required help="Helper text sits under the label." id={`${prefix}-email`} error={submitCount > 0 ? "Enter your email address like name@example.com" : undefined}>
            {(c) => <Input type="email" autoComplete="email" placeholder="name@example.com" {...c} />}
          </Field>
          <Field label="Message">{(c) => <Textarea {...c} />}</Field>
          <Field label="Topic">
            {(c) => (
              <Select {...c} defaultValue="a">
                <option value="a">Demo option A</option>
                <option value="b">Demo option B</option>
              </Select>
            )}
          </Field>
          <Field label="Disabled field">{(c) => <Input disabled defaultValue="Disabled" {...c} />}</Field>
          <Checkbox
            id={`${prefix}-consent`}
            label="Demo consent label"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            error={submitCount > 0 && !checked ? "Tick the box to continue" : undefined}
          />
          <div className="al-gallery__row">
            <Button type="submit">Submit to see errors</Button>
          </div>
        </form>
      </div>

      <div className="al-gallery__group">
        <h3>Table</h3>
        <Table caption="Demo table" label="Demo table, scrolls sideways on small screens">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col" className="al-num">Count</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Demo row one</th>
              <td><StatusBadge status="published" /></td>
              <td className="al-num">1,204</td>
              <td><TableActionButton>Edit</TableActionButton></td>
            </tr>
            <tr>
              <th scope="row">Demo row two</th>
              <td><StatusBadge status="closed" /></td>
              <td className="al-num">38</td>
              <td><TableActionButton>Edit</TableActionButton></td>
            </tr>
          </tbody>
        </Table>
      </div>

      <div className="al-gallery__group">
        <h3>States</h3>
        <div aria-busy="true"><Skeleton lines={3} /></div>
        <LoadingState />
        <EmptyState title="Nothing here yet" action={<LinkButton to="/" variant="primary">Demo action</LinkButton>}>
          One sentence about what to do next.
        </EmptyState>
        <ErrorState message="Demo plain-words error." onRetry={() => undefined} details="Demo technical details for admins." />
      </div>

      <div className="al-gallery__group">
        <h3>Accordion</h3>
        <Accordion>
          <AccordionItem summary="Demo question one?">Demo answer text.</AccordionItem>
          <AccordionItem summary="Demo question two?">Demo answer text.</AccordionItem>
        </Accordion>
      </div>

      <div className="al-gallery__group">
        <h3>Dialogs</h3>
        <div className="al-gallery__row">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open dialog</Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Open destructive confirm</Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Demo dialog"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setModalOpen(false)}>Save</Button>
            </>
          }
        >
          <Field label="Name">{(c) => <Input {...c} />}</Field>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="Delete this item?"
          description="Demo confirm text. This cannot be undone."
          confirmLabel="Delete"
          destructive
        />
      </div>

      <div className="al-gallery__group">
        <h3>Video card</h3>
        <p>{VIDEO_PRIVACY_NOTE}</p>
        {/* Demo id only: no real video exists yet. Pressing play makes the first request to youtube-nocookie.com. */}
        <VideoCard videoId="AAAAAAAAAAA" title="Demo video title" duration="0:00" description="Demo description." headingLevel={4} />
      </div>

      <div className="al-gallery__group">
        <h3>Device frame</h3>
        <DeviceFrame caption="Placeholder state until Robert supplies screenshots" />
      </div>

      <div className="al-gallery__group">
        <h3>Bento</h3>
        <Bento>
          <BentoTile hero eyebrow="Eyebrow" title="Hero tile">One plain sentence of demo body text.</BentoTile>
          <BentoTile title="Tile two" headingLevel={4}>One plain sentence.</BentoTile>
          <BentoTile title="Tile three" headingLevel={4}>One plain sentence.</BentoTile>
          <BentoTile title="Tile four" headingLevel={4}>One plain sentence.</BentoTile>
          <BentoTile title="Tile five" headingLevel={4}>One plain sentence.</BentoTile>
          <BentoTile wide title="Wide tile" headingLevel={4} to="/" linkLabel="Learn more">One plain sentence.</BentoTile>
        </Bento>
      </div>

      <div className="al-gallery__group">
        <h3>Feature section, bento variant</h3>
        <FeatureSection title="Demo features" headingLevel={3} items={DEMO_ITEMS} />
        <h3>Feature section, cue-sheet variant</h3>
        <FeatureSection title="Demo cue sheet" headingLevel={3} variant="cue-sheet" items={DEMO_ITEMS.slice(0, 4)} />
        <h3>Feature row</h3>
        <FeatureRow eyebrow="Eyebrow" title="Demo feature row" headingLevel={4} bullets={["Demo point one", "Demo point two"]} media={<DeviceFrame />}>
          Two plain demo sentences. They describe nothing real.
        </FeatureRow>
      </div>

      <div className="al-gallery__group">
        <h3>Pricing card (one product, demo values)</h3>
        <PricingCard
          headingLevel={4}
          product={{
            name: "Demo product",
            period: "Demo period line",
            included: ["Demo included item one", "Demo included item two"],
            cta: { label: "Demo call to action", to: "/" },
            smallPrint: "Demo small print.",
          }}
        />
      </div>

      <div className="al-gallery__group">
        <h3>Pricing cards, two tiers (ADR-0156; demo values, best value badge and discount line)</h3>
        <div className="al-gallery__grid">
          <PricingCard
            headingLevel={4}
            product={{
              name: "Demo tier one",
              price: "Demo price",
              period: "Demo period line",
              discountLine: "Returning customers: demo discount",
              included: ["Demo included item one", "Demo included item two"],
              cta: { label: "Demo call to action", to: "/" },
            }}
          />
          <PricingCard
            headingLevel={4}
            product={{
              name: "Demo tier two",
              price: "Demo price",
              period: "Demo period line",
              bestValue: true,
              discountLine: "Returning customers: demo discount",
              included: ["Demo included item one", "Demo included item two"],
              cta: { label: "Demo call to action", to: "/" },
            }}
          />
        </div>
      </div>

      <div className="al-gallery__group">
        <h3>Section and container</h3>
        <Section title="Demo section" headingLevel={3} eyebrow="Eyebrow" tone="surface">
          <p>Section content sits in the page container.</p>
        </Section>
        <Container size="detail"><p>Container, detail width.</p></Container>
      </div>

      <div className="al-gallery__group">
        <h3>404 view</h3>
        <NotFound />
      </div>
    </>
  );
}

export default function UiGalleryPage() {
  return (
    <div>
      <h1>UI gallery</h1>
      <p>Every shared component, once on the page surface and once on a paper panel. Preview only.</p>
      <h2>Page surface</h2>
      <Showcase prefix="pg" />
      <h2>Paper panel</h2>
      <PaperPanel>
        <Showcase prefix="pp" />
      </PaperPanel>
    </div>
  );
}
