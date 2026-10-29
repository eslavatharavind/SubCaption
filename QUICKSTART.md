# Quick Start Guide - AI Video Captioning

## 🚀 Quick Setup (5 Minutes)

### Step 1: Database Setup (Supabase)

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to SQL Editor
4. Copy the content from `docs/database-schema.sql`
5. Paste and execute to create all tables

**Get your credentials**:
- Go to Settings > API
- Copy: `Project URL` and `anon public` key

### Step 2: Get API Keys

**ElevenLabs**:
1. Go to https://elevenlabs.io
2. Sign up for free account
3. Go to Profile > API Keys
4. Copy your API key

**Groq** (Future AI features):
1. Go to https://console.groq.com
2. Create account and get API key

### Step 3: Backend Setup

```bash
# Navigate to backend
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - ELEVENLABS_API_KEY
# - SECRET_KEY (generate a random string)
# - DATABASE_URL (from Supabase)

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
```

Backend will start at: **http://localhost:8000**

Test it:
- Open http://localhost:8000/health
- Should see: `{"status": "healthy", ...}`

### Step 4: Frontend Setup

```bash
# Open new terminal
cd frontend

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend will start at: **http://localhost:3000**

---

## 🧪 Testing the API

### Using Swagger UI (Recommended)

1. Backend must be running
2. Open: http://localhost:8000/api/docs
3. Test all endpoints interactively

### Test with curl

```bash
# Health check
curl http://localhost:8000/health

# List templates
curl http://localhost:8000/api/templates

# Specific template
curl http://localhost:8000/api/templates/clean-0
```

---

## 📁 Project Structure

```
caption-generator/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Config and settings
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # Entry point
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/               # Next.js React frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and API client
│   ├── types/            # TypeScript types
│   └── package.json
│
├── docs/                  # Documentation
│   └── database-schema.sql
│
├── README.md              # Full documentation
├── PROJECT_STATUS.md      # Implementation status
└── IMPLEMENTATION_PLAN.md # Development phases
```

---

## 🔑 Required Environment Variables

### Backend (.env)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
ELEVENLABS_API_KEY=your-elevenlabs-key
GROQ_API_KEY=your-groq-key
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
SECRET_KEY=your-random-secret-key-min-32-characters
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🐛 Common Issues

### Backend won't start

**Problem**: Module not found
```bash
# Solution: Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**Problem**: Database connection error
```bash
# Solution: Check DATABASE_URL in .env
# Must be: postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
```

### Frontend won't start

**Problem**: Module not found
```bash
# Solution: Install dependencies
npm install
```

**Problem**: Environment variables not loaded
```bash
# Solution: Restart dev server after creating .env.local
npm run dev
```

### Database errors

**Problem**: Tables don't exist
```bash
# Solution: Run database schema in Supabase SQL Editor
# File: docs/database-schema.sql
```

---

## 📊 API Endpoints Overview

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project
- `DELETE /api/projects/{id}` - Delete project

### Video Upload
- `POST /api/projects/{id}/upload` - Upload video
- `GET /api/projects/{id}/upload/status` - Upload status

### Transcription
- `POST /api/projects/{id}/transcribe` - Start transcription

### Captions
- `GET /api/projects/{id}/captions` - Get all captions
- `PATCH /api/captions/{id}` - Update caption
- `POST /api/projects/{id}/captions/split` - Split caption
- `POST /api/projects/{id}/captions/merge` - Merge captions

### Templates
- `GET /api/templates` - List 50 templates
- `GET /api/templates/{id}` - Get template
- `POST /api/projects/{id}/apply-template` - Apply template

### Export
- `POST /api/projects/{id}/export` - Start export
- `GET /api/exports/{id}` - Get export status
- `GET /api/exports/{id}/download` - Download video

---

## 🎨 Template Categories

All 50 templates are ready to use:

1. **Clean** - Simple, professional
2. **Bold** - High-impact, attention-grabbing
3. **Minimal** - Subtle, refined
4. **Highlight** - Word-focused accentuation
5. **Karaoke** - Sing-along style with word fill
6. **Neon** - Glowing, cyberpunk aesthetic
7. **Cinematic** - Film-style captions
8. **Tech** - Digital, futuristic look
9. **News** - Broadcast-style tickers
10. **Social** - Platform-optimized styles

Example usage:
```bash
GET http://localhost:8000/api/templates?category=bold
GET http://localhost:8000/api/templates/neon-0
```

---

## 🌍 Supported Languages

1. **English (en)** - Latin script
2. **Hindi (hi)** - Devanagari script (हिंदी)
3. **Telugu (te)** - Telugu script (తెలుగు)

Each language has:
- Proper font support
- Language-aware caption segmentation
- Native script rendering

---

## ✅ Current Implementation Status

**What's Working**:
- ✅ Complete backend API (all endpoints)
- ✅ Database schema with RLS
- ✅ 50 unique caption templates
- ✅ Caption segmentation engine
- ✅ Word-level timestamp support
- ✅ Frontend structure and routing
- ✅ API client and utilities

**Next Steps**:
- ⏳ Authentication UI (login/signup pages)
- ⏳ Video upload component
- ⏳ Caption editor interface
- ⏳ Video preview player
- ⏳ Template gallery UI
- ⏳ Remotion rendering integration
- ⏳ Export progress tracking

---

## 🧪 Test Right Now

### Backend Test
```bash
# Terminal 1
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2
curl http://localhost:8000/health
curl http://localhost:8000/api/templates
```

### Frontend Test
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

## 📞 Need Help?

1. Check `PROJECT_STATUS.md` for implementation details
2. Check `README.md` for full documentation
3. Check API docs at http://localhost:8000/api/docs
4. Check database schema in `docs/database-schema.sql`

---

## 🎯 Recommended Workflow

1. **Setup**: Follow Steps 1-4 above
2. **Test**: Verify health endpoints and API docs
3. **Develop**: Start with authentication UI
4. **Integrate**: Connect video upload flow
5. **Build**: Create caption editor
6. **Render**: Add Remotion integration
7. **Deploy**: Push to Vercel + Render

---

Ready to build! 🚀
