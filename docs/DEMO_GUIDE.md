# Comprehensive Demonstration & Presentation Guide (Phase 8.3)

> **AI-Powered Smart Receptionist Platform**  
> *"Intelligent conversations. Smarter appointments."*

This document provides the definitive, step-by-step demonstration protocol for faculty, examiners, and stakeholders. It outlines the system prerequisites, pre-flight diagnostics, service startup sequence, mobile Android Chrome connectivity over local Wi-Fi HTTPS, full 7-turn spoken appointment booking walkthrough, dashboard verification, and voice analytics inspection.

---

## 1. System Architecture & Prerequisites

The platform executes **100% locally on standard consumer hardware** without paid cloud APIs, subscriptions, or external telephony dependencies.

| Subsystem | Component | Local Configuration | Verification Method |
| :--- | :--- | :--- | :--- |
| **Host System** | Intel Core i5-1235U, 8 GB RAM, Windows 11 | CPU execution, Integrated Graphics | System Settings |
| **Database** | PostgreSQL 16 Alpine via Docker Compose | Port `5433` (maps to internal 5432) | `npm run db:verify-demo` |
| **Local LLM** | Ollama v0.33.2 (`llama3.2:3b`) | `http://127.0.0.1:11434` (Q4_K_M GGUF) | `curl http://localhost:11434/api/tags` |
| **Speech STT** | `whisper.cpp` (`tiny.en`, 4 threads) | `backend/local-tools/whisper/whisper-cli.exe` | `npm run demo:health` |
| **Neural TTS** | `Piper TTS` (`en_US-lessac-medium` ONNX) | `backend/local-tools/piper/piper.exe` | `npm run demo:health` |
| **Audio Transcoding** | `FFmpeg` static engine | `backend/node_modules/ffmpeg-static/ffmpeg.exe` | `npm run demo:health` |
| **Backend Gateway**| Express API Engine | Port `5000` (LAN accessible, dynamic CORS) | `http://localhost:5000/api/health` |
| **Mobile Client** | Next.js 14 App Router with HTTPS | Port `3000` (`--experimental-https`) | `https://<LAN_IP>:3000/voice` |

---

## 2. Pre-Flight Diagnostic Health Check

Before starting the live demonstration, run the automated health check tool to verify that all 7 critical subsystems are operational:

```powershell
npm --prefix backend run demo:health
```

### Expected Green Output:
```text
Subsystem / Component                      Status  Latency   Details
--------------------------------------------------------------------------------
PostgreSQL Database (Docker port 5433)     ✅ PASS  30.5ms    Connected. Verified 4 businesses, 16 specialists, 56 customers, 48 appointments.
Ollama LLM Runtime (Port 11434)            ✅ PASS  32.5ms    Connected. Model 'llama3.2:3b' is loaded and ready for CPU inference.
Whisper STT (whisper.cpp tiny.en)          ✅ PASS            Binary: whisper-cli.exe | Weights: ggml-tiny.en.bin (74.1 MB). Local transcription ready.
Piper Neural TTS (lessac-medium ONNX)      ✅ PASS            Binary: piper.exe | Weights: en_US-lessac-medium.onnx (60.3 MB) | Config: en_US-lessac-medium.onnx.json.
FFmpeg Audio Normalization Engine          ✅ PASS            ffmpeg version 6.1.1 | Binary: ffmpeg.exe. WebM/Opus -> 16kHz WAV transcoding ready.
Ephemeral Audio Storage & Cache            ✅ PASS            Output: ...\runtime\audio | Uploads: ...\runtime\uploads (Writable: true, Auto-cleanup enabled, zero persistent audio guarantee).
Mobile LAN Discovery & HTTPS Access        ✅ PASS            Primary LAN IPv4: 11.12.18.229 | Mobile Route: https://11.12.18.229:3000/voice | CORS compliant across private subnets.
--------------------------------------------------------------------------------
📊 Health Check Summary: 7 Passed, 0 Warnings, 0 Failures
🎉 ALL CRITICAL SUBSYSTEMS HEALTHY! SYSTEM IS READY FOR LIVE DEMONSTRATION! 🎉
```

---

## 3. Starting the Demonstration Environment

Open **two separate terminal windows** on the host laptop:

### Terminal 1: Backend API Service
```powershell
npm --prefix backend run dev
```
- Starts the Express backend on `http://0.0.0.0:5000`.
- Automatically connects to PostgreSQL and verifies the deterministic intent router.

### Terminal 2: Frontend Web Client (HTTPS Mobile Enabled)
```powershell
npm --prefix frontend run dev:mobile
```
- Automatically generates local self-signed SSL certificates (`certificates/dev-key.pem` and `certificates/dev-cert.pem`).
- Binds to `0.0.0.0:3000` with native HTTPS enabled.
- Proxies `/api/*` traffic internally to the backend, preventing mixed-content warnings.

---

## 4. Connecting the Real Mobile Phone

Mobile browsers (Android Chrome and iOS Safari) strictly require a **Secure Context (HTTPS)** to allow microphone capture via `navigator.mediaDevices.getUserMedia`.

### Step-by-Step Mobile Connection:
1. **Connect to Same Wi-Fi:** Ensure both the laptop and mobile phone are connected to the exact same Wi-Fi network (or mobile hotspot).
2. **Retrieve Laptop IPv4 Address:** Run `npm --prefix backend run network:info` to see the primary LAN IP (e.g. `11.12.18.229`).
3. **Open Mobile Chrome:** On the mobile phone, navigate to:
   ```text
   https://<YOUR_LAPTOP_IP>:3000/voice
   ```
4. **Bypass Local SSL Warning (One-Time Only):**
   - Chrome will display *"Your connection is not private"* (due to the self-signed developer certificate).
   - Tap **"Advanced"**.
   - Tap **"Proceed to \<YOUR_LAPTOP_IP\> (unsafe)"**.
5. **Grant Microphone Permission:**
   - When prompted by the browser, tap **"Allow"** for microphone access.
   - The interface will display a green indicator: **"Connected & Ready"**.

---

## 5. Live Demonstration Script (Step-by-Step Flow)

### Part A: Laptop Screen — Business Dashboard Baseline
1. Open the laptop browser at `https://localhost:3000/login` (or `https://<YOUR_LAN_IP>:3000/login`).
2. Log in with the primary demo account:
   - **Email:** `sarah.jenkins@luminahealth.demo`
   - **Password:** `DemoUser123!`
3. Select **Lumina Dental Care** from the business selector.
4. Navigate to **Appointments** (`/dashboard/appointments`).
5. Note the current appointments for tomorrow (showing available slots).

---

### Part B: Mobile Phone — Spoken AI Receptionist Booking

Hold the mobile phone in hand or place it on speaker near the audience. Tap the pulsing microphone button to begin.

```text
Turn 1: Greeting & Booking Intent
User Speaks:     "Hello, I want to book an appointment."
AI Responds:     "Sure! Which service would you like to book?"
Latency:         ~2.1 seconds | Deterministic Router

Turn 2: Service Selection
User Speaks:     "Comprehensive Oral Exam"
AI Responds:     "Do you have a preferred specialist, or is anyone okay?"
Latency:         ~2.5 seconds | PostgreSQL Service Match

Turn 3: Specialist Preference
User Speaks:     "Anyone is fine."
AI Responds:     "Which day works best for you?"
Latency:         ~2.0 seconds | Specialist Resolution

Turn 4: Date Selection
User Speaks:     "Tomorrow"
AI Responds:     "I have 9 AM, 10 AM, 11 AM, or 1 PM available. Which time works best?"
Latency:         ~3.5 seconds | Natural Language Date Parser + Real Slot Discovery

Turn 5: Slot Time Selection
User Speaks:     "10 AM"
AI Responds:     "Got it for 10 AM! Please provide your phone number to complete the booking."
Latency:         ~3.3 seconds | Slot Conflict Validation

Turn 6: Customer Identification
User Speaks:     "My name is John Doe and my phone number is 555-019-8833."
AI Responds:     "I have Comprehensive Oral Exam on Monday at 10 AM for John Doe. Shall I confirm this booking?"
Latency:         ~5.0 seconds | Customer Resolution / Creation in PostgreSQL

Turn 7: Final Confirmation
User Speaks:     "Yes, confirm it."
AI Responds:     "Your appointment for Comprehensive Oral Exam on Monday at 10 AM is confirmed! See you then."
Latency:         ~3.1 seconds | Conflict-Free PostgreSQL Insert + Piper Neural TTS
```

### Part C: Call Termination
- Tap **"End Call"** on the mobile screen.
- Notice the call cleanly terminates, media tracks release, and the status changes to **"Call Completed"**.

---

### Part D: Laptop Screen — Live Verification & Proof of Execution

1. **Verify Appointment in PostgreSQL & Dashboard:**
   - Switch back to the laptop browser at `/dashboard/appointments`.
   - **Refresh the page** (or observe automatic revalidation).
   - Show the newly booked appointment:
     - **Customer:** John Doe
     - **Phone:** `+1-555-019-8833`
     - **Service:** Comprehensive Oral Exam & Digital X-Rays
     - **Specialist:** Assigned staff member (e.g. Dr. Sarah Jenkins, RDH)
     - **Time:** Tomorrow at 10:00 AM
     - **Status Badge:** Green `CONFIRMED`
2. **Verify Voice Analytics Dashboard:**
   - Navigate to **Voice Analytics** (`/dashboard/voice-analytics`).
   - Show the top KPI card:
     - Total Calls incremented by 1.
     - Booked Appointments incremented by 1.
     - Conversion Rate reflects 100%.
   - In the **Recent Voice Sessions** table, click on the completed session:
     - **Status:** `COMPLETED`
     - **Turns:** `7 Turns`
     - **STT Success Rate:** `100% (7/7)`
     - **Average STT Latency:** `~1,450 ms`
     - **Average TTS Latency:** `~1,420 ms`
     - **Linked Appointment ID:** Displays clickable link to the appointment.
3. **Highlight Strict Data Privacy Guarantees:**
   - Point out that **zero raw audio** and **zero user speech transcripts** are stored in the database.
   - Show that only operational timing metadata and conversion indicators are persisted.

---

## 6. Demonstration Edge Cases & Failure Recovery (Live Testing)

If examiners ask to see failure handling, demonstrate the following:

| Edge Case Scenario | Action | Expected Behavior |
| :--- | :--- | :--- |
| **Microphone Permission Denied** | In mobile Chrome site settings, set Microphone to "Block" and reload | Clean banner: *"Microphone access was denied. Please allow microphone permissions in your browser settings."* Zero crash. |
| **Empty Audio / Background Noise** | Tap mic, wait 1.5 seconds without speaking | VAD silence detection triggers; transport service safely discards recording with *"No speech detected"*. Zero appointment created. |
| **Indistinct Speech** | Mumble incoherently | Whisper returns empty transcription; AI politely prompts: *"I'm sorry, I didn't catch that. Could you please repeat what you said?"* Booking state is safely preserved. |
| **Administrative / Clinic Inquiries** | Ask: *"How should I prepare for my appointment?"* or *"Do you accept insurance?"* | FastDeterministicRouter catches query in $< 1$ ms; answers crisply without triggering the 22-second Ollama CPU fallback. |
| **Open-Ended Philosophical Inquiry** | Ask: *"What is your clinic philosophy on patient care?"* | Gracefully routes to Ollama CPU inference (`llama3.2:3b`), proving full LLM cognitive capability when required. |

---

## 7. Troubleshooting & Recovery Procedures

### Issue 1: Mobile Phone Cannot Connect to Laptop IP
- **Check Wi-Fi:** Ensure laptop and mobile phone are on the exact same Wi-Fi SSID. Public college or hotel Wi-Fi often enables "Client Isolation" which blocks peer-to-peer traffic.
- **Fix:** Connect both devices to a mobile phone hotspot.
- **Windows Firewall:** Ensure Node.js is allowed on private networks. You can run `netsh advfirewall firewall add rule name="NodeJS" dir=in action=allow protocol=TCP localport=3000,5000`.

### Issue 2: PostgreSQL Database Not Reachable
- **Symptom:** `Can't reach database server at localhost:5433`.
- **Fix:** Start Docker Desktop. Run `docker ps` to ensure `receptionist_postgres` is running. If not, start it with `docker start receptionist_postgres`.

### Issue 3: SSL Certificate Warning Reappears on Mobile
- **Fix:** In mobile Chrome, tap the padlock or "Not Secure" icon $\to$ "Site Settings" $\to$ "Clear & reset". Reload and tap "Advanced" $\to$ "Proceed to site".

---

## 8. Summary of Demo Verification Metrics

- **Total Automated Test Suites:** **30 / 30 Passed (100% clean)**
- **Deterministic AI Response Latency:** **< 5 ms**
- **Average Whisper STT Latency:** **~1.4 seconds**
- **Average Piper TTS Latency:** **~1.4 seconds**
- **Total Turnaround (User speech to AI speech):** **~2.8 – 3.3 seconds**
- **Hardware Footprint:** **~5.6 GB RAM consumed out of 8 GB**
- **Cloud Dependency:** **$0.00 (Zero paid APIs, 100% offline-capable)**
