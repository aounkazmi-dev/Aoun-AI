export const prompts = [
  {
    label: "Who is Aoun?",
    text: "Who is Aoun, and what is he working toward?",
  },
  {
    label: "What have you built?",
    text: "Tell me about AutoSalon and Reel2Build, then Aoun's other projects.",
  },
  {
    label: "What are you learning next?",
    text: "What is Aoun learning next, and what are his learning goals?",
  },
  {
    label: "What are your skills?",
    text: "What are Aoun’s technical skills and project experience?",
  },
];
type Project = {
  title: string;
  category: string;
  description: string;
  stack: string;
  url?: string;
  linkLabel?: string;
  mark: string;
  color: string;
};

// Presentation priority: keep this order aligned with knowledge/profile.md.
export const projects: Project[] = [
  {
    title: "AutoSalon",
    category: "WHATSAPP AI AGENT",
    description:
      "A WhatsApp receptionist backend with tool-based appointment booking, voice transcription, and persistent conversation memory.",
    stack: "LangGraph · FastAPI · Groq · PostgreSQL",
    mark: "A",
    color: "mint",
  },
  {
    title: "Reel2Build",
    category: "MULTIMODAL AI",
    description:
      "Turns Instagram Reels and MP4 project demos into video analysis and step-by-step build roadmaps.",
    stack: "LangGraph · Groq · FFmpeg · React",
    url: "https://reel2build.onrender.com",
    linkLabel: "Reel2Build live demo",
    mark: "R",
    color: "blue",
  },
  {
    title: "DataBuddy",
    category: "AGENTIC AI",
    description:
      "An AI data analyst that turns questions into SQL, statistics, and visualizations.",
    stack: "LangGraph · DuckDB · Streamlit",
    url: "https://github.com/aounkazmi-dev/DataBuddy",
    mark: "D",
    color: "mint",
  },
  {
    title: "AskOne",
    category: "RETRIEVAL & LLMS",
    description:
      "A resume-grounded interview companion with adaptive questions and feedback.",
    stack: "Gemini · Chroma · Groq",
    url: "https://github.com/aounkazmi-dev/AskOne",
    mark: "A",
    color: "blue",
  },
  {
    title: "News Classifier",
    category: "MACHINE LEARNING",
    description:
      "A classical NLP pipeline for categorizing news with TF-IDF and Logistic Regression.",
    stack: "scikit-learn · Python · Streamlit",
    url: "https://github.com/aounkazmi-dev/News-classifier",
    mark: "N",
    color: "peach",
  },
  {
    title: "DueBee",
    category: "FULL-STACK",
    description:
      "Bill management, scheduled reminders, and simple statistical forecasting.",
    stack: "React · FastAPI · PostgreSQL",
    url: "https://github.com/aounkazmi-dev/DueBee",
    mark: "B",
    color: "lilac",
  },
];
