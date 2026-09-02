# Capstone Project Roadmap

## Project Vision: AI-Powered Smart Receptionist Platform
An end-to-end full-stack intelligent receptionist built exclusively using open-source, zero-cost technologies.

---

## 🎯 Phase Breakdown

### Phase 1: Project Foundation & Initial Full-Stack Setup (COMPLETED)
- [x] Full-stack directory scaffolding (`frontend/`, `backend/`, `docs/`)
- [x] Express backend setup with TypeScript, CORS, Dotenv, and strict Error Handling
- [x] Next.js frontend setup with TypeScript and Tailwind CSS
- [x] Implementation of `GET /api/health` system diagnostic endpoint
- [x] Interactive frontend-to-backend status checker component
- [x] Initial polished UI shell with hero section and feature preview cards
- [x] Git repository initialization and progressive milestone commits
- [x] Complete project documentation (`README.md`, `ARCHITECTURE.md`, `ROADMAP.md`)

---

### Phase 2: Data Modeling & Core Domain Services
- [ ] Database selection and integration (PostgreSQL / SQLite via Prisma or TypeORM)
- [ ] Appointment scheduling schema & CRUD API (Create, Read, Update, Delete)
- [ ] Customer profile management schema & CRUD API
- [ ] Conflict detection logic for appointment booking slots
- [ ] Frontend management views for calendar slots and customer records

---

### Phase 3: Local AI Integration & Conversational Receptionist
- [ ] Ollama integration (Local LLM inference via REST/TypeScript client)
- [ ] Prompt engineering for receptionist persona, greetings, and inquiry classification
- [ ] Function/Tool calling for appointments (e.g., `checkAvailability`, `bookAppointment`)
- [ ] Call and conversation transcript logging into database
- [ ] Automated conversation summarization generator

---

### Phase 4: Voice Pipeline & RAG Knowledge Retrieval
- [ ] Local Speech-to-Text (STT) using Whisper
- [ ] Local Text-to-Speech (TTS) using Piper
- [ ] Vector Database setup (ChromaDB / Qdrant)
- [ ] RAG Knowledge base ingestion for business FAQs, company guidelines, and services
- [ ] Real-time semantic retrieval during receptionist dialogues

---

### Phase 5: Admin Dashboard & Unified Experience
- [ ] Analytics dashboard for receptionist calls, booking rates, and conversation sentiment
- [ ] Real-time call monitor and interactive chat simulator for testing
- [ ] Admin controls to update business knowledge docs and AI persona guidelines
- [ ] UI polish and responsive mobile layout optimization

---

### Phase 6: Testing, Hardening & Capstone Presentation
- [ ] Unit and integration tests for API endpoints and business logic
- [ ] End-to-end voice and text conversational test suite
- [ ] Final security review, performance optimizations, and demonstration walkthrough
