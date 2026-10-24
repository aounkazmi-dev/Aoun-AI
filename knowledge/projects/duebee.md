---
visibility: public
category: project
name: DueBee
status: built_and_deployed
focus: full_stack, backend, automation, basic_analytics
---

# DueBee — Bill Management and Reminder Application

**Frontend:** https://duebee-chi.vercel.app  
**Backend API docs:** https://duebee-backend.onrender.com/docs  
**GitHub:** https://github.com/aounkazmi-dev/DueBee

## Summary

DueBee is a full-stack bill-management application. Users can register, log in, record and track utility bills, receive automated email reminders, and view simple statistical forecasts based on their own bill history.

## Reported stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Python, FastAPI, Uvicorn
- Database: PostgreSQL hosted on Neon
- ORM and validation: SQLAlchemy, Pydantic
- Authentication: JWT and password hashing with Passlib/bcrypt
- Email: Resend API
- Deployment: Vercel frontend, Render backend
- Scheduled automation: GitHub Actions workflow calls a reminder-check endpoint daily

## Reported features

- User registration and login
- Per-user bill data isolation
- Bill creation, listing, and deletion
- Due dates, billing month, category, paid/unpaid/overdue status, and optional usage units
- Daily reminder emails for bills due that day
- Duplicate-send protection using a `reminder_sent` flag
- Category-based bill forecasts and rule-based spending insights

## Analytics boundary

The forecast is a hand-written least-squares linear trend over historical bill amounts, not a trained ML model. Spending insights are threshold-based rules. The current deployed application does not include OCR, an LLM, RAG, or an AI agent, according to its README. The original OCR scanner idea is not implemented in the current version.

## Engineering themes demonstrated

- Full-stack integration from React frontend to API and database
- Authentication and user-level data isolation
- Database modeling and REST API design
- Integration with an external email service
- Scheduled automation independent of the user keeping the frontend open
- Deploying and documenting a multi-service application
