# Predictive KPI Agent

A production-ready predictive analytics agent built with Mastra and E2B that forecasts future KPI values using LLM-driven machine learning.

## 🚀 Features

- **LLM-Driven Model Selection**: AI analyzes data characteristics and selects optimal ML algorithms
- **Dynamic Code Generation**: GPT-4 generates custom Python ML code tailored to your data
- **Secure Sandbox Execution**: Runs generated ML models in isolated E2B environments
- **Prediction-Focused Output**: Returns only future predictions with confidence scores for Mastra UI
- **Mastra Workflow**: Clean, orchestrated pipeline from data validation to prediction generation
- **Production Ready**: Proper error handling, logging, and type safety

## 📋 Prerequisites

- Node.js >= 20.9.0
- Yarn package manager
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- E2B API key ([Get one here](https://e2b.dev/docs))

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd predictive-kpi-agent
yarn install
```

### 2. Configure Environment

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
OPENAI_API_KEY=sk-...
E2B_API_KEY=e2b_...
PORT=4111
NODE_ENV=development
```

### 3. Run the Agent

```bash
# Development mode with hot reload
yarn dev

# Production build and start
yarn build
yarn start
```

The server will start on `http://localhost:4111`

## 📖 Usage

### API Endpoint

POST to `/api/workflows/predictive-analysis-workflow/execute`

**Request Body:**

```json
{
  "historical_data": [
    {
      "kpi_name": "Sales Inv Average",
      "kpi_value": 59056.44,
      "executed_at": "2025-12-15T13:30:00.000Z",
      "frequency": "daily"
    },
    {
      "kpi_name": "Sales Inv Average",
      "kpi_value": 58900.12,
      "executed_at": "2025-12-14T13:30:00.000Z",
      "frequency": "daily"
    }
    // ... more data points (minimum 10 required)
  ],
  "forecast_horizon": 7,
  "include_recommendations": true
}
```

**Response:**

```json
{
  "success": true,
  "predictions": {
    "kpi_name": "Sales Inv Average",
    "predictions": [59100.23, 59200.45, 59350.67, 59400.89, 59500.12, 59600.34, 59700.56],
    "forecast_dates": ["2025-12-16", "2025-12-17", "2025-12-18", "2025-12-19", "2025-12-20", "2025-12-21", "2025-12-22"],
    "model_info": {
      "algorithm": "RandomForestRegressor",
      "training_samples": 45,
      "features_used": ["lag_1", "lag_2", "lag_3", "lag_7", "lag_14", "day_of_week", "rolling_mean_7", "rolling_std_7"]
    }
  },
  "recommendations": {
    "kpi_name": "Sales Inv Average",
    "analysis": "**Current Trend Analysis**\nThe KPI shows stable growth...\n\n**Predicted Trend**\nForecasted to increase by 1.2%...\n\n**Risk Assessment: Low**\nStable pattern with minimal volatility...\n\n**Action Items:**\n- IMMEDIATE: Monitor daily fluctuations...\n- SHORT-TERM: Review inventory levels...\n- MEDIUM-TERM: Optimize supply chain...\n- LONG-TERM: Implement predictive ordering...",
    "generated_at": "2025-12-16T10:30:00.000Z"
  },
  "metadata": {
    "analysis_timestamp": "2025-12-16T10:30:00.000Z",
    "data_points_analyzed": 45,
    "forecast_horizon": 7
  }
}
```

### Programmatic Usage

```typescript
import { mastra } from './src/mastra.js';

const result = await mastra.workflows.predictiveAnalysisWorkflow.execute({
  historical_data: [
    // your KPI data points
  ],
  forecast_horizon: 7,
  include_recommendations: true,
});

console.log('Predictions:', result.predictions);
console.log('Recommendations:', result.recommendations);
```

### Using the Test Script

```bash
yarn test
```

This runs a test with sample data to verify the setup.

## 🏗️ Architecture

```
predictive-kpi-agent/
├── src/
│   ├── agents/
│   │   ├── predictive-kpi-agent.ts   # AI agent for analysis
│   │   └── index.ts
│   ├── tools/
│   │   ├── e2b-client.ts             # E2B sandbox client
│   │   ├── predictive-model.ts       # ML forecasting tool
│   │   └── index.ts
│   ├── workflows/
│   │   ├── predictive-analysis.ts    # Main workflow orchestration
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   └── mastra.ts                     # Mastra configuration
├── index.ts                          # Entry point
├── package.json
├── tsconfig.json
├── mastra.config.ts
└── .env.example
```

## 🔍 How It Works

1. **Data Validation**: Validates input data, sorts chronologically, checks for minimum requirements
2. **Feature Engineering**: Creates lag features, rolling statistics, and time-based features
3. **Model Training**: Trains RandomForest model on E2B with engineered features
4. **Forecasting**: Generates predictions for specified horizon with iterative feature updates
5. **AI Analysis**: GPT-4 analyzes predictions and generates prioritized recommendations
6. **Response**: Returns structured predictions with actionable insights

## 🔐 Security

- ML models run in isolated E2B sandboxes
- No direct access to user environment
- API keys stored in environment variables
- Input validation with Zod schemas

## 🎯 Customization

### Adjust Forecast Horizon

```typescript
forecast_horizon: 14  // Predict 14 days ahead
```

### Modify ML Model

Edit `src/tools/predictive-model.ts` to:
- Change algorithm (e.g., GradientBoosting, LSTM)
- Adjust feature engineering
- Add cross-validation
- Include confidence intervals

### Enhance Recommendations

Edit `src/agents/predictive-kpi-agent.ts` to:
- Customize agent instructions
- Switch to different LLM models
- Add domain-specific expertise

## 📊 Data Requirements

- **Minimum**: 10 non-zero data points
- **Recommended**: 30+ data points for reliable forecasts
- **Format**: ISO 8601 timestamps, numeric KPI values
- **Frequency**: Daily, weekly, or custom (ensure consistency)

## 🐛 Troubleshooting

### "E2B_API_KEY is not set"
- Copy `.env.example` to `.env` and add your E2B API key

### "Insufficient data points"
- Ensure you have at least 10 valid data points
- Check for zero or null values

### "Prediction failed"
- Check E2B API key is valid
- Verify data format matches schema
- Review logs for detailed error messages

## 📝 License

ISC

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit PRs.

## 📞 Support

For issues or questions:
- Check [E2B Documentation](https://e2b.dev/docs)
- Check [Mastra Documentation](https://mastra.dev/docs)
- Open a GitHub issue

---

Built with ❤️ using [Mastra](https://mastra.dev) and [E2B](https://e2b.dev)

## 🔁 Enable Memory (Conversation & Semantic)

This project supports Mastra memory features so agents can retain recent conversation
context (conversation history) and use semantic memory for retrieval.

Quick steps to enable and use memory:

- Import `Memory` in your agent and add a `memory` field in the agent config:

```ts
import { Memory } from '@mastra/memory';

export const predictiveKpiAgent = new Agent({
  // ...
  memory: new Memory({
    options: { lastMessages: 20 },
  }),
});
```

- The agent will automatically include the last N messages in the context when
  invoking the model. Adjust `lastMessages` to control how much recent history
  is preserved.

- For semantic memory (vector search / embeddings), implement a storage initializer
  (e.g., Postgres, Pinecone, or a simple in-memory store) and register it before
  Mastra starts. See `mastra-agent`'s `src/mastra/core/semantic-layer-storage-tool.ts`
  for a complete example of semantic-layer storage initialization.

Example: programmatic usage to retrieve and use memory inside a workflow/agent
```ts
const result = await mastra.agents.predictiveKpiAgent.run({
  input: 'Analyze last forecast and suggest adjustments',
});
// The agent will include recent messages from Memory in its prompt context.
```

If you want, I can wire in a semantic storage initializer (Postgres or in-memory)
and add an API route to store/retrieve semantic entries next.
