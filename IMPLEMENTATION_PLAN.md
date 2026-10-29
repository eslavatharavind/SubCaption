# AI Video Captioning MVP - Implementation Plan

## Project Overview
Building a production-ready multilingual AI video captioning and caption-template web application.

**Stack:**
- Frontend: Next.js + React + TypeScript + Tailwind CSS
- Backend: Python + FastAPI
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- STT: ElevenLabs Scribe API
- AI Layer: Groq API (modular, future use)
- Video Processing: FFmpeg
- Rendering: Remotion + FFmpeg

**Supported Languages (V1):**
1. Telugu (Telugu script)
2. Hindi (Devanagari)
3. English (Latin script)

## Development Phases

### Phase 1: Project Setup
- Create folder structure
- Initialize frontend (Next.js)
- Initialize backend (FastAPI)
- Setup environment configuration
- Create .env.example

### Phase 2: Database Schema
- Design PostgreSQL schema via Supabase
- Create tables: users, projects, caption_segments, caption_words, templates, fonts, exports
- Setup relationships and indexes

### Phase 3: Backend Core
- FastAPI app skeleton
- Health check endpoint
- CORS configuration
- Basic routing structure
- Pydantic schemas
- Config management

### Phase 4: Frontend Shell
- Next.js App Router setup
- Basic routing structure
- Tailwind configuration
- Component library setup
- API client setup

### Phase 5: Authentication ✅ COMPLETED
- ✅ Supabase Auth integration (backend + frontend)
- ✅ Complete auth API with signup, login, logout, refresh
- ✅ Login/Signup pages with form validation
- ✅ Protected routes with auth guards
- ✅ Auth context with state management
- ✅ Token handling with JWT verification
- ✅ Backend security module with Supabase client
- ✅ All project endpoints require authentication
- ✅ Unit tests for auth endpoints and security

### Phase 6: Video Upload
- Upload component with drag/drop
- File validation (MP4, MOV, WebM)
- File size limits
- Upload progress UI
- Backend upload handling

### Phase 7: Audio Processing
- FFmpeg service
- Audio extraction
- Video metadata extraction
- Temporary file handling

### Phase 8: Transcription
- ElevenLabs Scribe integration
- Language selection (Telugu, Hindi, English)
- Transcription status tracking
- Error handling

### Phase 9: Caption Segmentation
- Caption segmentation engine
- Word-level timing extraction
- Language-aware segmentation
- Caption JSON generation

### Phase 10: Caption Editor UI
- Video player with preview
- Caption overlay
- Timeline component
- Caption editing interface
- Real-time preview

### Phase 11: Template System
- Create 50 unique caption templates
- Template configuration JSON
- Template categories (Clean, Bold, Minimal, Highlight, Karaoke, Neon, Cinematic, Tech, News, Social)
- Template gallery UI

### Phase 12: Editor Features
- Font system (English, Telugu, Hindi fonts)
- Color picker
- Word highlighting
- Position controls
- Animation system (fade, pop, slide, scale, karaoke)
- Apply to all functionality

### Phase 13: Preview System
- Real-time preview with HTML5 video
- Caption synchronization
- Template rendering preview

### Phase 14: Render & Export
- Remotion integration
- Caption composition
- FFmpeg final encoding
- Export progress tracking
- MP4 download

### Phase 15: Cleanup System
- Temporary file deletion
- Export lifecycle management
- Error state cleanup

### Phase 16: Testing
- Backend unit tests (Pytest)
- Frontend component tests (Vitest)
- E2E tests (Playwright)
- API integration tests

### Phase 17: Documentation
- README.md
- API documentation
- Architecture docs
- Setup instructions
- Environment configuration

### Phase 18: Deployment
- Frontend: Vercel
- Backend: Render
- Environment variables
- CI/CD optional

## Key Architecture Principles

1. **Modular Design**: Groq integration is optional and modular
2. **No Permanent Video Storage**: Upload → Process → Export → Delete
3. **Clean Separation**: Frontend, Backend, Services clearly separated
4. **Security First**: API keys on backend, validate everything
5. **Language Awareness**: Telugu, Hindi, English support from day one
6. **Template-Driven**: 50 high-quality templates
7. **Word-Level Precision**: Timestamps for each word
8. **Production-Ready**: Error handling, testing, documentation

## Current Status
✅ Phase 1-5 Complete (Authentication System)
⏳ Next: Video Upload System (Phase 6)
