'use client';
import { useEffect, useState } from 'react';

function Content({ value }: { value: string }) {
  const blocks = value.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return <div className="legal-content">{blocks.map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines[0]?.startsWith('# ')) return <h1 key={index}>{lines[0].slice(2)}</h1>;
    if (lines[0]?.startsWith('## ')) return <h2 key={index}>{lines[0].slice(3)}</h2>;
    if (lines.every((line) => line.startsWith('- '))) return <ul key={index}>{lines.map((line) => <li key={line}>{line.slice(2)}</li>)}</ul>;
    return <p key={index}>{lines.map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>;
  })}</div>;
}

export default function LegalPage({ documentKey }: { documentKey: 'privacy' | 'terms' }) {
  const [doc, setDoc] = useState<any>(null), [error, setError] = useState(false);
  useEffect(() => { fetch(`/api/legal/${documentKey}`).then((r) => r.ok ? r.json() : Promise.reject()).then(setDoc).catch(() => setError(true)); }, [documentKey]);
  if (!doc && !error) return <main className="legal-shell"><div className="legal-card"><p>Loading the fine print…</p></div></main>;
  if (error) return <main className="legal-shell"><div className="legal-card"><p>We could not load this page. Please try again.</p><a href="/">Back to clubhouse</a></div></main>;
  return <main className="legal-shell"><div className="legal-card">
    <header className="legal-header"><a className="legal-brand" href="/"><span>⚑</span><strong>AND IT’S<br />NO GOOD.</strong></a><a href="/">Back to clubhouse ↗</a></header>
    <p className="legal-eyebrow">THE FINE PRINT</p>
    <Content value={doc.data.content} />
    <p className="legal-updated">Last updated {new Date(doc.data.updatedAt).toLocaleDateString()}</p>
  </div></main>;
}
