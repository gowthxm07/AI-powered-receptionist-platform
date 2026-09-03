# Live Mobile Voice Integration, HTTPS Setup & Testing Guide

This document explains the mobile browser microphone security requirements, how the secure local development architecture was implemented, exact startup commands, certificate handling, mobile connection instructions, and troubleshooting for the **AI-Powered Smart Receptionist Platform**.

---

## 1. Why the Mobile Microphone Issue Occurred (Root Cause Analysis)

### The W3C Secure Context Specification
Modern browser security models (specifically Android Google Chrome, Apple iOS Safari, and Chromium browsers) enforce strict restrictions on sensitive hardware APIs, including the **Media Capture and Streams API** (`navigator.mediaDevices.getUserMedia`) and the **MediaStream Recording API** (`MediaRecorder`).

Under the W3C specification:
1. **Localhost is Trustworthy:** `http://localhost:3000` and `http://127.0.0.1:3000` are treated specially as "potentially trustworthy origins", meaning `window.isSecureContext === true`. On the laptop, `navigator.mediaDevices` and `getUserMedia` are fully exposed.
2. **LAN IPs Over Plain HTTP are Untrusted:** When an Android phone accesses the platform over Wi-Fi using plain HTTP (e.g., `http://11.12.18.229:3000/voice`), `window.isSecureContext === false`.
3. **API Removal in Insecure Contexts:** In an insecure context, Android Chrome **completely removes or disables `navigator.mediaDevices`** from the `navigator` object.
4. **Misleading Error Trigger:** The previous capability check `!navigator.mediaDevices` assumed the browser lacked recording support and displayed *"Your browser does not support audio recording..."*, even though Google Chrome on Android fully supports `MediaRecorder`.

---

## 2. The Solution Architecture

To provide seamless, free, and fully local mobile voice access without cloud dependencies, paid services, or external tunnels, the system employs a **Local HTTPS + Next.js Internal Reverse Proxy Architecture**:

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE PHONE (Wi-Fi)                                    │
│   Chrome Browser: https://<LAPTOP_IP>:3000/voice (Secure Context ✅)             │
│   • navigator.mediaDevices.getUserMedia() is fully enabled                        │
│   • Push-to-Talk captures audio into MediaRecorder Blob                           │
│   • Sends audio turn to: https://<LAPTOP_IP>:3000/api/ai/voice/transport/turn    │
│   • Plays response audio from: https://<LAPTOP_IP>:3000/api/ai/voice/audio/:id    │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │  ▲
              Single HTTPS Port 3000      │  │  (Zero Mixed Content, Zero CORS)
                                          ▼  │
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      LAPTOP (Windows 11 / Node.js / Docker)                       │
│                                                                                   │
│  1. Next.js 14 Development Server (Port 3000, HTTPS with SANs):                   │
│     • Serves React UI securely over HTTPS                                         │
│     • next.config.mjs rewrites /api/* ──> http://127.0.0.1:5000/api/*             │
│                                                                                   │
│  2. Express Backend Engine (Port 5000, Loopback HTTP):                            │
│     • Receives proxied API turns on localhost (no external ports needed)          │
│     • Whisper STT (`whisper.cpp`, ~900ms)                                         │
│     • AI Conversation Engine / Appointment State Machine (< 10ms)                 │
│     • PostgreSQL 16 via Prisma (Port 5433)                                        │
│     • Ollama `llama3.2:3b` fallback (Port 11434)                                  │
│     • Piper Neural TTS (`en_US-lessac-medium`, ~600-800ms)                        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Advantages:
- **Zero Mixed Content:** The mobile browser sends API requests and streams response audio to the same origin (`https://<LAPTOP_IP>:3000`). Next.js proxies these internally to `http://127.0.0.1:5000`.
- **Zero Cross-Port CORS:** Mobile devices never connect directly to port 5000, eliminating mobile browser CORS restrictions.
- **Microphone Permissions Enabled:** Running over HTTPS establishes a Secure Context (`isSecureContext === true`), allowing Android Chrome to grant microphone permissions.
- **Accurate Error Messaging:** The frontend explicitly detects `!isSecureContext` and guides the user rather than falsely claiming the browser is unsupported.
- **Safe Development Diagnostics:** An expandable client diagnostics panel allows instant inspection of protocol, secure context status, and API availability.

---

## 3. Step-by-Step Guide: Running the Platform for Mobile Voice Testing

### Step 1: Discover Laptop IPv4 LAN Address
Run the automated discovery script:
```bash
npm --prefix backend run network:info
```
*(Example output: Laptop LAN IP is `11.12.18.229` or `192.168.1.45`).*

### Step 2: Start PostgreSQL Database
```bash
docker compose up -d
```

### Step 3: Start the Backend REST API Engine
```bash
npm --prefix backend run dev
```
*(Backend starts on port 5000).*

### Step 4: Start the Mobile HTTPS Frontend
From the root directory or frontend directory:
```bash
npm run dev:mobile
```
*(Or `npm --prefix frontend run dev:https`).*

This command automatically:
1. Generates local development TLS/HTTPS certificates in `frontend/certificates/` with Subject Alternative Names (SANs) for `localhost`, `127.0.0.1`, and your laptop's Wi-Fi LAN IP.
2. Starts Next.js bound to all network interfaces (`-H 0.0.0.0`) on `https://<LAPTOP_IP>:3000`.

---

## 4. Connecting and Trusting the Local Certificate on Android Chrome

1. **Open Mobile Browser:** On your Android phone connected to the same Wi-Fi, open Google Chrome and navigate to:
   ```text
   https://<LAPTOP_IP>:3000/voice
   ```
   *(e.g., `https://11.12.18.229:3000/voice`)*

2. **Accept the Local Self-Signed Certificate:**
   - Chrome will display a warning: *"Your connection is not private"* (because the local development certificate is self-signed).
   - Tap **Advanced** (at the bottom).
   - Tap **Proceed to `<LAPTOP_IP>` (unsafe)**.

3. **Grant Microphone Permission:**
   - Tap **"Start Voice Call"**.
   - When Chrome prompts: *"https://`<LAPTOP_IP>`:3000 wants to use your microphone"*, tap **Allow**.

4. **Alternative Testing Method (Chrome Flags):**
   If you prefer testing over plain HTTP (`http://<LAPTOP_IP>:3000/voice`):
   - In Android Chrome, navigate to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - Set the flag to **Enabled**.
   - In the text box below, enter: `http://<LAPTOP_IP>:3000`
   - Tap **Relaunch**.
   - Android Chrome will now treat that specific HTTP LAN origin as a secure context.

---

## 5. End-to-End Live Conversational Verification Scenarios

Once connected on your mobile phone:

### Scenario A — Fast Deterministic Greeting
- Tap **"Tap to Speak"** $\rightarrow$ Speak: **"Hello"** $\rightarrow$ Tap **"Tap to Stop & Send"**.
- **Expected Result:** AI receptionist greets immediately with voice playback: *"Hello! Welcome to Lumina Dental Care. How may I assist you today?"*
- **Measured Latency:** **~1.79s total** (STT ~900ms + Router 1ms + TTS ~880ms).

### Scenario B — Database Services Query
- Tap **"Tap to Speak"** $\rightarrow$ Speak: **"What services do you offer?"** $\rightarrow$ Tap **"Tap to Stop & Send"**.
- **Expected Result:** AI queries PostgreSQL and lists available services (`Ceramic Crown Preparation`, `Comprehensive Oral Exam`, etc.).
- **Measured Latency:** **~3.06s total** (STT ~915ms + PostgreSQL Query ~6.6ms + TTS ~2.14s).

### Scenario C — 6-Turn Known Customer Appointment Booking
- Select existing customer (*"Rahul Sharma"*) before starting the call.
- **Turn 1:** *"I want to book an appointment"* (AI asks for service)
- **Turn 2:** *"Comprehensive Oral Exam"* (AI asks for specialist preference)
- **Turn 3:** *"Anyone is fine"* (AI asks for date)
- **Turn 4:** *"Tomorrow"* (AI presents available slots)
- **Turn 5:** *"10 in the morning"* (AI presents confirmation summary)
- **Turn 6:** *"Yes confirm"* (AI executes PostgreSQL booking transaction)
- **Expected Result:** Appointment confirmed and stored in PostgreSQL; AI responds with confirmation audio.
- **Measured Latency (Confirm Turn):** **~3.00s total** (STT ~1073ms + DB Execution ~70.4ms + TTS ~1858ms).

### Scenario D — 7-Turn Unknown Customer Dynamic Registration
- Select *"Guest Caller (Anonymous)"*.
- Turns 1–5: Follow service, staff, date, and slot selection.
- **Turn 6:** AI asks for phone/name $\rightarrow$ Speak: *"My phone number is 555-900-7711 and name is Elena Rostova"*.
- **Turn 7:** Speak: *"Yes confirm"*.
- **Expected Result:** System creates a new `Customer` record in PostgreSQL and links the appointment.

### Scenario E — Open-Ended Question (Ollama CPU Inference Fallback)
- Tap **"Tap to Speak"** $\rightarrow$ Speak: **"What should I do before my dental appointment?"** $\rightarrow$ Tap **"Tap to Stop & Send"**.
- **Expected Result:** AI hands off to local Ollama (`llama3.2:3b`) on CPU and speaks synthesized medical advice.
- **Measured Latency:** **~14.09s total** (STT ~1.11s + Ollama CPU inference ~10.52s + TTS ~2.45s).

---

## 6. Real Measured Voice Latency Benchmark Table

Captured on target hardware (**Intel Core i5-1235U, 8 GB RAM, CPU Inference**):

| Test Scenario | Path / Source | STT (Whisper) | Conversation / AI | TTS (Piper) | Transport Overhead | Total Measured Latency |
|---|---|---|---|---|---|---|
| **A. Fast Greeting** | `deterministic` | **901.8 ms** | **1.0 ms** | **884.7 ms** | **5.1 ms** | **~1.79 s** |
| **B. Database Query** | `tool (PostgreSQL)` | **914.8 ms** | **6.6 ms** | **2,140.2 ms** | **4.5 ms** | **~3.06 s** |
| **C. Multi-Turn Booking (Confirm)** | `tool (Prisma)` | **1,073.0 ms** | **70.4 ms** | **1,858.2 ms** | **4.1 ms** | **~3.00 s** |
| **D. Open-Ended Question** | `llm (Ollama CPU)` | **1,112.6 ms** | **10,521.4 ms** | **2,455.0 ms** | **3.6 ms** | **~14.09 s** |

---

## 7. Windows Defender Firewall Guidance

If your mobile device cannot reach `https://<LAPTOP_IP>:3000`:

1. **Verify Wi-Fi Network Profile:**
   - In Windows 11: Settings $\rightarrow$ Network & Internet $\rightarrow$ Wi-Fi $\rightarrow$ Select your network $\rightarrow$ Set network profile type to **Private network**.
2. **Allow Node.js on Private Networks:**
   - Open *Windows Defender Firewall* $\rightarrow$ *Allow an app or feature through Windows Defender Firewall*.
   - Ensure **Node.js: Server-side JavaScript** has the checkbox checked for **Private**.
3. **Verify Port Accessibility:**
   - Test connectivity from mobile browser by opening `https://<LAPTOP_IP>:3000/api/health`.
   - Expected JSON response: `{"success": true, "status": "UP", ...}`.

---

## 8. Failure Diagnosis & Troubleshooting Matrix

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| *"HTTPS Connection Required for Microphone"* | Accessed via `http://` on LAN IP. | Access via `https://<LAPTOP_IP>:3000/voice` or configure Chrome flag. |
| *"Microphone permission was denied"* | User tapped "Block" or site settings blocked mic. | Tap lock icon next to URL in Chrome $\rightarrow$ Permissions $\rightarrow$ Reset / Allow Microphone. |
| *"Your connection is not private"* | Normal warning for local self-signed dev cert. | Tap **Advanced** $\rightarrow$ **Proceed to site (unsafe)**. |
| Phone cannot reach `https://<LAPTOP_IP>:3000` | Devices on different Wi-Fi or Windows Firewall blocking. | Ensure both devices are on same Wi-Fi; check Windows Firewall Private Network allowance. |
| Audio response does not play on mobile | Mobile browser autoplay restrictions. | Ensure mobile volume is turned up; tap "Tap to Speak" (user interaction unlocks browser audio context). |
| Backend API fails from mobile | Direct connection to port 5000 blocked or mixed content. | Ensure Next.js proxy is active (`next.config.mjs` rewrites) and use relative URLs. |
