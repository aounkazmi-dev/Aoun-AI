import { useState } from "react";
import { Download, Sparkles, X } from "lucide-react";

export function Companion({ busy }: { busy: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  if (hidden) return (
    <button className="companion-restore" aria-label="Show Aoun companion" onClick={() => setHidden(false)}>
      <Sparkles size={17} />
    </button>
  );

  return (
    <div className={`companion ${busy ? "is-thinking" : ""}`}>
      {open && <div className="companion-note" id="companion-note">
        <strong>Hey, I’m mini Aoun.</strong>
        <p>Explore my projects, ask a question, or take my resume with you.</p>
        <a href="/Aoun_Abbas_Resume.pdf" download="Aoun_Abbas_Resume.pdf"><Download size={14} /> Download resume</a>
      </div>}
      <button className="companion-hide" aria-label="Hide Aoun companion" onClick={() => { setHidden(true); setOpen(false); }}><X size={13} /></button>
      <button className="companion-character" aria-label="Meet mini Aoun" aria-expanded={open} aria-controls={open ? "companion-note" : undefined} onClick={() => setOpen(!open)}>
        <img src="/aoun-companion.png" alt="" width="1024" height="1536" />
      </button>
      <span className="companion-caption">{busy ? "Thinking…" : "Say hello"}</span>
    </div>
  );
}
