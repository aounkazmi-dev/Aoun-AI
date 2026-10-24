import {
  ArrowRight,
  ArrowUpRight,
  Github,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Avatar } from "./ui";
import { projects, prompts } from "../content";
type AskProps = { busy: boolean; onAsk: (text: string) => void };

export function Welcome({ busy, onAsk }: AskProps) {
  return (
    <section className="welcome">
      <div className="intro-eyebrow">
        <span className="line" /> THE PORTFOLIO, REIMAGINED
      </div>
      <div className="hero-row">
        <div className="hero-copy">
          <div className="hello">
            Hey, I’m Aoun<span className="blue-period">.</span>
          </div>
          <h1>
            Get to know me.
            <br />
            <span>One question at a time.</span>
          </h1>
          <p>
            I build things with data, code, and a healthy dose of curiosity.
            <br className="desktop-break" /> Meet my AI sidekick — your guide to
            the work and the person behind it.
          </p>
        </div>
        <div className="hero-avatar">
          <div className="avatar-orbit" />
          <Avatar />
          <span className="avatar-note">
            <span className="status-dot" /> THAT’S ME, SORT OF.
          </span>
          <span className="avatar-spark">✳</span>
        </div>
      </div>
      <div className="interest-line">
        <span>
          <Terminal size={13} /> AI & ML engineering
        </span>
        <i />
        <span>FAST–NUCES ’28</span>
        <i />
        <span>Lahore, Pakistan</span>
      </div>
      <div className="prompt-heading">
        <span>A FEW PLACES TO START</span>
        <span>
          Or follow your curiosity <ArrowUpRight size={13} />
        </span>
      </div>
      <div className="prompt-grid">
        {prompts.map((p) => (
          <button
            className="prompt-card"
            key={p.label}
            onClick={() => onAsk(p.text)}
            disabled={busy}
          >
            <div>
              <span className="prompt-icon">
                <p.icon size={18} />
              </span>
              <ArrowUpRight className="prompt-arrow" size={17} />
            </div>
            <strong>{p.label}</strong>
            <span>{p.hint}</span>
          </button>
        ))}
      </div>
      <div className="grounding-note">
        <ShieldCheck size={15} />
        <span>
          Grounded in my published work. Honest about what’s still a work in
          progress.
        </span>
      </div>
    </section>
  );
}

export function Projects({ busy, onAsk }: AskProps) {
  return (
    <section className="page-content">
      <div className="intro-eyebrow">
        <span className="line" /> SELECTED WORK
      </div>
      <h1>
        Ideas, made tangible<span className="blue-period">.</span>
      </h1>
      <p className="page-intro">
        A few things I’ve built while exploring the space between data,
        intelligence, and useful software.
      </p>
      <div className="project-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.title}>
            <div className={`project-art ${project.color}`}>
              <span>
                {project.mark}
                <span>↗</span>
              </span>
              <small>{project.category}</small>
            </div>
            <div className="project-info">
              <h2>{project.title}</h2>
              <p>{project.description}</p>
              <span className="project-stack">{project.stack}</span>
              <div>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    onAsk(
                      `Explain ${project.title}: architecture, implementation, and limitations.`,
                    )
                  }
                >
                  Explore with AounOS <ArrowRight size={14} />
                </button>
                <a
                  href={project.url}
                  aria-label={`${project.title} on GitHub`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github size={18} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="page-footnote">
        Independent portfolio projects. Follow the repository links for
        implementation details and current status.
      </p>
    </section>
  );
}

export function About() {
  return (
    <section className="page-content about-page">
      <div className="intro-eyebrow">
        <span className="line" /> THE HUMAN BEHIND THE CHAT
      </div>
      <div className="about-header">
        <div>
          <h1>
            Curiosity is the
            <br />
            starting point<span className="blue-period">.</span>
          </h1>
          <p className="page-intro">
            I’m Aoun Abbas, a Computer Science student at FAST–NUCES Lahore,
            building toward AI engineering.
          </p>
        </div>
        <Avatar />
      </div>
      <div className="about-body">
        <p>
          I’m interested in what happens when data and software come together to
          do something useful — from classical machine learning to
          retrieval-grounded applications and agents that work with real tools.
        </p>
        <p>
          My projects are independent and educational work. I’m learning by
          building, asking better questions, and understanding the trade-offs
          behind every technical decision.
        </p>
        <div className="about-facts">
          <div>
            <small>STUDYING</small>
            <strong>BS Computer Science</strong>
            <span>FAST–NUCES · Expected 2028</span>
          </div>
          <div>
            <small>EXPLORING</small>
            <strong>AI engineering & ML</strong>
            <span>RAG · NLP · Data-driven systems</span>
          </div>
        </div>
        <a className="contact-cta" href="mailto:aoun.abbas.dev@gmail.com">
          <div>
            <small>HAVE AN OPPORTUNITY OR AN IDEA?</small>
            <strong>Let’s build something worthwhile.</strong>
          </div>
          <ArrowUpRight size={25} />
        </a>
        <div className="privacy-note">
          <ShieldCheck size={18} />
          <div>
            <strong>A note on this assistant</strong>
            <p>
              AounOS answers from my published portfolio. It isn’t me, and it
              doesn’t have private knowledge about me. Chats are saved on this
              device; in live mode, messages and relevant context are sent to
              Google and, if needed, Groq to generate a response.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
