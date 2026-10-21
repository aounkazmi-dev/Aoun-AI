---
category: technical_skills
visibility: public
last_updated: 2026-10-20
---

# Technical Skills

This file separates technologies Aoun lists on his CV from demonstrated project evidence. A skill appearing here does not automatically mean expert-level proficiency. Describe capability using specific examples and avoid unsupported mastery claims.

## 1. Data Science and Analytics

**Listed tools and concepts:** Python, NumPy, Pandas, SQL, Matplotlib, Seaborn, Streamlit, data preprocessing, feature engineering, model evaluation, descriptive statistics, correlation, hypothesis testing, and data visualization.

**Project evidence:** DataBuddy combines Pandas and DuckDB with SQL queries, descriptive statistics, correlation, independent two-sample t-tests, interactive Plotly charts, and natural-language explanations. The Laptop Price Prediction project covers data preprocessing, one-hot encoding, feature scaling, regression, and evaluation.

**How to position it:** Aoun is interested in analytical workflows that produce evidence-based answers from data, not just attractive dashboards. DataBuddy is the clearest demonstration of that direction.

## 2. Machine Learning

**Listed tools and concepts:** scikit-learn, TensorFlow, supervised learning, regression, classification, feature engineering, model training, model evaluation, and fine-tuning.

**Project evidence:** News Classifier uses TF-IDF feature extraction and Logistic Regression for multiclass news categorization, with approximately 91% test accuracy reported in its README. Laptop Price Prediction uses regression and a preprocessing pipeline. DueBee includes a hand-written least-squares linear trend forecast, which is basic statistical forecasting rather than a trained ML product.

**How to position it:** Aoun has hands-on project experience with classical ML pipelines and is developing broader ML engineering capability. Do not claim a 99% score as general model quality without the dataset, split, and evaluation details; the Laptop Price Prediction README reports R² around 0.99, which may need validation for leakage or evaluation methodology.

## 3. Deep Learning and NLP

**Listed areas:** ANN, CNN, RNN, LSTM, Transformers, NLP, model training, and fine-tuning.

**Known applied project evidence:** News Classifier demonstrates NLP feature extraction and text classification with TF-IDF and Logistic Regression. The current repository evidence does not establish that Aoun has built and deployed CNN, RNN, LSTM, or Transformer models himself. Treat these as listed study areas or technical interests unless a specific implementation is confirmed.

## 4. Generative AI, LLMs, and AI Engineering

**Listed tools and concepts:** LangChain, LangGraph, RAG, agent workflows, tool calling, MCP, prompt engineering, embeddings, Chroma, FAISS, LLM integration, and LangSmith.

**Project evidence:**
- DataBuddy uses LangGraph orchestration and an LLM to choose among SQL, statistical, visualization, report, and Python-code fallback paths.
- AskOne parses resume PDFs, chunks text, creates Gemini embeddings, stores vectors in Chroma, retrieves resume context, and uses Groq's Llama 3.3 70B model to generate an adaptive interview and feedback report.

**How to position it:** Aoun is learning to engineer LLM-powered applications with retrieval and tool use. Explain the architecture and practical trade-offs. Do not imply that he trained the underlying foundation models or that RAG guarantees zero hallucinations.

## 5. Backend, APIs, and Databases

**Listed tools:** FastAPI, Node.js, Express.js, REST APIs, SQL, MSSQL, PostgreSQL, SQLAlchemy, Pydantic, JWT authentication, and database integration.

**Project evidence:** BloodBridge uses Node.js, Express, and MSSQL for donation-management workflows. DueBee uses FastAPI, SQLAlchemy, PostgreSQL on Neon, JWT authentication, and the Resend email API.

## 6. Frontend and Application Delivery

**Listed tools:** HTML, CSS, JavaScript, React, Streamlit, Git, GitHub, Render, Vercel, Jupyter Notebook, and Google Colab.

**Project evidence:** DataBuddy and AskOne are Streamlit applications; BloodBridge has a browser frontend; DueBee has a React/Vite frontend and deployed backend. The repositories show experience connecting application interfaces to backend logic and external services.

## 7. Programming Languages

Python, C, C++, JavaScript, and SQL are listed on the CV. C++ projects also include an automobile insurance management system and a 2D SFML space shooter; an x86 Assembly car-racing game is also present in the repositories.

## Recommended skill summary

A concise, evidence-based summary is: **Python, data analysis, classical machine learning, NLP, LLM application development, RAG, LangGraph-based agent workflows, SQL/databases, API development, and full-stack integration.**
