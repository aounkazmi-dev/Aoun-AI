import { Sparkles, FolderCode, Layers, GraduationCap } from "lucide-react";
export const prompts = [
  {
    icon: Sparkles,
    label: "Meet the builder",
    text: "Who is Aoun, and what is he working toward?",
    hint: "The person behind the projects",
  },
  {
    icon: FolderCode,
    label: "Explore my projects",
    text: "Tell me about DataBuddy and AskOne.",
    hint: "From an idea to working software",
  },
  {
    icon: Layers,
    label: "Go under the hood",
    text: "How does AskOne use retrieval-augmented generation?",
    hint: "Architecture, tools, and trade-offs",
  },
  {
    icon: GraduationCap,
    label: "Skills & experience",
    text: "What are Aoun’s technical skills and project experience?",
    hint: "What I’ve built. What I’m learning.",
  },
];
export const projects = [
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
