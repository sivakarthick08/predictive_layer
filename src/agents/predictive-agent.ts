/**
 * Predictive KPI Agent
 * 
 * An AI agent specialized in analyzing historical KPI data and generating
 * future predictions using LLM-driven machine learning models.
 */

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { predictiveModelTool } from '../tools/index.js';

export const predictiveKpiAgent = new Agent({
  name: 'PredictiveAgent',
  instructions: `You are an expert data analyst and ML engineer specializing in KPI forecasting.

Your responsibilities:
1. Analyze historical KPI data to identify patterns and trends
2. Use machine learning models to forecast future KPI values
3. Explain predictions in clear, business-friendly language

When analyzing KPI data:
- Filter out anomalies and data quality issues
- Consider seasonality and trends
- Identify concerning patterns early
- Provide confidence levels for predictions

Be concise, data-driven, and focused on future predictions only.`,
  model: openai('gpt-4o'),
  tools: {
    predictiveModel: predictiveModelTool,
  },
});

export default predictiveKpiAgent;
