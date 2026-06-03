#!/bin/bash
# Quick Reference: Gemini → Ollama Migration Commands

# ============================================
# SETUP: Gemini (Default - No Changes)
# ============================================

# 1. Get API key from: https://aistudio.google.com/app/apikey
# 2. Add to .env.local:
export VITE_LLM_PROVIDER=gemini
export VITE_GEMINI_API_KEY=your_api_key_here

# 3. Start development server
pnpm dev

# ============================================
# SETUP: Ollama (Local Inference)
# ============================================

# 1. Install Ollama
# macOS/Linux: curl -sSL https://ollama.ai/install.sh | sh
# Windows: Download from https://ollama.ai/download

# 2. Pull Gemma 3 4B model
ollama pull gemma3:4b

# 3. Start Ollama (in separate terminal)
ollama serve

# 4. Add to .env.local:
export VITE_LLM_PROVIDER=ollama
export VITE_OLLAMA_ENDPOINT=http://localhost:11434
export VITE_OLLAMA_MODEL=gemma3:4b
export VITE_OLLAMA_MAX_TOKENS=200

# 5. Start Nova
pnpm dev

# ============================================
# VERIFY SETUP
# ============================================

# Test Gemini connection
# (Set VITE_LLM_PROVIDER=gemini, then open browser and test voice)

# Test Ollama connection
curl http://localhost:11434/api/tags
# Should return JSON with available models

# ============================================
# TROUBLESHOOTING
# ============================================

# Build project
pnpm build

# Type checking
pnpm exec tsc --noEmit

# Clear cache and reinstall
pnpm install --force

# Check provider in browser console
# window.localStorage.getItem('nova_school_assistant_db_v1')

# ============================================
# USEFUL ENVIRONMENT VARIABLES
# ============================================

# Switch providers at runtime (no rebuild needed)
VITE_LLM_PROVIDER=gemini      # Use Gemini API
VITE_LLM_PROVIDER=ollama      # Use local Ollama

# Tune Gemini responses
VITE_GEMINI_MODEL=gemini-2.5-flash    # Fast model
VITE_GEMINI_MAX_TOKENS=800             # Max response length

# Tune Ollama responses
VITE_OLLAMA_MODEL=gemma3:4b           # Lightweight model
VITE_OLLAMA_MAX_TOKENS=200             # Keep short for voice
VITE_OLLAMA_ENDPOINT=http://localhost:11434

# ============================================
# PERFORMANCE TIPS
# ============================================

# For Gemini:
# - Use gemini-1.5-flash for faster responses
# - Reduce VITE_GEMINI_MAX_TOKENS to 400-600
# - Check API quota at https://aistudio.google.com/billing

# For Ollama:
# - Enable GPU: ollama gpu (if supported)
# - Reduce VITE_OLLAMA_MAX_TOKENS to 100-150
# - Ensure 4GB+ RAM available
# - First request is slow (model loading), subsequent are fast

# ============================================
# RUNNING TESTS
# ============================================

# Manual test with voice
pnpm dev
# Click microphone, speak clearly, wait for response
# Check browser console (F12) for provider info

# Test specific intent
# "What's 2 plus 2?" - Tests LLM response
# "Add homework for tomorrow" - Tests instruction processor
# "Create groups of 3" - Tests database operations
# "What's the schedule?" - Tests context injection

# ============================================
# SWITCHING PROVIDERS
# ============================================

# To switch from Gemini to Ollama:
# 1. Update .env.local with Ollama config
# 2. Hard refresh browser (Ctrl+F5)
# 3. Clear localStorage: window.localStorage.clear()
# 4. Reload page

# To switch back to Gemini:
# 1. Update .env.local with Gemini config
# 2. Hard refresh browser (Ctrl+F5)
# 3. Reload page

# ============================================
# DOCUMENTATION
# ============================================

# Full setup guide: cat SETUP_GUIDE.md
# Testing procedures: cat TEST_GUIDE.md
# Migration details: cat MIGRATION.md
# Implementation summary: cat MIGRATION_SUMMARY.md

# ============================================
# GIT WORKFLOW
# ============================================

# View migration commits
git log --oneline | grep -E "refactor|docs"

# View all changes
git show 7750221    # Provider abstraction commit
git show 5ad2d74    # Documentation commit
git show 4db3f46    # Summary commit

# ============================================
# IMPORTANT NOTES
# ============================================

# ✓ No code changes needed to switch providers
# ✓ Existing Gemini functionality preserved (backward compatible)
# ✓ Both providers have identical interface
# ✓ Future providers can be added following the same pattern
# ✓ Database operations unchanged (still using SQLite)
# ✓ Voice input/output unchanged (still using browser APIs)

# See SETUP_GUIDE.md for detailed configuration instructions
# See TEST_GUIDE.md for manual testing procedures
