/**
 * ML Model Generator
 * 
 * Uses LLM to analyze KPI data characteristics and generate appropriate
 * Python ML code for time series forecasting.
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { KpiDataPoint } from '../types/index.js';

interface DataAnalysis {
  dataPoints: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonality: boolean;
  volatility: 'low' | 'medium' | 'high';
  outliers: number;
  recommendedModel: string;
  dataQuality: {
    completeness: number;
    zeroHeavy: boolean;
    missingValues: number;
  };
}

interface GeneratedMLCode {
  pythonCode: string;
  modelType: string;
  reasoning: string;
}

/**
 * Analyze KPI data using LLM to determine characteristics and best ML approach
 */
export async function analyzeDataCharacteristics(
  data: KpiDataPoint[]
): Promise<DataAnalysis> {
  const prompt = `You are a data scientist analyzing time series KPI data. 

Data summary:
- Total points: ${data.length}
- KPI name: ${data[0]?.kpi_name || 'Unknown'}
- Date range: ${data[0]?.executed_at} to ${data[data.length - 1]?.executed_at}
- Values: ${data.map(d => d.kpi_value).join(', ')}

Analyze this data and provide:
1. Trend direction (increasing/decreasing/stable/volatile)
2. Whether seasonality is present
3. Volatility level (low/medium/high)
4. Number of outliers detected
5. Recommended ML model (ARIMA, Prophet, LSTM, RandomForest, LinearRegression, etc.)
6. Data quality assessment

Respond with ONLY a JSON object in this exact format:
{
  "dataPoints": <number>,
  "trend": "<increasing|decreasing|stable|volatile>",
  "seasonality": <boolean>,
  "volatility": "<low|medium|high>",
  "outliers": <number>,
  "recommendedModel": "<model_name>",
  "dataQuality": {
    "completeness": <percentage>,
    "zeroHeavy": <boolean>,
    "missingValues": <number>
  }
}`;

  const response = await generateText({
    model: openai('gpt-4o'),
    prompt,
    temperature: 0.3,
  });

  // Parse JSON from response
  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse data analysis from LLM response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate Python ML code based on data analysis using LLM
 */
export async function generateMLModelCode(
  analysis: DataAnalysis,
  forecastHorizon: number
): Promise<GeneratedMLCode> {
  const prompt = `You are an expert ML engineer. Generate Python code for time series forecasting based on this data analysis:

Data Characteristics:
- Data points: ${analysis.dataPoints}
- Trend: ${analysis.trend}
- Seasonality: ${analysis.seasonality ? 'Yes' : 'No'}
- Volatility: ${analysis.volatility}
- Outliers: ${analysis.outliers}
- Recommended Model: ${analysis.recommendedModel}
- Data Quality: ${analysis.dataQuality.completeness}% complete, ${analysis.dataQuality.zeroHeavy ? 'zero-heavy' : 'normal distribution'}

Task: Generate complete, runnable Python code that:
1. Reads historical_data.json (contains array of {kpi_name, kpi_value, executed_at, frequency})
2. Preprocesses and cleans the data
3. Trains an appropriate ML model (${analysis.recommendedModel} or better alternative)
4. Generates ${forecastHorizon} future predictions
5. Outputs JSON with: predictions (array of numbers), forecast_dates (array of ISO date strings), model_info, confidence_scores

CRITICAL Requirements:
- ONLY use scikit-learn, numpy, pandas (these are guaranteed available in E2B)
- DO NOT use statsmodels, prophet, or any external packages not in scikit-learn
- For ARIMA-like behavior, use RandomForestRegressor or GradientBoostingRegressor with time features
- For trend modeling, use polynomial features with LinearRegression
- Use standard scikit-learn APIs (e.g., mean_squared_error() without 'squared' parameter)
- For confidence scores, use simple heuristics: 90 for first prediction, decreasing by 2-3 points
- Include proper error handling and edge case handling
- The LAST line of output MUST be valid JSON using: print(json.dumps(result))
- Add confidence_scores as array of numbers (0-100) for each prediction
- The code must be 100% runnable without any external dependencies
- Always close with sys.exit(0) after printing JSON

IMPORTANT: The code must be complete, self-contained, and executable. Include all imports, file reading, model training, and JSON output.

Example output format (MUST match this structure exactly):
{
  "predictions": [59100.5, 59200.3, 59300.1],
  "forecast_dates": ["2025-12-16T00:00:00.000Z", "2025-12-17T00:00:00.000Z", "2025-12-18T00:00:00.000Z"],
  "confidence_scores": [90, 87, 84],
  "model_info": {"algorithm": "GradientBoostingRegressor", "training_samples": 15}
}

AVOID common API errors:
- mean_squared_error() does NOT have 'squared' parameter in older sklearn versions
- Use np.sqrt(mean_squared_error()) for RMSE instead
- Dates must be in ISO 8601 format with timezone (e.g., 2025-12-16T13:30:00+00:00)

Respond with:
1. PYTHON_CODE: The complete executable Python code (wrapped in \`\`\`python ... \`\`\`)
2. MODEL_TYPE: The model algorithm used
3. REASONING: Brief explanation of why this model is suitable (1-2 sentences)`;

  const response = await generateText({
    model: openai('gpt-4o'),
    prompt,
    temperature: 0.4,
  });

  // Extract Python code from markdown code block
  const codeMatch = response.text.match(/```python\n([\s\S]*?)\n```/);
  if (!codeMatch) {
    throw new Error('Failed to extract Python code from LLM response');
  }

  // Extract model type and reasoning
  const modelTypeMatch = response.text.match(/MODEL_TYPE:\s*(.+)/);
  const reasoningMatch = response.text.match(/REASONING:\s*(.+)/);

  return {
    pythonCode: codeMatch[1].trim(),
    modelType: modelTypeMatch?.[1]?.trim() || analysis.recommendedModel,
    reasoning: reasoningMatch?.[1]?.trim() || 'Model selected based on data characteristics',
  };
}


