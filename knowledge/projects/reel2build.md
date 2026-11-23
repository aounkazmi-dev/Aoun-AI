---
visibility: public
category: project
name: Reel2Build
status: built_and_deployed
focus: multimodal_ai, video_analysis, agentic_ai
last_updated: 2026-11-23
---

# Reel2Build — Video Analysis and Build Roadmaps

**Portfolio priority:** 2, after AutoSalon.
**Live demo:** https://reel2build.onrender.com
**Repository:** https://github.com/aounkazmi-dev/reel2build (private; visitors may not have access).
**Evidence:** repository README reviewed on November 23, 2026. Deployment and capabilities are repository-reported; this is not an independent production audit.

## Summary

Reel2Build turns a project demo in an Instagram Reel or uploaded MP4 into a short analysis and a step-by-step build roadmap. It distinguishes observations from assumptions and details the viewer needs to confirm. The roadmap describes how to build a project; the application does not automatically generate or deploy the finished project.

## Stack and pipeline

React and Vite provide the frontend; Python and FastAPI provide the backend. LangGraph orchestrates analysis, yt-dlp imports public Instagram videos, and FFmpeg samples frames locally. Groq supplies speech transcription, visual analysis, and text-based roadmap generation.

1. Import a public Instagram Reel or upload an MP4. The documented limits are 50 MB and three minutes; MP4 upload is the fallback when Instagram blocks downloading.
2. Analyze the video: extract frames, transcribe audio when available, and analyze frames together with the transcript. Return a classification, timestamped observations, and uncertainties.
3. For detected project demos, generate a roadmap only when requested. It includes assumptions, ordered build steps, and a check for each step.

A fresh analysis uses up to two model requests, and a new roadmap uses one. Matching completed requests reuse locally cached results. An alternative Hugging Face inference route is documented; it requires inference credits and skips speech transcription.

## Deployment and limitations

The repository documents a Docker deployment on Render that builds React and serves it from FastAPI on one origin. Imported videos and cached outputs live in local backend storage and are cleared when the free service restarts. An inactive free service can take about a minute to wake.

Instagram downloads may be blocked, visual interpretation can be incomplete, and generated roadmaps depend on model output and assumptions. Do not claim that the app recovers source code, proves a video's hidden implementation, always downloads Instagram content, or implements the roadmap automatically.
