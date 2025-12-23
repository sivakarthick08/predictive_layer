/**
 * Predictive KPI Agent
 * 
 * An AI agent specialized in analyzing historical KPI data and generating
 * future predictions using LLM-driven machine learning models.
 */

import 'dotenv/config';
// sanitize quoted API keys in .env (remove surrounding single/double quotes)
if (process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY.replace(/^['"]|['"]$/g, '');
if (process.env.E2B_API_KEY) process.env.E2B_API_KEY = process.env.E2B_API_KEY.replace(/^['"]|['"]$/g, '');
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { dataIngestTool, listKpisTool, predictiveModelTool, prophetModelAutoTool, lstmModelAutoTool, intelligentForecastTool, perspectiveTool } from '../tools/index.js';
// import { dataIngestTool, listKpisTool, predictiveModelTool, prophetModelAutoTool, lstmModelAutoTool, rnnModelAutoTool, intelligentForecastTool, perspectiveTool } from '../tools/index.js';
import predictiveAnalysisWorkflow from '../workflows/predictive-analysis.js';
import { readDataFile } from '../config/data-config.js';

/**
 * Helper function to get all historical records for a specific KPI
 */
function getKpiHistoricalData(kpiName: string): Array<{
  kpi_name: string;
  kpi_value: number;
  executed_at: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}> {
  try {
    // Load all data
    const allData = readDataFile(process.env.DATA_FILE);
    
    // Filter by KPI name (case-insensitive)
    const kpiData = allData.filter(d => 
      d.kpi_name.toLowerCase() === kpiName.toLowerCase()
    );
    
    // Sort by date descending (most recent first)
    kpiData.sort((a, b) => 
      new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
    );
    
    // Ensure frequency is always defined
    return kpiData.map(d => ({
      ...d,
      frequency: d.frequency || 'daily' as const,
    }));
  } catch (error) {
    console.error(`Failed to load KPI history for ${kpiName}:`, error);
    return [];
  }
}

export const predictiveKpiAgent = new Agent({
  name: 'PredictiveAgent',
  instructions: `You are an expert data analyst and ML engineer specializing in KPI forecasting.

🎯 PRIMARY FORECASTING STRATEGY - INTELLIGENT FALLBACK SYSTEM
The intelligent-forecast tool automatically tries models in priority order:

 TIER 1 - PROPHET (Primary Model)
   - Best for: Business metrics with seasonality and trends
   - Requires: ≥10 historical data points
   - If sufficient data and succeeds → Returns Prophet forecast
   - If fails or insufficient data → Automatically tries TIER 2

 TIER 2 - LSTM (Secondary Fallback)
   - Best for: Complex patterns, volatile data, non-linear relationships
   - Requires: ≥10 historical data points
   - If sufficient data and succeeds → Returns LSTM forecast
   - If fails or insufficient data → Automatically tries TIER 3

 TIER 3 - ADAPTIVE ML (Tertiary Fallback)
   - Best for: Guaranteed forecast with LLM-powered model selection
   - Requires: ≥5 historical data points (minimum requirement)
   - Analyzes data characteristics and generates custom optimal model
   - Always succeeds (if minimum data exists)

HOW TO USE:
Simply ask for a forecast and the system decides:
- "Forecast Active Product Count" → Intelligent system tries Prophet → LSTM → Adaptive ML
- "Forecast Total Dealer Count for 7 days" → Same fallback chain
- System shows which tier model was used and why
- AUTOMATIC PERSPECTIVE: Every forecast includes business-oriented perspection, highlights, and recommended actions

Optional: Request specific models if needed:
- "Forecast using Prophet" → prophetModel tool
- "Forecast using LSTM" → lstmModel tool
- "Forecast using RNN" → rnnModel tool

When the user asks to:
- "list KPIs" or "show available KPIs": Use list-kpis tool
- "forecast [KPI]" or "[KPI] prediction": Use intelligent-forecast (primary choice)
- "forecast [KPI] using Prophet/LSTM/RNN": Use specific model tool
- "compare [KPI]": Call multiple models and compare
- Ingest data: Use data-ingest tool

When presenting forecast results:
- Show KPI name, current value, and model used
- Display predicted dates, values, and confidence intervals  
- Highlight key trends (increasing/decreasing/stable)
- Note the number of historical data points used for training
- If fallback occurred, explain why primary model wasn't used
- ALWAYS present the perspection, highlights, and recommended actions (automatically included in forecast results)

Be concise, data-driven, and focused on business value.`,
  model: openai('gpt-4o'),
  tools: {
    listKpis: listKpisTool,
    dataIngest: dataIngestTool,
    intelligentForecast: intelligentForecastTool,
    predictiveModel: predictiveModelTool,
    prophetModel: prophetModelAutoTool,
    lstmModel: lstmModelAutoTool,
    // rnnModel: rnnModelAutoTool,
    perspective: perspectiveTool,
  },
  workflows: {
    predictiveAnalysisWorkflow,
  }
});

export default predictiveKpiAgent;
