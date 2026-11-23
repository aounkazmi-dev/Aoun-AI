---
visibility: public
category: project
name: AutoSalon
status: built
focus: agentic_ai, backend, whatsapp, tool_calling
last_updated: 2026-11-23
---

# AutoSalon — WhatsApp AI Receptionist Backend

**Portfolio priority:** 1, Aoun's first featured project.
**Repository:** https://github.com/aounkazmi-dev/AutoSalon (private; visitors may not have access).
**Evidence:** repository README reviewed on November 23, 2026. Capabilities below are repository-reported, not an independent production audit. The included AounSalon business profile is synthetic.

## Summary

AutoSalon is a WhatsApp AI receptionist backend that answers business questions, remembers customer conversations, transcribes incoming voice notes, and books appointments through validated tools. It supports English, Urdu, and Roman Urdu. The language model interprets requests and selects tools; Python and the database handle customer identity, validation, availability, and booking persistence.

## Stack and architecture

Python 3.13, FastAPI, Uvicorn, LangGraph, LangChain tools, Groq for language-model inference and transcription, Meta WhatsApp Cloud API, and SQLAlchemy with PostgreSQL. SQLite supports local development. The documented hosting approach uses Render for the application and Neon for PostgreSQL; this portfolio does not establish a public live demo or always-on production status.

Meta sends a signed webhook. FastAPI verifies it and saves the incoming message before acknowledgement. A worker loads that customer's recent conversation, invokes the agent or handles a recognized confirmation directly, sends the reply through Meta, and records the completed conversation turn. Customer identity is supplied by the backend rather than chosen by the model.

## Agent tools and booking flow

- `get_salon_info`: reads the structured business catalog.
- `check_availability`: computes valid appointment starts from the schedule, service duration, and existing appointments.
- `prepare_appointment`: saves a ten-minute booking proposal for the customer to confirm.
- `book_appointment`: rechecks capacity and commits a confirmed appointment atomically; repeated confirmation returns the same booking.
- `get_my_appointments`: retrieves the verified customer's upcoming appointments.

A proposal does not reserve the slot. Confirmation rechecks availability in a database transaction to prevent competing bookings from exceeding capacity. A recognized confirmation of a stored proposal uses zero LLM calls. The booking is saved before its confirmation message is sent; a messaging failure does not undo the appointment.

## Memory and reliability

PostgreSQL preserves conversation records across application restarts. The backend loads the latest 20 complete turns within its retention period and isolates customers using a stable identity key. Duplicate incoming WhatsApp message IDs are suppressed while retained. Queued work can recover after restart; interrupted or ambiguous outgoing sends are held for inspection. Meta accepting a message does not establish delivery.

## Engineering themes and limitations

AutoSalon demonstrates tool-calling orchestration, webhook verification, persistent customer memory, backend-owned identity, idempotent confirmation, and concurrency-aware booking. It uses structured catalog lookup, not a vector database or RAG pipeline. It is a single-business implementation with one worker/instance, not a shared multi-business service.

Cancellation, rescheduling, owner alerts, appointment reminders, payments, staff-calendar integration, and human takeover are not implemented. Free hosting can sleep. Do not claim paying users, production uptime, revenue, or independent verification of every documented capability.
