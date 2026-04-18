# DEEPCHOX - Zero-Data, Report-First Virtual AI Office

A cutting-edge multi-agent business intelligence application built with Next.js 15, featuring four specialized AI agents (CEO, Product Manager, Accountant, Business Scout) that collaborate to create comprehensive business plans.

## 🎯 Core Features

- **Zero-Data Architecture**: All data is stored locally in the browser using Dexie.js (IndexedDB). No data is sent to external servers.
- **Multi-Agent System**: Four specialized AI agents with distinct roles and expertise:
  - 🎯 **CEO Strategist** - Visionary strategic planning (SWOT, Lean Canvas, Pivot Analysis)
  - 📋 **Product Manager** - Practical execution plans (PRDs, User Stories, Sprints)
  - 💰 **Accountant** - Financial analysis (Burn-rate, ROI, Budgeting)
  - 🔍 **Business Scout** - Market intelligence (Trends, Competitive gaps)
- **Real-time Report Preview**: Live updates as agents contribute to the project
- **Professional PDF Generation**: Auto-generate 4-page branded reports with jsPDF
- **Freemium Model**: 5 free messages per project, then paywall for full PDF download
- **Soft-Toned UI**: Custom "Sunwashed Soft" design palette for pleasant UX

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS v4 with custom color palette
- **Database**: Dexie.js (IndexedDB wrapper)
- **PDF Generation**: jsPDF
- **Icons**: Lucide React
- **AI Backend**: Google Gemini 1.5 Flash API

### Project Structure

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Gemini API integration
│   ├── layout.tsx                # Root layout with OfficeProvider
│   ├── page.tsx                  # Main app page
│   ├── globals.css               # Tailwind directives & custom styles
│   └── .env.local               # API key configuration
├── lib/
│   ├── db.ts                     # Dexie.js schema and helpers
│   ├── OfficeContext.tsx         # React Context for state management
│   └── agents.ts                 # Agent system prompts
├── components/
│   ├── Sidebar.tsx               # Project navigation & agent desk switcher
│   ├── Workspace.tsx             # Main split-view layout
│   ├── ChatWindow.tsx            # AI chat interface
│   ├── LiveReportPreview.tsx    # Real-time report display
│   └── ReportGenerator.tsx       # PDF generation component
├── tailwind.config.js            # Tailwind configuration with custom colors
├── postcss.config.js             # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
└── package.json                  # Dependencies & scripts
```

## 🎨 Design System

### Color Palette (Sunwashed Soft)
```
- office-cream:    #FDFCF0  (Background)
- office-sage:     #D1E2C4  (Accents)
- office-yellow:   #F9F1C0  (Highlights)
- office-espresso: #2C1B18  (Text)
```

### Typography & Spacing
- Border Radius: 24px for all cards
- Borders: 0.5px subtle espresso borders
- Transitions: 300ms smooth animations
- Spacing: Consistent 4px/8px/16px/24px grid

## 🚀 Getting Started

## Python Cofounder Backend (new)

This repo now includes a Flask-compatible backend starter for a persistent AI cofounder loop under `backend/`.

### Backend structure

```text
backend/
  app.py                         # Flask entrypoint
  requirements.txt               # Python deps
  cofounder/
    models.py                    # Canonical Project + structured state types
    agents/
      personal_architect.py      # Intake + semantic project writes
      research_agent.py          # Gap filling + uncertainty labels
      dexo_execution.py          # Roadmap + task generation
    engine/
      completeness.py            # Completeness / weak-field analysis
      desk_feed.py               # Structured desk update generation
      loop.py                    # run_cofounder_loop(project, ...)
    scheduler/
      daily.py                   # Daily loop trigger wrapper
    storage/
      repository.py              # In-memory repository starter
  examples/
    sample_run.py                # Example project creation run
```

### Run the backend example

```bash
python -m backend.examples.sample_run
```

### Run the Flask app

```bash
pip install -r backend/requirements.txt
python -m backend.app
```

API endpoints:

- `POST /projects`
- `POST /projects/<project_id>/input`
- `POST /scheduler/daily`
- `GET /projects/<project_id>`

### 1. Setup Environment Variables
Create `.env.local` in the project root:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free Gemini API key at [ai.google.dev](https://ai.google.dev)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

## 📊 Database Schema (Dexie.js)

### Projects Table
```typescript
interface Project {
  id?: number;                    // Auto-incremented primary key
  name: string;                   // Project name
  strategy: string;               // CEO insights
  productPlan: string;            // PM roadmap
  budget: string;                 // Financial breakdown
  marketInsights: string;         // Scout market analysis
  timestamp: number;              // Creation/last-modified time
}
```

## 💬 How It Works

### 1. User Creates a Project
- User clicks "+ New Project" in the sidebar
- Project is saved locally to IndexedDB

### 2. Switch Between Agent Desks
- Click on any agent icon (CEO, PM, Accountant, Scout)
- The app changes the system instruction sent to Gemini
- Context switches to that agent's expertise

### 3. Chat with Agent
- User types a message
- Message is sent to `/api/chat` with the agent's system prompt
- Gemini responds with specialized advice
- Response is parsed and saved to the project field
- Live Report Preview updates in real-time

### 4. Free Tier Limit
- First 5 messages per project are free
- After 5 messages, the "Download PDF" button becomes available
- Full PDF contains all 4-agent analysis on a branded 4-page document

### 5. Generate Report
- Click "Download Complete PDF Report"
- jsPDF generates a professional 4-page document with:
  - Title page with project metadata
  - CEO Strategy section
  - PM Roadmap section
  - CFO Financial Analysis section
  - Scout Market Intelligence section
  - Branded footer on every page

## 🔒 Privacy & Security

- **Zero-Data**: No data ever leaves your browser
- **Local Storage**: IndexedDB for persistent browser storage
- **Secure Wipe**: `secureWipeDatabase()` function clears all data
- **HTTPS Only**: API calls are encrypted in transit
- **No Tracking**: No analytics or third-party integrations

## 🛠️ API Routes

### POST /api/chat
Handles chat messages with Gemini 1.5 Flash.

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "..." }
  ],
  "model": "gemini-1.5-flash"
}
```

**Response**:
```json
{
  "choices": [{
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

**Error Handling**:
- Missing `GEMINI_API_KEY` → 500 error
- Invalid messages format → 400 error
- Gemini API errors → Detailed error response with status code

## 📈 Scalability Considerations

- **IndexedDB Limits**: Can handle 5GB+ of data per domain
- **Token Efficiency**: Gemini 1.5 Flash is optimized for cost (~15-20K interactions per ₹3000 budget)
- **Real-time Sync**: All updates are synchronous within the browser
- **No Backend Infrastructure**: Eliminates server scaling concerns

## 🎯 Freemium Model

### Current Implementation
- **Free Tier**: 5 messages per project with unlimited projects
- **Premium Tier**: Download full PDF report (paywall not yet implemented)

### Future: Geo-Logic Pricing
- **India**: ₹79 one-time payment
- **Other**: $2 one-time payment
- Detection: IP-based geo-location
- Unlock: Add `?payment=success` to URL to unlock premium features

## 📝 Agent System Prompts

Each agent has a detailed system prompt that guides their responses:

- **CEO**: Strategic frameworks (SWOT, Lean Canvas, Porter's Five Forces)
- **PM**: Product methodologies (User Stories, PRDs, MoSCoW prioritization)
- **Accountant**: Financial metrics (Burn-rate, ROI, Break-even analysis)
- **Scout**: Market research (Competitive analysis, TAM/SAM/SOM, Trend synthesis)

Prompts are defined in `lib/agents.ts` and can be customized per deployment.

## 🐛 Troubleshooting

### "GEMINI_API_KEY is not set"
- Create `.env.local` with your Gemini API key
- Restart the dev server with `npm run dev`

### Chat messages not saving
- Check browser's IndexedDB is enabled
- Open DevTools → Application → IndexedDB → deepchoxDB
- Verify `projects` table exists

### PDF generation fails
- Ensure all 4 project sections have content
- Check browser console for jsPDF errors
- Try a different browser if issues persist

### Styling looks wrong
- Clear Tailwind cache: `rm -rf .next`
- Rebuild: `npm run dev`
- Hard-refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## 🚦 Next Steps

1. **Geo-Location Pricing**: Add IP detection and payment gateway integration
2. **Authentication**: User login & multi-device sync (optional: Firebase)
3. **Advanced Export**: CSV, Markdown, Slides export formats
4. **Team Collaboration**: Real-time multi-user editing (optional: Yjs + WebSocket)
5. **Offline Mode**: Service Worker for full offline capability
6. **Mobile App**: React Native or Flutter version

## 📄 License

MIT - Feel free to use and modify for commercial or personal projects.

## 🙋 Support

For issues or feature requests:
1. Check this README for troubleshooting
2. Review `lib/agents.ts` for agent customization
3. Examine component files for UI modifications
4. Check API route at `app/api/chat/route.ts` for backend logic

---

**Built with ❤️ for visionary entrepreneurs and business strategists.**

DEEPCHOX © 2026 | Zero-Data, Privacy-First Business Intelligence
