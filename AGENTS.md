# Agent Development Guide

## Setup & Commands

**Initial Setup:**
```bash
npm install
```

**Development Server:** `npm run dev` (runs on port 3000)  
**Build:** `npm run build` (outputs to `dist/`)  
**Type Check:** `npm run typecheck`  
**Tests:** No test suite configured  
**CLI Tool:** `npm run cli -- --help`

## Tech Stack & Architecture

- **Frontend:** Vue 3 + TypeScript + Vite + Vuetify (Material Design UI)
- **Build:** Vite with vue and vuetify plugins
- **CLI:** tsx (TypeScript execution) + Node.js
- **Structure:** Component-based architecture with provider-specific calculators (Azure, AWS, GCP, Oracle, AliCloud, On-Premises)
- **Templates:** IaC code generation templates in `src/templates/` (Terraform, ARM, Bicep, CloudFormation, etc.)

## Code Style & Conventions

- **TypeScript:** Strict mode enabled, ES2020 target, ESNext modules
- **Vue:** Composition API with `<script setup>` (SFC format)
- **Naming:** PascalCase for components, camelCase for variables/functions
- **No unused locals/parameters** (enforced by tsconfig)
