# 🌊 FloodSense

> **Hyper-local flood intelligence, river discharge monitoring, and weather risk assessment designed for vulnerable communities.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Open-Meteo](https://img.shields.io/badge/Data-Open--Meteo%20API-0075FF)](https://open-meteo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 The Problem It Solves

Every monsoon season, torrential rains cause massive swelling across the Brahmaputra and Barak river basins, triggering catastrophic floods across **Assam and Northeast India**. Millions of people are displaced, critical infrastructure is submerged, and agricultural livelihoods are wiped out.

Despite the frequency of these disasters, everyday citizens and local communities often struggle with:
- **Abstract or broad alerts:** Regional forecasts issued at the state or district level lack hyper-local, actionable precision.
- **Complex hydrological jargon:** Raw river discharge metrics ($m^3/s$) and millimeter precipitation data are difficult for non-specialists to interpret.
- **Delayed emergency readiness:** Without clear foresight into upstream river behavior and rainfall trends, households lack adequate time to secure livestock, elevate valuables, or safely evacuate.

**FloodSense** bridges this gap. It aggregates global river discharge models and meteorological precipitation forecasts into an **intuitive, hyper-local 7-day flood outlook**. By computing an automated **0–100 Flood Risk Score** and translating it into plain-language reasoning and safety checklists, FloodSense equips individuals and community responders with the foresight needed before waters begin to rise.

---

## ✨ Key Features

- **📍 Hyper-Local Search & Auto-Geolocation:** Search any village, town, or city using OpenStreetMap Nominatim geocoding, or use single-click device geolocation.
- **📈 7-Day Hydrological & Rain Outlook:** Real-time integration with Open-Meteo's river discharge model (GloFAS) and 7-day precipitation forecasts.
- **🧮 Explainable Composite Risk Score (0–100):** Translates weather and river telemetry into distinct risk tiers (**Low**, **Moderate**, **High**) accompanied by human-readable explanations.
- **📊 Dual-Axis Interactive Visualizations:** Composed charts powered by Recharts plotting daily precipitation bars ($mm$) side-by-side with river discharge curves ($m^3/s$).
- **🗺️ Interactive Map:** Leaflet map centered dynamically around the queried location with custom marker indicators.
- **🛡️ Stage-Specific Safety Action Plans:** Contextual emergency recommendations tailored to the current risk tier, aligned with flood safety advisories (such as ASDMA guidelines).
- **👤 User Accounts & Preference Persistence:** Secure authentication powered by Firebase Auth, allowing users to save their primary location and sync light/dark theme preferences across devices via Firestore.
- **🌓 Light & Dark Modes:** Fully themed interface with CSS custom properties and instant toggle support.
- **⚡ Resilient Architecture:** Graceful handling of missing sensor data, network timeouts, and dynamic score weight reallocation when river telemetry is unavailable.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/), [Vite 8](https://vite.dev/) |
| **Routing** | [React Router v7](https://reactrouter.com/) |
| **Mapping & GIS** | [Leaflet](https://leafletjs.com/), [React-Leaflet](https://react-leaflet.js.org/), [OpenStreetMap](https://www.openstreetmap.org/) |
| **Data Visualization** | [Recharts](https://recharts.org/) (`ComposedChart`, `Bar`, `Line`, `ResponsiveContainer`) |
| **Backend & Cloud** | [Firebase Authentication](https://firebase.google.com/products/auth), [Cloud Firestore](https://firebase.google.com/products/firestore) |
| **Environmental APIs** | [Open-Meteo Flood API](https://open-meteo.com/en/docs/flood-api) (GloFAS), [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs) |
| **Geocoding** | [Nominatim (OpenStreetMap)](https://nominatim.org/), Browser Geolocation API |
| **Styling & Icons** | Vanilla CSS (CSS Variables, Grid/Flexbox), SVG UI icons |
| **Linting & Quality** | [Oxlint](https://oxc.rs/) |
| **Deployment** | [Vercel](https://vercel.com/) (configured via `vercel.json` for SPA rewrites) |

---

## 🧮 How the Risk Score is Calculated

FloodSense computes a composite risk score on a scale from **0 to 100**, blending cumulative precipitation, river discharge surge, and rainfall likelihood over a 7-day window.

### 1. Base Component Weights

When full sensor telemetry is present:
- **Total Precipitation (40% weight):** Cumulative forecasted rainfall across 7 days, normalized against a baseline of **100 mm**.
- **River Discharge Surge (40% weight):** Ratio of peak forecasted river discharge to mean seasonal discharge ($\text{Peak} / \text{Mean}$), normalized against a doubling threshold of **$2.0\times$**.
- **Precipitation Probability (20% weight):** Maximum single-day chance of rain across the 7-day forecast, normalized against **100%**.

$$\text{Score} = \left(\min\left(\frac{\text{Precip}}{100}, 1\right) \times W_{\text{precip}}\right) + \left(\min\left(\frac{\text{Discharge Ratio}}{2.0}, 1\right) \times W_{\text{discharge}}\right) + \left(\min\left(\frac{\text{Prob}}{100}, 1\right) \times W_{\text{prob}}\right)$$

### 2. Dynamic Weight Redistribution (Missing River Data)

In certain locations (e.g., elevated terrain or locations distant from mapped river segments), river discharge data may not be available. Instead of producing an inaccurate or depressed score, FloodSense **redistributes the 40% river discharge weight proportionally** between precipitation and probability:
- **Precipitation Weight:** $40 + \left(40 \times \frac{40}{60}\right) \approx \mathbf{66.7\%}$
- **Probability Weight:** $20 + \left(40 \times \frac{20}{60}\right) \approx \mathbf{33.3\%}$

This ensures risk assessments remain dependable even in data-sparse zones.

### 3. Risk Categories & Critical Overrides

| Risk Level | Score Range | Triggers & Conditions |
|---|---|---|
| **Low** | `0 - 33` | Normal seasonal conditions; regular monitoring advised. |
| **Moderate** | `34 - 66` | Noticeable rainfall or elevated river flow; review evacuation plans and move valuables upstairs. |
| **High** | `67 - 100` | Critical conditions; **automatically triggered** if: <br>• Total 7-day rainfall exceeds **100 mm**, OR <br>• Peak river discharge exceeds **$2.0\times$ its mean**, OR <br>• Weighted score is $\ge 67$. |

### 4. Transparent Explanations

Rather than presenting an unexplained number, the engine generates contextual diagnostic notes alongside the score:
- *"Heavy rainfall expected: 134.2mm over 7 days."*
- *"Peak river discharge is 2.3x its mean."*
- *"Maximum precipitation probability: 85% over 7 days."*

---

## 🖼️ Screenshots

> _Tip: Replace these placeholders with actual screenshots of your running application._

### Desktop Dashboard & Risk Outlook
```
+-----------------------------------------------------------------------+
|  FloodSense        Home    Account                   [Toggle] [Logout]|
+-----------------------------------------------------------------------+
|  Local flood outlook                                                  |
|  [ Search: Guwahati, Assam           ] [Search]  (•) Use my location  |
+------------------------------------+----------------------------------+
|                                    | Guwahati, Assam      [ HIGH: 78 ]|
|                                    | -------------------------------- |
|         [ Interactive Map ]        | • Heavy rainfall: 118mm/7 days   |
|         Centered on Guwahati       | • River discharge is 2.1x mean   |
|                                    |                                  |
|                                    | [ Rainfall & River Flow Chart ]  |
|                                    |   (Dual-axis Bar & Line Chart)   |
|                                    |                                  |
|                                    | [ 7-Day Forecast Cards ]         |
|                                    | [ Safety Tips: Move to high ground]|
+------------------------------------+----------------------------------+
```

| Desktop Dashboard | Mobile View & Dark Mode |
|:---:|:---:|
| (<img width="1920" height="1080" alt="Screenshot (203)" src="https://github.com/user-attachments/assets/ed639827-b50d-43c6-a91c-ad5437a6a38c" />
)  |

| Dual-Axis Hydrological Chart | Account & Location Settings |
|:---:|:---:|
| (<img width="1920" height="1080" alt="Screenshot (204)" src="https://github.com/user-attachments/assets/d37fe958-cafa-463f-996d-99abc78c4209" />
) |(<img width="1920" height="1080" alt="Screenshot (202)" src="https://github.com/user-attachments/assets/c5937046-2469-4773-8cc6-13e689360504" />
) |

---

## 🚀 Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version `18.x` or `20.x` recommended)
- `npm` or `yarn` / `pnpm`
- A free [Firebase](https://console.firebase.google.com/) project

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/floodsense.git
cd floodsense
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory (you can copy `.env.example`):

```bash
cp .env.example .env.local
```

Fill in your Firebase web app configuration keys:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Firebase Setup

1. In the **Firebase Console**, navigate to **Authentication** > **Sign-in method** and enable **Email/Password**.
2. Go to **Firestore Database**, create a database in production mode, and configure security rules so users can read and write only their own records:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Run the Application

Start the local development server:

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

To build for production:

```bash
npm run build
npm run preview
```

---

## 🚢 Deployment (Vercel)

FloodSense includes a `vercel.json` file with single-page app (SPA) rewrites to ensure direct URL navigation and page refreshes work properly with React Router:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Deploying to Vercel:
1. Push your repository to GitHub / GitLab.
2. Import the repository into your [Vercel Dashboard](https://vercel.com/new).
3. Under **Environment Variables**, add the `VITE_FIREBASE_*` variables defined in `.env.local`.
4. Deploy!

---

## 💡 What I Learned Building It

- **Hydrological & Weather API Integration:** Learned to coordinate asynchronous requests between Open-Meteo's Flood API (discharge data) and Forecast API (precipitation), synchronizing date arrays that may have differing timestamps.
- **Designing Resilient Scoring Models:** Realized that real-world sensor coverage is imperfect. Implemented dynamic weight reallocation so the application remains functional even when river discharge telemetry is absent.
- **Defensive Geospatial Lookups:** Addressed edge cases with browser Geolocation permissions, timeouts, and Nominatim rate limits by implementing request tokens to prevent race conditions during rapid typing.
- **Client & Server State Synchronization:** Balanced Firestore cloud persistence with local storage fallbacks so user location and theme preferences load instantly without layout shifts.
- **Accessible & Responsive Data Visualization:** Designed dual-axis charts with Recharts that remain legible and touch-friendly across mobile and desktop screens.

---

## 🔮 Future Improvements

- [ ] **SMS & Web Push Alerts:** Send automated notifications (via Twilio/Web Push) when a user's saved location enters the "High" risk threshold.
- [ ] **Regional Language Localization:** Add native translations for Assamese (অসমীয়া), Bengali (বাংলা), Hindi (हिंदी), and Bodo to empower non-English speaking communities.
- [ ] **Crowdsourced Hazard Reporting:** Allow local residents to submit ground-level flood depth reports, road blockages, and shelter status.
- [ ] **Official ASDMA & CWC Gauge Integration:** Ingest real-time water level data directly from Central Water Commission (CWC) and Assam State Disaster Management Authority gauges.
- [ ] **Progressive Web App (PWA) & Offline Mode:** Offline access to saved emergency contacts, evacuation routes, and first-aid checklists.

---

## 📄 License & Acknowledgments

- **License:** Distributed under the [MIT License](LICENSE).
- **Data Providers:**
  - Weather & Flood data provided by [Open-Meteo](https://open-meteo.com/) (using GloFAS hydrological models).
  - Geocoding and map tiles provided by [OpenStreetMap](https://www.openstreetmap.org/) and [Nominatim](https://nominatim.org/).
  - Safety advisories informed by standard emergency protocols from the [Assam State Disaster Management Authority (ASDMA)](https://asdma.assam.gov.in/).
