# Mobile Voice Client Interface & Audio Transport Foundation

This document describes the design, component architecture, microphone permission handling, MediaRecorder audio turn capture, mobile LAN testing, and backend integration for **Phase 7.2.1: Mobile Voice Client Interface Foundation** on the **AI-Powered Smart Receptionist Platform**.

---

## 1. Architectural Overview & Objective

Phase 7.2.1 introduces a **mobile-friendly Voice Receptionist Client Interface** (`/voice`) built with Next.js 14, React 18, and Tailwind CSS. The client connects mobile phone and laptop browsers directly to the backend's Phase 7.1 voice transport pipeline without requiring paid telephony services (Twilio), external cloud speech APIs, or complex WebRTC media servers.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT / BROWSER                         │
│   Route: /voice (Responsive: 360px, 390px, 412px, Tablet, Desktop)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
┌────────────────────────────────────────┐      ┌────────────────────────────────────────┐
│ COMPONENT LAYER                        │      │ HOOKS & SERVICES LAYER                 │
│ • VoiceReceptionist (Master View)      │      │ • useVoiceSession (UI State Machine)   │
│ • VoiceStatus (Online/Ready/Speaking)  │      │ • useMediaRecorder (Mic & Audio Blob)  │
│ • VoiceActivityIndicator (Waveforms)   │      │ • VoiceTransportClient (HTTP Transport)│
│ • VoiceControlButton (Push-to-Talk)    │      │ • Web Audio / HTML5 Audio Playback     │
│ • RecordingTimer (00:04 format)        │      └───────────────────┬────────────────────┘
│ • VoiceSessionInfo (Telemetry Drawer)  │                          │
└────────────────────────────────────────┘                          │
                                                                    │ Audio Turns (Blob)
                                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BACKEND VOICE TRANSPORT & LOCAL AI RUNTIME (Laptop / Intel Core i5-1235U)              │
│ • POST /api/ai/voice/transport/session ──> VoiceTransportSessionManager (vtr_* <-> sess)│
│ • POST /api/ai/voice/transport/turn    ──> VoiceTurnTransportService (<6ms overhead)   │
│ • GET  /api/ai/voice/audio/:audioId    ──> AudioStorageService (WAV response streaming)│
│ • Runtimes: Whisper.cpp STT (tiny.en) + Fast Router + Piper Neural TTS (en_US-lessac) │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Component Architecture

All voice interface components reside under `frontend/src/components/voice/`:

```text
frontend/src/
├── app/
│   └── voice/
│       └── page.tsx                 # Dedicated standalone mobile route (/voice)
├── components/
│   └── voice/
│       ├── VoiceReceptionist.tsx    # Master responsive controller & layout
│       ├── VoiceStatus.tsx          # Connection & presence badge (Online/Recording/Speaking)
│       ├── VoiceActivityIndicator.tsx # Visual animated waveform & robot avatar
│       ├── VoiceControlButton.tsx   # Touch-friendly push-to-talk & call action controls
│       ├── RecordingTimer.tsx       # Live MM:SS duration display
│       ├── VoiceSessionInfo.tsx     # Collapsible session metadata & latency telemetry
│       └── index.ts                 # Barrel export
├── hooks/
│   ├── useMediaRecorder.ts          # Browser microphone permission & audio capture
│   └── useVoiceSession.ts           # State machine, session lifecycle, and dialogue history
├── services/
│   └── voice-transport.client.ts    # Centralized HTTP client for backend voice APIs
└── types/
    └── voice.ts                     # Strongly-typed models & interfaces
```

---

## 3. Presentation State Machine (`useVoiceSession`)

The frontend manages an intuitive 8-state presentation lifecycle:

```text
     ┌────────┐
     │  IDLE  │ ──(User clicks "Start Voice Call")──> [Request Mic Permission]
     └────────┘                                                  │
                                                                 ▼
     ┌────────┐                                           ┌─────────────┐
     │ ERROR  │ ◄───(Mic Denied / Backend Offline)─────── │ CONNECTING  │
     └────────┘                                           └──────┬──────┘
                                                                 │ (Session Established)
                                                                 ▼
                                                          ┌─────────────┐
                                                   ┌────► │    READY    │ ◄────────────────┐
                                                   │      └──────┬──────┘                  │
                                                   │             │ (Tap to Speak)          │
                                                   │             ▼                         │
                                                   │      ┌─────────────┐                  │
                                                   │      │  RECORDING  │                  │
                                                   │      └──────┬──────┘                  │
                                                   │             │ (Tap to Stop & Send)    │
                                                   │             ▼                         │
                                                   │      ┌─────────────┐                  │
                                                   │      │ PROCESSING  │                  │
                                                   │      └──────┬──────┘                  │
                                                   │             │ (Response Audio Ready)  │
                                                   │             ▼                         │
                                                   │      ┌─────────────┐                  │
                                                   └───── │   PLAYING   │ ─────────────────┘
                                     (Audio Ended)        └─────────────┘
```

---

## 4. Microphone Permission & `MediaRecorder` Integration

- **API Used:** `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
- **Codec Negotiation:** Dynamically checks supported MIME types via `MediaRecorder.isTypeSupported`:
  1. `audio/webm;codecs=opus` (Modern Chromium / Android / Chrome)
  2. `audio/webm`
  3. `audio/ogg;codecs=opus` (Firefox)
  4. `audio/mp4` / `audio/aac` (Safari iOS)
  5. `audio/wav` (Fallback)
- **Safe Resource Cleanup:** All active `MediaStreamTrack` tracks are cleanly stopped and audio buffers cleared upon call termination or component unmount.
- **Friendly Error Handling:** Non-technical, user-friendly guidance for `NotAllowedError` (permission denied) and `NotFoundError` (no mic).

---

## 5. Push-to-Talk User Interaction Flow

1. **Start Call:** User selects business and taps **"Start Voice Call"**.
2. **Permission Check:** Browser prompts for microphone access $\rightarrow$ Granted.
3. **Session Initialized:** AI greets: *"Hello! Welcome to our receptionist. How can I help you today?"*.
4. **Speak:** User taps **"Tap to Speak"** $\rightarrow$ Button turns red with pulsing animation and live recording timer (`00:03`).
5. **Send:** User taps **"Tap to Stop & Send"** $\rightarrow$ Audio Blob is dispatched to `POST /api/ai/voice/transport/turn`.
6. **AI Response:** Assistant speech bubble displays transcript and plays synthesized audio response.
7. **End Call:** User taps **"End Call"** $\rightarrow$ Microphones are released and session is terminated via `DELETE /api/ai/voice/transport/session/:id`.

---

## 6. Mobile LAN Testing Guide (Phone to Laptop)

To access the voice receptionist from your mobile phone connected to the same Wi-Fi network:

### Step 1: Start Backend & Frontend
```bash
# Terminal 1: Backend API (port 5000)
npm --prefix backend run dev

# Terminal 2: Frontend (bound to all network interfaces)
npm --prefix frontend run dev -- -H 0.0.0.0
```

### Step 2: Find Laptop IPv4 Address
In Windows PowerShell:
```powershell
ipconfig | Select-String "IPv4 Address"
# Example output: 192.168.1.45
```

### Step 3: Open on Mobile Browser
1. Open Chrome or Safari on your mobile phone connected to the same Wi-Fi.
2. Navigate to: `http://192.168.1.45:3000/voice` (replace with your laptop's actual IPv4).
3. Tap **"Start Voice Call"**, grant microphone access when prompted, and start speaking!

> [!NOTE]
> Modern mobile browsers (iOS Safari and Android Chrome) require HTTPS for microphone access on remote hostnames, but allow `localhost` and local IP addresses when configured in browser flags (`chrome://flags/#unsafely-treat-insecure-origin-as-secure`).

---

## 7. Performance & Latency Instrumentation

The collapsible **Session & Telemetry** drawer provides high-resolution performance transparency:
- **Transport Overhead:** **4.5 ms – 6.0 ms**
- **Speech-to-Text (Whisper):** **~940 ms**
- **Conversation Engine (Deterministic / Tools):** **0.1 ms – 12.0 ms**
- **Neural Voice (Piper TTS):** **~600 ms**
- **Total User-Perceived Roundtrip:** **~1.54s – 1.69s**

---

## 8. Current Scope & Intentional Boundaries

| Capability | Phase 7.2.1 Status | Implementation Details |
|---|---|---|
| **Mobile Web UI (`/voice`)** | ✅ **Implemented** | Touch-friendly, responsive Next.js interface. |
| **Microphone Permission Handling** | ✅ **Implemented** | `getUserMedia` with non-crashing friendly errors. |
| **MediaRecorder Turn Capture** | ✅ **Implemented** | Dynamic MIME negotiation with Blob generation. |
| **Push-to-Talk Interaction** | ✅ **Implemented** | Tap-to-Speak and Stop-and-Send with live timer. |
| **Voice Transport Integration** | ✅ **Implemented** | `POST /api/ai/voice/transport/*` HTTP client. |
| **Audio Response Playback** | ✅ **Implemented** | HTML5 Audio playback from local Piper WAV streams. |
| **Continuous Streaming STT** | ⏳ *Future Phase* | Turn-based model chosen for minimal latency on CPU. |
| **PSTN / Mobile Phone Carrier Calls**| ❌ *Out of Scope* | Zero Twilio or paid telephony services. |
| **WebRTC Media Server / SFU** | ❌ *Out of Scope* | Lightweight HTTP/Audio turn transport utilized. |
