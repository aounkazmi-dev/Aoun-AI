---
visibility: public
category: project
name: AskOne
status: built_and_deployed
focus: generative_ai, rag, document_processing
---

# AskOne — LLM-Powered Resume Interviewer

**Live demo:** https://askone.onrender.com  
**GitHub:** https://github.com/aounkazmi-dev/AskOne

## Summary

AskOne is a resume-aware mock-interview application. A user uploads a PDF resume; the application extracts and chunks its text, embeds the chunks, stores them in Chroma, retrieves relevant context, and uses an LLM to generate a structured interview and personalized feedback.

## Reported stack

- Python and Streamlit
- LangChain
- `pypdf` for PDF text extraction
- Google Gemini `models/gemini-embedding-001` for embeddings
- Chroma vector store
- Groq-hosted `llama-3.3-70b-versatile` for questions and feedback
- `fpdf2` for downloadable PDF reports

## Reported features

- Resume-grounded interview questions
- Fixed 10-question interview flow
- Progressive difficulty from easy to medium to hard
- Feedback on strengths, weaknesses, and improvement areas
- Downloadable report containing interview Q&A and feedback

## Pipeline

1. Upload a PDF resume.
2. Extract text and split it into chunks.
3. Generate embeddings and store chunks in Chroma.
4. Retrieve relevant resume context for interview generation.
5. Use the LLM to generate questions, increasing difficulty through the interview.
6. Generate feedback and compile a downloadable PDF report.

## Engineering themes demonstrated

- Document ingestion and text chunking
- Embedding-based retrieval
- RAG application architecture
- LLM API integration
- Stateful interview flow and difficulty progression
- Structured report generation

## Accurate limitations

AskOne integrates existing embedding and language models; it does not train them. Do not claim that retrieval makes every answer fully grounded or eliminates hallucinations. The README notes that only PDF resumes are supported and that the deployed Render free tier may take time to wake after inactivity.

## Suggested explanation

“AskOne let Aoun explore the full RAG path in a real application: parsing a document, chunking and embedding it, retrieving relevant resume context, using an LLM for an adaptive interview, and packaging the result as a feedback report.”
