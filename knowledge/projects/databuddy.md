---
visibility: public
category: project
name: DataBuddy
status: built_and_deployed
focus: data_science, analytics, agentic_ai
---

# DataBuddy — AI Data Analyst Agent

**Live demo:** https://databuddyhere.streamlit.app  
**GitHub:** https://github.com/aounkazmi-dev/DataBuddy

## Summary

DataBuddy is an agentic data-analysis application. Users upload CSV or Excel data and ask business or analytical questions in natural language. Instead of relying only on a model's generated text, the application routes questions to tools that execute queries or computations and then explains the results.

## Reported capabilities

- CSV and Excel ingestion into a Pandas DataFrame and DuckDB table
- Natural-language requests routed through a LangGraph workflow
- SQL generation and execution with DuckDB
- Descriptive statistics and categorical value counts
- Pearson correlation and independent two-sample t-tests
- Interactive Plotly visualizations, including bar, line, scatter, histogram, and box plots as documented by the project
- AI-generated dataset reports and natural-language summaries
- Python-code fallback for questions not covered by the structured tools
- Per-session data isolation, according to the repository README
- Groq inference using Llama 4 Scout, according to the current README

## Architecture

The workflow uses an LLM as an orchestrator. It inspects a question, selects a relevant tool, executes it, observes the output, and produces a final explanation. If the structured tools do not cover a request, a Python snippet can be generated and executed in a restricted execution environment described by the README.

Main files:
- `app.py`: Streamlit interface, uploads, chat, and chart rendering
- `backend.py`: LangGraph state, routing, agent node, and fallback
- `tools.py`: SQL, statistics, charts, reports, and session storage
- `data_ingestion.py`: CSV/Excel loading and DuckDB setup
- `utils.py`: shared helpers and code-execution checks

## Engineering themes demonstrated

- Data ingestion and schema awareness
- Translating natural-language intent into computational steps
- Tool routing and multi-step agent orchestration
- Separating model reasoning from deterministic data computation
- Turning analytical outputs into visual and written explanations
- Designing application-level session isolation

## Accurate limitations

Do not claim that DataBuddy is a general autonomous data scientist, that every generated query is correct, or that it eliminates hallucinations. It is a portfolio application with documented tool coverage and a Python fallback. The quality of answers depends on the data, tool behavior, and generated code.

## Suggested explanation

“DataBuddy is where Aoun's data-science and AI-engineering interests meet. He built an agent workflow that can route a question to SQL, statistical analysis, visualization, reporting, or a Python fallback, so the answer can be grounded in computation rather than only generated text.”
