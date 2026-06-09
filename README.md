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

* **Frontend:** Next.js 14 (App Router), React Query (data fetching & caching), Tailwind CSS (glassmorphism design).
* **Backend:** FastAPI (Python 3.11+), SQLAlchemy ORM, SQLite database.
* **AI Layer:** Groq (Llama 3.3 70B) as the primary LLM, Google Gemini 2.5 Flash as automatic failover.

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
