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
      <div className="intro-eyebrow">THE HUMAN BEHIND THE CODE</div>
      <div className="hero-row">
        <div className="hero-copy">
          <h1>Hey, I'm Aoun.</h1>
          <div className="hero-intro">
            <p>The things we build say something about the way we think.</p>
            <p>But they never tell the whole story.</p>
            <p>
              There's more to me than projects, skills, and a few lines on a
              resume.
            </p>
            <p>Ask what you want to know.</p>
          </div>
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
      <div className="question-heading">A FEW PLACES TO START</div>
      <div className="question-links" aria-label="Suggested questions">
        {prompts.map((p) => (
          <button
            className="question-link"
            key={p.label}
            onClick={() => onAsk(p.text)}
            disabled={busy}
          >
            <span>{p.label}</span>
            <ArrowUpRight size={15} aria-hidden="true" />
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
                {project.url ? (
                  <a
                    href={project.url}
                    aria-label={
                      project.linkLabel ?? `${project.title} on GitHub`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {project.linkLabel ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <Github size={18} />
                    )}
                  </a>
                ) : (
                  <span className="project-stack">Private repository</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="page-footnote">
        Independent portfolio projects, listed in priority order. Explore each
        project with AounOS or follow its available demo or repository link.
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
          do something useful, from classical machine learning to
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
