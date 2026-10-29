# AI Video Captioning - Multilingual Caption Editor

A production-ready MVP for AI-powered video captioning with word-level timestamps, supporting Telugu, Hindi, and English languages.

## 🎯 Features

### Core Features (V1)
- **Automatic Transcription**: ElevenLabs Scribe API integration for accurate speech-to-text
- **Word-Level Timestamps**: Precise timing for each word
- **50+ Caption Templates**: Professionally designed templates across 10 categories
- **Multilingual Support**: Telugu (తెలుగు), Hindi (हिंदी), and English
- **Full Editor**: Edit text, timing, fonts, colors, and animations
- **Word Highlighting**: Accentuate important words
- **Multiple Animations**: Fade, pop, slide, scale, karaoke, and more
- **Video Preview**: Real-time preview of caption edits
- **Export & Download**: Export to MP4 with styled captions

### Supported Languages
- 🇬🇧 **English**: Latin script with standard fonts
- 🇮🇳 **Hindi (हिंदी)**: Devanagari script with proper font support
- 🇮🇳 **Telugu (తెలుగు)**: Telugu script with native fonts

## 🏗️ Architecture

```
User → Next.js Frontend → FastAPI Backend → Video Processing
                                      ↓
                              ElevenLabs Scribe (STT)
                                      ↓
                              Caption Segmentation
                                      ↓
                              Caption Editor (Frontend)
                                      ↓
                              Remotion Rendering
                                      ↓
                              FFmpeg Encoding
                                      ↓
                              MP4 Export → Download
                                      ↓
                              Cleanup Temporary Files
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Supabase Auth**: Authentication
- **Remotion**: Programmatic video rendering
- **React Player**: Video preview

### Backend
- **Python 3.11+**: Core language
- **FastAPI**: High-performance API framework
- **SQLAlchemy**: ORM for database operations
- **Supabase PostgreSQL**: Database
- **ElevenLabs Scribe**: Speech-to-text API
- **FFmpeg**: Video/audio processing
- **Pydantic**: Data validation

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Database**: Supabase PostgreSQL
- **Version Control**: Git + GitHub

### Testing
- **Backend**: pytest
- **Frontend**: Vitest + React Testing Library
- **E2E**: Playwright

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- FFmpeg installed and added to PATH
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd caption-generator
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Groq (Future AI Features)
GROQ_API_KEY=your-groq-api-key

# Database
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Security
SECRET_KEY=your-secret-key-here
```

### 3. Database Setup

Run the SQL schema from `docs/database-schema.sql` in your Supabase SQL editor.

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 Running the Application

### Development

**Backend** (Terminal 1):
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:3000`

### Production Build

**Backend**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend**:
```bash
npm run build
npm run start
```

## 📝 API Documentation

Once the backend is running, access the API docs:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

### Key Endpoints

**Authentication**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Logout

**Projects**
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project
- `DELETE /api/projects/{id}` - Delete project

**Upload**
- `POST /api/projects/{id}/upload` - Upload video
- `GET /api/projects/{id}/upload/status` - Upload status

**Transcription**
- `POST /api/projects/{id}/transcribe` - Start transcription

**Captions**
- `GET /api/projects/{id}/captions` - Get captions
- `PATCH /api/captions/{id}` - Update caption
- `POST /api/{id}/captions/split` - Split caption
- `POST /api/{id}/captions/merge` - Merge captions

**Templates**
- `GET /api/templates` - List all 50 templates
- `GET /api/templates/{id}` - Get template
- `POST /api/projects/{id}/apply-template` - Apply template

**Export**
- `POST /api/projects/{id}/export` - Create export
- `GET /api/exports/{id}` - Get export status
- `GET /api/exports/{id}/download` - Download video

## 🎨 Template Categories

50 unique templates across 10 categories:

1. **Clean** (5) - Minimal, professional styles
2. **Bold** (5) - High-impact, attention-grabbing
3. **Minimal** (5) - Subtle, refined designs
4. **Highlight** (5) - Word-focused accentuation
5. **Karaoke** (5) - Sing-along style with word fill
6. **Neon** (5) - Glowing, cyberpunk aesthetic
7. **Cinematic** (5) - Film-style captions
8. **Tech** (5) - Digital, futuristic look
9. **News** (5) - Broadcast-style tickers
10. **Social** (5) - Platform-optimized for TikTok, Instagram, etc.

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

## 🔧 Configuration

### File Size Limits
Maximum video file size: **500MB** (configurable in `.env`)

### Supported Video Formats
- MP4
- MOV
- WebM

### Environment Variables

See `.env.example` files in both `backend/` and `frontend/` directories for complete configuration options.

## 📊 Database Schema

Key tables:
- `users` - User accounts
- `projects` - Video projects
- `caption_segments` - Caption segments with timing
- `caption_words` - Word-level timestamps
- `templates` - Caption template configurations
- `fonts` - Font registry
- `exports` - Export job tracking

See `docs/database-schema.sql` for complete schema.

## 🔒 Security

- API keys are stored securely on the backend
- Frontend never has access to sensitive API keys
- File uploads are validated for type and size
- Path traversal protection
- Input validation with Pydantic
- Temporary files are automatically deleted after processing

## 🚧 Current Limitations (V1)

- No permanent video storage (temporary files only)
- Single project ownership (no collaboration)
- Basic template application (no per-segment customization)
- No auto-detect language (must select manually)
- Limited to 3 languages
- Groq AI features not implemented yet (future phase)

## 🔮 Future Roadmap

### Phase 2: Advanced AI Features
- Smart word highlighting with Groq
- AI caption restructuring
- Context-aware style recommendations
- Auto-detect language

### Phase 3: Smart Positioning
- Face-aware caption positioning
- Object-aware placement
- Dynamic positioning

### Phase 4: Creator Tools
- Caption presets & style memory
- Platform-specific layouts
- AI-generated caption styles
- B-roll suggestions

### Phase 5: Platform Features
- Team collaboration
- Cloud storage
- Subscription tiers
- Advanced analytics

## 🤝 Contributing

This is a portfolio project demonstrating full-stack development capabilities.

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Credits

Built with:
- [ElevenLabs](https://elevenlabs.io/) - Speech-to-text
- [Supabase](https://supabase.com/) - Database & Auth
- [Remotion](https://remotion.dev/) - Video rendering
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework

---

**Note**: This application does NOT use OpenAI API or xAI Grok API. For AI features, it uses Groq API (G-R-O-Q).

**Important**: This is NOT a clone of AutoCap or any other existing application. The design, code, and templates are original work created specifically for this project.
