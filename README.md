# Fixxly Category Leader OS (CLOS)

Fixxly CLOS is a state-of-the-art co-pilot platform for Category Leaders in quick-commerce building materials and hardware distribution. It automates inventory replenishment, monitors trade margins, tracks vendor KPIs, and leverages Generative AI (Llama 3.3 70B & Gemini 2.5 Flash) to generate purchase order and pricing recommendations directly inside centered, blurred-backdrop modal overlays.

---

## 🚀 Key Features

* **Executive Cockpit (Command Center):** Aggregated metrics tracking fill rates (%), active SKU counts, stockout levels, and margin alerts.
* **AI Inventory Replenishment:** Real-time stock alerts displaying GMV-at-risk. Includes floating modal overlays recommending order quantities based on vendor lead times and daily demand.
* **Pricing & Margin Engine:** Benchmarks current pricing against competitor price gaps while enforcing a strict trade margin floor (minimum 15%).
* **Content Studio:** Generative SEO copywriting tool to generate listing copies, key features, and meta tags for industrial hardware SKUs.
* **Settings & Seed Controls:** Manage LLM keys, target margin sliders, and perform instant SQLite database seeding.

---

## 💻 Detailed Application Usage Guide

Follow this walkthrough to experience the Category Leader OS:

### 1. Monitor Executive Performance (Cockpit)
* **Action:** Launch the dashboard (`/`).
* **Workflow:** View the real-time card summaries showing SKU count, overall warehouse fill rate, and active stockouts. Check the live stockout heatmap indicating which geographical hub needs immediate stock.

### 2. Auto-Replenishment & Purchase Orders
* **Action:** Navigate to the **Inventory & Replenishment** page.
* **Workflow:** 
  1. View active stock level tables filtered by logistics hub.
  2. Locate any SKU flagged with a red **STOCKOUT** status showing GMV-at-risk.
  3. Click the **`⚡ AI PO`** button.
  4. A centered modal overlay will open on screen with a blurred background. The AI computes current daily demand, vendor lead times, and suggests the exact order quantity and value.
  5. Click **`✓ Approve PO`** or **`✕ Reject`** to execute the action, which clears the alert and resets the modal state.

### 3. Competitor Benchmarking & Dynamic Pricing
* **Action:** Navigate to the **Pricing & Margin Engine** page.
* **Workflow:**
  1. Filter products by **Price Gap** or **Critical Margin** tabs.
  2. Click **`⚡ AI`** on any undercut item.
  3. The pricing modal displays current, competitor, and floor pricing limits.
  4. Review the AI pricing strategies (neutral, competitive, high-margin) and click **`✓ Apply Option 2`** to update the catalog selling price safely.

### 4. Generative SKU Content Production
* **Action:** Navigate to **Product Content AI**.
* **Workflow:** Select a hardware product and click **`Generate copy`**. The LLM builds an optimized product title, short description, contractor-oriented bullet points, and Google SEO keywords.

### 5. Settings Configuration & DB Reseeding
* **Action:** Navigate to **System Settings & Config** (`/settings`).
* **Workflow:** Adjust target margins, modify safety stock metrics, or click **`Reset Database`** to restore default seeded transaction metrics.

---

## 🛠️ Architecture & Tech Stack

```
                     ┌───────────────────────────────┐
                     │     Next.js 14 Client App     │
                     └──────────────┬────────────────┘
                                    │ HTTP Requests
                                    ▼
                     ┌───────────────────────────────┐
                     │      FastAPI Python Server    │
                     └──────────────┬────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
      ┌──────────────────────┐             ┌─────────────────────┐
      │  SQLite DB (Indexed) │             │  LLM (Groq/Gemini)  │
      └──────────────────────┘             └─────────────────────┘
```

### Tabulated Technology Stack

| Component / Layer | Technology | Functional Role |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), Tailwind CSS | Delivers the responsive, glassmorphic layout with fade-in animations. |
| **State & Fetching** | TanStack React Query, Fetch API | Triggers polling requests every 30 seconds to fetch stock alerts. |
| **Notification Engine** | React Hot Toast | Displays execution states and operation confirmations inside the client viewport. |
| **Backend API Server** | FastAPI (Python 3.11.7) | Handles async routers, mathematical inventory limits, and database transactions. |
| **Primary AI Engine** | Groq Llama 3.3 70B | Generates high-speed PO reorder quantities and competitor margins. |
| **Fallback AI Engine** | Google Gemini 2.5 Flash | Acts as automated failover gateway if Groq experiences rate limits or downtime. |
| **Database** | SQLite + SQLAlchemy ORM | Local, indexed relational database storing SKUs, transactions, and vendor OTIF metrics. |

---

## ⚙️ Local Development Setup

### 1. Prerequisiutes
* Node.js (v18 or higher)
* Python (v3.11 recommended)

### 2. Backend Installation & Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Create a `.env` file inside the `backend` folder:
   ```env
   GROQ_API_KEY="your-groq-api-key"
   GEMINI_API_KEY="your-gemini-api-key"
   ```
5. Seed the database with sample inventory and vendor metrics:
   ```bash
   python seed_data.py
   ```
6. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend server will run at: `http://127.0.0.1:8000`

### 3. Frontend Installation & Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure frontend environment variables. Create a `.env.local` inside the `frontend` folder:
   ```env
   NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   The client application will run at: `http://localhost:3000`

---

## 🌐 Production Deployment Steps

### Backend Deployment (Render)
1. Sign up on [Render.com](https://render.com) and link your GitHub repository.
2. Select **New ➔ Web Service** and specify your repository.
3. Configure settings:
   * **Root Directory:** `backend`
   * **Runtime:** `Docker` (It will build the code using the configured `Dockerfile` automatically).
   * **Instance Type:** `Free`
4. Set Environment Variables: Add `GROQ_API_KEY` and `GEMINI_API_KEY` in the Advanced tab.
5. Deploy and copy the generated Web Service URL.

### Frontend Deployment (Vercel)
1. Sign up on [Vercel.com](https://vercel.com) and link your GitHub repository.
2. Click **Add New ➔ Project** and import the repository.
3. Configure settings:
   * **Framework Preset:** `Next.js`
   * **Root Directory:** `frontend`
4. Set Environment Variables: Add `NEXT_PUBLIC_API_URL` pointing to your deployed Render URL.
5. Click **Deploy**.

---

## 📋 Assumptions & Math Models
* **Gross Margin (%)** is calculated as: `((Selling Price - Landed Cost) / Selling Price) * 100`.
* **Safety Stock Reorder Point** is calculated as: `(Average Daily Demand * Lead Time) + Safety Buffer`.
* **Default Trade Margin Floor** is locked at `15%`.

---

## ⚖️ Architectural Trade-offs & Future Work

### Core Trade-offs
1. **Synchronous LLM Recommendations vs. Asynchronous Task Queues:**
   * *Trade-off:* Currently, recommendations are generated on-demand via blocking API requests to Groq/Gemini. This provides immediate, live data for demo purposes but incurs a 2-3 second latency block.
   * *Mitigation:* In production, background workers (e.g., Celery + Redis) should pre-generate and cache these recommendations during off-peak hours.
2. **Local SQLite File Storage vs. Distributed DBMS:**
   * *Trade-off:* The working model uses SQLite (`fixxly.db`) with custom indexing to allow rapid setup and file portability. However, it does not scale for horizontal writes.
   * *Mitigation:* Production scale requires migrating the database layer to PostgreSQL or CockroachDB.
3. **Data Polling vs. Event-Driven Push:**
   * *Trade-off:* The Next.js client polls the FastAPI database endpoints every 30 seconds to fetch alert updates. This is simpler to implement but creates periodic traffic.
   * *Mitigation:* Real-time streaming should be handled using WebSockets or Server-Sent Events (SSE).

### Future Development Roadmap
* **Role-Based Access Control (RBAC):** Integrate authentication (NextAuth/Auth0) to restrict PO approval permissions based on manager authority limits.
* **Zero-UI Integrations:** Send alerts directly to corporate Slack/Teams channels with interactive webhook buttons (`[Approve PO]`, `[Adjust Qty]`).
* **Semantic Guardrails:** Embed validation frameworks (like Guardrails AI or NeMo Guardrails) to ensure LLM suggestions never propose pricing below absolute landed cost bounds.
