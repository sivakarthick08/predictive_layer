# Predictive KPI Agent

A production-ready predictive analytics agent built with Mastra and E2B that forecasts future KPI values using LLM-driven machine learning.

## 🚀 Features

 # Predictive Layer — Predictive KPI Agent

Lightweight predictive KPI agent built with Mastra and E2B. This project exposes a Mastra-powered agent that analyzes historical KPI data and generates forecasts using an intelligent fallback strategy (Prophet → LSTM → adaptive ML).

## Key Features

- LLM-assisted model selection and explanation
- Intelligent fallback forecasting (Prophet, LSTM, adaptive ML)
- Runs generated/selected ML code securely via E2B sandboxing
- Mastra workflows for orchestration and snapshot storage
- File- or Postgres-backed data sources (configured via env)

## Prerequisites

- Node.js >= 20.9.0
- Yarn (the repo uses Yarn v1 in metadata) or npm
- OpenAI API key (`OPENAI_API_KEY`) if using OpenAI models
- E2B API key (`E2B_API_KEY`) for sandboxed model execution (optional for local-only testing)

## Quickstart

1. Install dependencies

```bash
cd predictive_layer
yarn install
```

2. Create and edit `.env` (or set environment variables directly)

Example `.env`:

```env
OPENAI_API_KEY=sk-...
E2B_API_KEY=e2b_...
PORT=4111
DATA_FILE=./data.json          # or set DATABASE_URL for Postgres
NODE_ENV=development
```

3. Run in development (Mastra dev server with hot reload)

```bash
yarn dev
# or run the TypeScript entry directly
yarn dev:node
```

4. Build & start (production)

```bash
yarn build
yarn start
```

Server defaults to `http://localhost:4111` (configurable via `PORT`). The Mastra instance persists workflow snapshots to `workflow-snapshots.db` in the project root.

## Available NPM/Yarn Scripts

- `yarn dev` — Development mode (uses `mastra dev`)
- `yarn dev:node` — Run the TypeScript entry via `tsx index.ts`
- `yarn ingest` — Run the ingest test script (`src/test-ingest.ts`)
- `yarn forecast` — Run forecasting script (`src/forecast.ts`)
- `yarn interactive-forecast` — Interactive forecast REPL (`src/interactive-forecast.ts`)
- `yarn build` — Build (uses `mastra build`)
- `yarn start` — Start Mastra server
- `yarn start:node` — Run compiled `index.js`
- `yarn test` — Run test script (`src/test.ts`)

## Data Sources

This project supports two data modes:

- File mode: set `DATA_FILE` to a JSON file (see `data.json` in repo root). The JSON should be an array or an object with a `data` array of KPI datapoints.
- Postgres mode: set `DATABASE_URL` (and optionally `DATABASE_TABLE`) to load KPI rows from Postgres.

Expected data point format (JSON / rows mapped to these fields):

```json
{
  "kpi_name": "Active Product Count",
  "kpi_value": 7229,
  "executed_at": "2025-12-17T11:30:00.000Z",
  "frequency": "daily"
}
```

Minimum recommendation: 10 non-zero historical points; 30+ for more reliable results.

## Programmatic usage

Import the exported Mastra instance from the package entrypoint and call the workflow directly:

```ts
import mastra from './index.js';

const result = await mastra.workflows.predictiveAnalysisWorkflow.execute({
  historical_data: [ /* KPI datapoints */ ],
  forecast_horizon: 7,
  include_recommendations: true,
});

console.log(result.predictions, result.recommendations);
```

You can also invoke the Mastra HTTP endpoints when the server is running.

## Project structure (important files)

- `index.ts` — package entry that exports the Mastra instance
- `mastra.config.ts` — Mastra config placeholder
- `src/mastra/index.ts` — Mastra instance, agents, workflows, and storage
- `src/agents/predictive-agent.ts` — The predictive KPI agent and instructions
- `src/tools/` — Tools: ingestion, model wrappers, E2B client, etc.
- `src/workflows/` — Workflow orchestration (predictive-analysis)
- `src/config/data-config.ts` — File/Postgres data loading helpers
- `data.json`, `weekly_data.json` — example/sample data files
