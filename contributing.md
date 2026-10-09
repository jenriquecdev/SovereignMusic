# Contributing to Sovereign Music

Thank you for your interest in contributing to Sovereign Music. This document outlines the process for proposing changes, reporting issues, and submitting contributions to the codebase.

---

## Code of Conduct

Be respectful, constructive, and collaborative. Focus feedback on code architecture, implementation details, and project reliability.

---

## How to Report Bugs

Before creating an issue, verify that the bug is reproducible with the latest `main` branch.

When opening an issue, provide:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected behavior vs. actual behavior.
- Environment details: OS, Python version, browser, and audio file formats tested (`.mp3`, `.m4a`, `.mp4`).
- Relevant server terminal logs or browser console traces.

---

## Development Setup

### 1. Prerequisites
- Python 3.10+
- A modern web browser supporting the HTML5 Audio API and Service Workers

### 2. Fork and Clone
```bash
git clone https://github.com/jenriquecdev/SovereignMusic.git 
cd SovereignMusic
```
### 3. Environment Configuration
Create and activate a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Set up your local environment file:
```bash
cp .env.example .env
```
Ensure `MUSIC_DIR` points to a local directory with valid audio files for testing.

### 4. Running the Development Server
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

---

## Contribution Workflow

1. **Create a Branch:** Always base your work on `main`. Use a descriptive branch name:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```
2. **Follow Architectural Standards:**
   - **Backend:** Maintain clean FastAPI route separation. Respect path security guards (`is_relative_to`) and non-blocking streaming generators.
   - **Persistence:** Ensure all file writes to JSON files remain atomic and resilient to corruption.
   - **Frontend:** Maintain zero external build-step dependencies. Use Vanilla JavaScript, standard DOM APIs, and Tailwind utility classes matching the monochrome dark theme.
   - **Audio & Range Requests:** Ensure changes do not break RFC 7233 byte-range streaming or Service Worker cache bypass logic.

3. **Run the Test Suite:**
Before committing, verify all automated tests pass:
```bash
pytest tests/
```
Add new test cases in tests/test_server.py covering any new endpoints or edge cases introduced.

4. **Commit Guidelines:**
Write clear, imperative commit messages:
```bash
git commit -m "Add volume persistence to local storage"
git commit -m "Fix 416 range error on single-byte requests"
```
---

## Submitting a Pull Request (PR)
1. **Push your branch to your fork:**
```bash
git push origin feature/your-feature-name
```

2. **Open a Pull Request against the main branch.**
3. **In the PR description:**
   - Explain the problem this PR addresses.
   - Detail the changes made and why this solution was chosen.
   - Confirm that `pytest tests/` passed locally.
   - Attach screenshots or console outputs if UI or API contracts were modified.

4. **Review Process:** A maintainer will review your PR. Be prepared to address feedback or request changes if necessary.