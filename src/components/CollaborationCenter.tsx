import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  History,
  Link2,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import type { StructureAudit } from '../lib/structureAudit';
import { createReviewLink } from '../lib/reviewLink';
import type { FEAResult, StructureState } from '../lib/types';
import { readStoredValue, writeStoredValue } from '../lib/storage';

interface CollaborationCenterProps {
  state: StructureState;
  result: FEAResult | null;
  audit: StructureAudit;
  onClose: () => void;
  onApplySnapshot: (state: StructureState) => void;
}

interface Comment {
  id: string;
  author: string;
  message: string;
  anchor: string;
  resolved: boolean;
  createdAt: string;
}

interface Snapshot {
  id: string;
  label: string;
  createdAt: string;
  state: StructureState;
}

const COMMENTS_KEY = 'trussiq-collaboration-comments';
const SNAPSHOTS_KEY = 'trussiq-collaboration-snapshots';
const REVIEW_KEY = 'trussiq-collaboration-review';

export function CollaborationCenter({
  state,
  result,
  audit,
  onClose,
  onApplySnapshot,
}: CollaborationCenterProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [tab, setTab] = useState<'room' | 'comments' | 'history'>('room');
  const [comments, setComments] = useState<Comment[]>(() => readStorage(COMMENTS_KEY, []));
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => readStorage(SNAPSHOTS_KEY, []));
  const [review, setReview] = useState<Record<string, boolean>>(() => readStorage(REVIEW_KEY, {}));
  const [message, setMessage] = useState('');
  const [anchor, setAnchor] = useState('Whole model');
  const [copyStatus, setCopyStatus] = useState<'copied' | 'error' | ''>('');
  const [projectName, setProjectName] = useState(() => readStoredValue('trussiq-project-name') ?? 'Untitled bridge study');

  const shareCode = useMemo(() => createReviewLink(state, window.location), [state]);
  const openComments = comments.filter((comment) => !comment.resolved).length;
  const approved = Object.values(review).filter(Boolean).length;

  const persistComments = (next: Comment[]) => {
    setComments(next);
    writeStoredValue(COMMENTS_KEY, JSON.stringify(next));
  };
  const persistSnapshots = (next: Snapshot[]) => {
    setSnapshots(next);
    writeStoredValue(SNAPSHOTS_KEY, JSON.stringify(next));
  };
  const addComment = () => {
    if (!message.trim()) return;
    persistComments([
      {
        id: crypto.randomUUID(),
        author: 'You',
        message: message.trim(),
        anchor,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      ...comments,
    ]);
    setMessage('');
  };
  const saveSnapshot = () => {
    const next = [
      {
        id: crypto.randomUUID(),
        label: `Checkpoint ${snapshots.length + 1}`,
        createdAt: new Date().toISOString(),
        state: structuredClone(state),
      },
      ...snapshots,
    ].slice(0, 12);
    persistSnapshots(next);
  };
  const copyShareLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable.');
      await navigator.clipboard.writeText(shareCode);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus(''), 1800);
    } catch {
      try {
        const area = document.createElement('textarea');
        area.value = shareCode;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        if (!ok) throw new Error('Copy command failed');
        setCopyStatus('copied');
        window.setTimeout(() => setCopyStatus(''), 1800);
      } catch {
        window.prompt('Copy this review link:', shareCode);
        setCopyStatus('error');
        window.setTimeout(() => setCopyStatus(''), 2400);
      }
    }
  };
  const downloadPacket = () => {
    const packet = {
      projectName,
      exportedAt: new Date().toISOString(),
      model: state,
      analysis: result,
      audit,
      comments,
      review,
      snapshots: snapshots.map(({ id, label, createdAt }) => ({ id, label, createdAt })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/[^\w-]+/g, '_')}-review-packet.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Collaboration center" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><Users size={18} /></div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Local collaboration room</p>
              <input value={projectName} onChange={(event) => { setProjectName(event.target.value); writeStoredValue('trussiq-project-name', event.target.value); }} className="mt-1 w-full bg-transparent text-lg font-semibold text-surface-100 outline-none" aria-label="Project name" />
              <p className="mt-1 text-xs text-surface-400">Review, checkpoint, and share this design from one place.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close collaboration center" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800"><X size={17} /></button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-surface-700 px-5 pt-3">
          <Tab active={tab === 'room'} onClick={() => setTab('room')} icon={<Users size={14} />}>Room</Tab>
          <Tab active={tab === 'comments'} onClick={() => setTab('comments')} icon={<MessageSquare size={14} />}>Comments ({openComments})</Tab>
          <Tab active={tab === 'history'} onClick={() => setTab('history')} icon={<History size={14} />}>History ({snapshots.length})</Tab>
        </nav>

        <div className="min-h-0 overflow-y-auto p-5">
          {tab === 'room' && (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="space-y-3">
                <PanelTitle icon={<Link2 size={15} />} title="Shareable design link" />
                <div className="rounded-xl border border-surface-700 bg-surface-800/60 p-3">
                  <p className="text-[10px] leading-4 text-surface-400">The link contains this model only. It does not include comments or review checklist marks.</p>
                  <input readOnly value={shareCode} aria-label="Shareable model link" onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-md border border-surface-700 bg-surface-900 px-2 py-1.5 font-mono text-[9px] text-surface-400 outline-none focus:border-accent" />
                  <button type="button" onClick={copyShareLink} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950">{copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}{copyStatus === 'copied' ? 'Copied' : 'Copy design link'}</button>
                  {copyStatus === 'error' && <p role="status" className="mt-2 text-[10px] text-warn">Clipboard access failed. Select the link above and copy it manually.</p>}
                </div>
                <PanelTitle icon={<ShieldCheck size={15} />} title="Review health" />
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Members" value={String(state.beams.length)} />
                  <Stat label="Open comments" value={String(openComments)} />
                  <Stat label="Audit errors" value={String(audit.errors)} />
                  <Stat label="Approved checks" value={`${approved}/4`} />
                </div>
                <button type="button" onClick={downloadPacket} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:border-accent/50 hover:text-accent"><Download size={14} /> Download review packet</button>
              </section>

              <section className="space-y-3">
                <PanelTitle icon={<ClipboardCheck size={15} />} title="Team review checklist" />
                {[
                  ['geometry', 'Geometry checked by reviewer'],
                  ['loads', 'Loads and supports discussed'],
                  ['analysis', 'FEA result reviewed'],
                  ['tradeoffs', 'Design trade-offs documented'],
                ].map(([id, label]) => (
                  <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-700 bg-surface-800/50 px-3 py-3 text-xs text-surface-300">
                    <input type="checkbox" checked={Boolean(review[id])} onChange={(event) => { const next = { ...review, [id]: event.target.checked }; setReview(next); writeStoredValue(REVIEW_KEY, JSON.stringify(next)); }} className="accent-teal-500" />
                    {label}
                  </label>
                ))}
                <button type="button" onClick={saveSnapshot} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20"><Plus size={14} /> Save checkpoint</button>
              </section>
            </div>
          )}

          {tab === 'comments' && (
            <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-xl border border-surface-700 bg-surface-800/50 p-4">
                <h3 className="text-sm font-semibold text-surface-100">New review note</h3>
                <select value={anchor} onChange={(event) => setAnchor(event.target.value)} className="mt-3 w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-xs text-surface-200">
                  <option>Whole model</option>
                  {state.nodes.map((node) => <option key={node.id}>Node {node.id}</option>)}
                  {state.beams.map((beam) => <option key={beam.id}>Member {beam.id}</option>)}
                </select>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a teammate a question or record a design decision…" className="mt-2 min-h-28 w-full resize-y rounded-lg border border-surface-700 bg-surface-900 p-3 text-xs text-surface-200 placeholder:text-surface-600" />
                <button type="button" onClick={addComment} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950"><Plus size={14} /> Add note</button>
              </section>
              <section className="space-y-2">
                {comments.length === 0 && <EmptyState text="No review notes yet. Start a design conversation." />}
                {comments.map((comment) => (
                  <article key={comment.id} className={`rounded-xl border p-3 ${comment.resolved ? 'border-pass/20 bg-pass/5 opacity-65' : 'border-surface-700 bg-surface-800/50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><span className="text-xs font-semibold text-surface-200">{comment.author}</span><span className="ml-2 rounded bg-surface-700 px-1.5 py-0.5 font-mono text-[9px] text-accent">{comment.anchor}</span></div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => persistComments(comments.map((item) => item.id === comment.id ? { ...item, resolved: !item.resolved } : item))} aria-label={comment.resolved ? 'Reopen comment' : 'Resolve comment'} className="rounded p-1 text-surface-500 hover:text-pass"><CheckCircle2 size={14} /></button>
                        <button type="button" onClick={() => persistComments(comments.filter((item) => item.id !== comment.id))} aria-label="Delete comment" className="rounded p-1 text-surface-500 hover:text-fail"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-surface-300">{comment.message}</p>
                    <time className="mt-2 block text-[10px] text-surface-600">{new Date(comment.createdAt).toLocaleString()}</time>
                  </article>
                ))}
              </section>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {snapshots.length === 0 && <EmptyState text="No checkpoints yet. Save one from the Room tab before experimenting." />}
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-700 bg-surface-800/50 p-3">
                  <div><div className="text-xs font-semibold text-surface-200">{snapshot.label}</div><div className="mt-1 text-[10px] text-surface-500">{new Date(snapshot.createdAt).toLocaleString()} · {snapshot.state.nodes.length} nodes · {snapshot.state.beams.length} members</div></div>
                  <button type="button" onClick={() => onApplySnapshot(snapshot.state)} className="rounded-lg border border-accent/40 px-3 py-2 text-[11px] text-accent hover:bg-accent/10">Restore checkpoint</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-surface-300">{icon}<span>{title}</span></h3>;
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs ${active ? 'border-accent text-accent' : 'border-transparent text-surface-500 hover:text-surface-200'}`}>{icon}{children}</button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-surface-700 bg-surface-800/50 p-3"><div className="text-[10px] uppercase tracking-wide text-surface-500">{label}</div><div className="mt-1 font-mono text-lg text-surface-100">{value}</div></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-surface-700 p-8 text-center text-xs text-surface-500">{text}</div>;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = readStoredValue(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
