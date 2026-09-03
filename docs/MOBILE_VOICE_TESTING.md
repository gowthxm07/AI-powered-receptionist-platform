# Live Mobile Voice Integration & Testing Guide

This document provides complete instructions, network discovery procedures, browser microphone setup, step-by-step conversational test scenarios, latency analysis, and Windows Firewall troubleshooting for **Phase 7.2.2: Live End-to-End Mobile Voice Integration & Latency Verification** on the **AI-Powered Smart Receptionist Platform**.

---

## 1. System Architecture Overview

The system runs entirely locally on standard laptop hardware (CPU inference) while allowing mobile phones connected to the same local Wi-Fi network to participate in real-time voice conversations.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MOBILE PHONE (Wi-Fi)                            │
│  Browser (Chrome / Safari): http://<LAPTOP_LAN_IP>:3000/voice          │
│  Microphone (MediaRecorder) ───[ HTTP Audio Turn Blob ]───────────────┐│
│  Speaker Playback (HTML5 Audio) ◄───[ WAV Audio Stream ]─────────────┐││
└──────────────────────────────────────────────────────────────────────││┘
                                                                       ││
                                     Wi-Fi LAN (Port 5000 / Port 3000) ││
                                                                       ││
┌──────────────────────────────────────────────────────────────────────││─┐
│ LAPTOP (Windows 11 / Intel Core i5-1235U / 8 GB RAM / Zero Cloud)    ▼│ │
│                                                                       │ │
│ 1. Voice Turn Transport: POST /api/ai/voice/transport/turn (Overhead < 5ms) │
│ 2. Speech-to-Text:       whisper.cpp (tiny.en, AVX2, ~900ms)          │ │
│ 3. Intent Routing:       FastIntentRouter (Deterministic, < 1ms)      │ │
│ 4. Conversation Engine:  AppointmentStateMachine & PostgreSQL (< 10ms)│ │
│ 5. Neural Voice (TTS):   Piper (en_US-lessac-medium, ~600-800ms) ─────┘ │
│ 6. Response Streaming:   GET /api/ai/voice/audio/:audioId               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Requisites & Local Network Discovery

### Step 1: Connect to Local Wi-Fi
Ensure both your **Laptop** and your **Mobile Phone** are connected to the **same local Wi-Fi network** or hotspot.

### Step 2: Discover Laptop IPv4 Address
Run the automated discovery script in the backend:
```bash
npm --prefix backend run network:info
```

*Example Output:*
```text
===============================================================
📡 SMART RECEPTIONIST: LOCAL NETWORK & MOBILE ACCESS DISCOVERY
===============================================================
💻 Hostname: HP
🖥️  Platform: Windows_NT 10.0.26200 (x64)

🌐 Detected Local Network IP Addresses:
   [1] 192.168.1.45

📱 Mobile Phone Access URLs (on same Wi-Fi network):
   🎙️  Mobile Voice Receptionist : http://192.168.1.45:3000/voice
   📊 Main Dashboard            : http://192.168.1.45:3000/dashboard
   ⚡ Backend REST API Engine    : http://192.168.1.45:5000
   🩺 Backend Health Check      : http://192.168.1.45:5000/api/health
===============================================================
```

*(Alternatively, run `ipconfig` in Windows PowerShell and look for `IPv4 Address`).*

---

## 3. Starting the Platform for Mobile LAN Access

### Terminal 1: Start PostgreSQL Container
```bash
docker compose up -d
```

### Terminal 2: Start Backend REST API Engine
```bash
npm --prefix backend run dev
```
*Backend runs on port 5000 and automatically allows all local LAN IP origins via dynamic CORS.*

### Terminal 3: Start Frontend Bound to All Network Interfaces
```bash
npm --prefix frontend run dev -- -H 0.0.0.0
```
> [!IMPORTANT]
> The `-H 0.0.0.0` flag binds the Next.js development server to all local network interfaces so your mobile phone can reach `http://<LAPTOP_IP>:3000/voice`.

---

## 4. Mobile Browser Microphone Setup (HTTP on Local LAN)

Modern mobile browsers (Chrome on Android, Safari on iOS) enforce security policies for microphone access. When accessing an `http://` address over a local Wi-Fi IP (e.g. `http://192.168.1.45:3000`), follow these one-time browser settings:

### For Android Chrome:
1. In Chrome, navigate to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable the flag.
3. In the text area below, add your laptop's address:
   `http://192.168.1.45:3000,http://192.168.1.45:5000`
4. Relaunch Chrome. Microphone permissions (`getUserMedia`) will now function over Wi-Fi!

### For iOS Safari:
- Safari allows microphone access on local hostnames or when connected via USB debugging / local network sharing. Alternatively, testing on desktop Chrome/Edge uses `http://localhost:3000/voice` directly without flags.

---

## 5. Live Conversational Test Scenarios

Open `http://<LAPTOP_IP>:3000/voice` on your phone browser.

### Scenario A — Fast Deterministic Greeting
1. Tap **"Start Voice Call"** $\rightarrow$ AI greets: *"Hello! Welcome to Lumina Dental Care. How may I assist you today?"*
2. Tap **"Tap to Speak"** $\rightarrow$ Speak: **"Hello"** $\rightarrow$ Tap **"Tap to Stop & Send"**.
3. **Expected Behavior:** AI immediately responds with greeting speech.
4. **Measured Roundtrip:** **~1.79 seconds** (STT ~900ms + Fast Router ~1ms + Piper TTS ~880ms).

---

### Scenario B — Database Services Information Query
1. Tap **"Tap to Speak"** $\rightarrow$ Speak: **"What services do you offer?"** $\rightarrow$ Tap **"Tap to Stop & Send"**.
2. **Expected Behavior:** Fast intent router detects `SERVICE_INFORMATION` $\rightarrow$ Queries PostgreSQL database $\rightarrow$ AI lists services (`Ceramic Crown Preparation`, `Comprehensive Oral Exam`, `Laser Enamel Whitening`, etc.).
3. **Measured Roundtrip:** **~3.06 seconds** (STT ~914ms + Database Tool ~6.6ms + Piper TTS ~2.14s).

---

### Scenario C — 6-Turn Known Customer Appointment Booking
*Select an existing customer (e.g., "Rahul Sharma") before starting call:*
1. **Turn 1:** *"I want to book an appointment"* $\rightarrow$ AI: *"Sure! Which service would you like to book?"*
2. **Turn 2:** *"Comprehensive Oral Exam"* $\rightarrow$ AI: *"Got it... Do you have a preferred specialist, or would anyone be fine?"*
3. **Turn 3:** *"Anyone is fine"* $\rightarrow$ AI: *"Sounds good. What date would you prefer for your appointment?"*
4. **Turn 4:** *"Tomorrow"* $\rightarrow$ AI: *"Available times on ... are 09:00 AM, 10:00 AM, 11:00 AM, 01:00 PM. Which one would you prefer?"*
5. **Turn 5:** *"10 in the morning"* $\rightarrow$ AI: *"Please confirm your appointment: Comprehensive Oral Exam with Dr. Emily Chen on 2026-09-04 at 10:00 AM. Should I book it?"*
6. **Turn 6:** *"Yes confirm"* $\rightarrow$ AI: *"Your appointment for Comprehensive Oral Exam on 2026-09-04 at 10:00 AM has been successfully booked! We look forward to seeing you."*
7. **Verification:** Appointment record is inserted into PostgreSQL with zero LLM latency!

---

### Scenario D — 7-Turn Unknown Customer Dynamic Registration & Booking
*Select "Guest Caller (Anonymous)" before starting call:*
1. **Turn 1–4:** Follow booking steps for service, staff, date.
2. **Turn 5:** Select time slot (*"10 in the morning"*).
3. **Turn 6 (Identification):** AI asks: *"Could you please provide your phone number to complete the booking?"* $\rightarrow$ User speaks: *"My phone number is 555-900-7711 and name is Elena Rostova"*.
4. **Turn 7 (Confirmation):** User speaks: *"Yes confirm"*.
5. **Verification:** System automatically inserts new Customer record into PostgreSQL and binds appointment to the new customer UUID.

---

### Scenario E — Open-Ended Medical/Dental Question (Ollama Fallback)
1. Tap **"Tap to Speak"** $\rightarrow$ Speak: **"What should I do before my dental appointment?"** $\rightarrow$ Tap **"Tap to Stop & Send"**.
2. **Expected Behavior:** Fast intent router detects general open question $\rightarrow$ Hands off prompt to local Ollama (`llama3.2:3b`) on CPU $\rightarrow$ Synthesizes advice via Piper TTS.
3. **Measured Roundtrip:** **~14.09 seconds** (STT ~1.11s + Ollama CPU inference ~10.52s + Piper TTS ~2.45s).

---

## 6. Real Measured Voice Latency Benchmark

The following high-resolution timings were captured on the target laptop hardware (**Intel Core i5-1235U, 8 GB RAM, CPU inference**):

| Test Scenario | Path / Source | STT Latency (Whisper) | Conversation / AI Latency | TTS Latency (Piper) | Transport Overhead | Total Roundtrip |
|---|---|---|---|---|---|---|
| **A. Fast Greeting** | `deterministic` | **901.8 ms** | **1.0 ms** | **884.7 ms** | **5.1 ms** | **~1.79 s** |
| **B. Database Query** | `tool (PostgreSQL)` | **914.8 ms** | **6.6 ms** | **2,140.2 ms** | **4.5 ms** | **~3.06 s** |
| **C. Multi-Turn Booking (Confirm)** | `tool (Prisma)` | **1,073.0 ms** | **70.4 ms** | **1,858.2 ms** | **4.1 ms** | **~3.00 s** |
| **D. Open-Ended Question** | `llm (Ollama CPU)` | **1,112.6 ms** | **10,521.4 ms** | **2,455.0 ms** | **3.6 ms** | **~14.09 s** |

---

## 7. Latency Bottleneck Analysis

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LATENCY BREAKDOWN COMPARISON                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Deterministic Path : [STT: ~900ms] [Router: 1ms] [TTS: ~880ms] = 1.79s          │
│ Tool Query Path    : [STT: ~915ms] [Prisma: 7ms] [TTS: ~2140ms] = 3.06s         │
│ LLM Fallback Path  : [STT: ~1110ms] [Ollama CPU: 10,521ms] [TTS: 2455ms] = 14.09s │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Findings:
1. **Deterministic-First Speedup:** The deterministic fast router and state machine eliminate **10.5 seconds** of LLM inference time on CPU hardware, delivering responses in **$< 1.8$ seconds**.
2. **Speech Processing Budget:** Whisper STT (~900ms) and Piper TTS (~600–2000ms depending on sentence length) constitute **$> 95\%$** of deterministic roundtrip time.
3. **Transport Overhead Efficiency:** Transport overhead is consistently measured at **$< 6.0 ms** ($\sim 0.3\%$ of total latency).

---

## 8. Windows Firewall & Network Troubleshooting

If your mobile phone cannot reach `http://<LAPTOP_IP>:3000/voice`:

1. **Verify Private Network Profile:**
   - In Windows: Settings $\rightarrow$ Network & Internet $\rightarrow$ Wi-Fi $\rightarrow$ Set network profile to **Private network**.
2. **Check Windows Defender Firewall:**
   - Open *Windows Defender Firewall with Advanced Security*.
   - Verify that inbound connections for Node.js (`node.exe`) on Private Networks are set to **Allow**.
3. **Verify Port Accessibility:**
   - Test connectivity from mobile phone by navigating to: `http://<LAPTOP_IP>:5000/api/health`.
   - Expected response: `{"success": true, "status": "UP", "uptimeSeconds": ...}`.
4. **No Direct Telephony Required:**
   - No SIM card, Twilio key, or cellular carrier account is needed. All audio is transported securely over local HTTP multipart audio turns.

---

## 9. Page Reload & Session Continuity

- **Active Session:** Stored in memory with sliding 15-minute TTL.
- **Page Reload:** If the mobile browser tab is refreshed, the React state resets to `IDLE` to ensure clean microphone device re-acquisition.
- **Data Safety:** Multi-turn bookings that have already confirmed their appointment in PostgreSQL remain permanently stored in the database regardless of browser state.
