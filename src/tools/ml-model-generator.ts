/**
 * ML Model Generator
 * 
 * Uses LLM to analyze KPI data characteristics and generate appropriate
 * Python ML code for time series forecasting.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { KpiDataPoint } from '../types/index.js';

// Configure OpenAI
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use OpenAI model
const MODEL = 'gpt-4o-mini';

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
  // Calculate data statistics
  const nonZeroData = data.filter(d => d.kpi_value !== 0);
  const zeroCount = data.length - nonZeroData.length;
  const zeroPercentage = (zeroCount / data.length) * 100;
  
  // Analyze pattern - check if zeros are part of a cyclical pattern
  const hasPeriodicNonZeroValues = nonZeroData.length >= 3;
  
  const prompt = `You are a data scientist analyzing time series KPI data. 

Data summary:
- Total points: ${data.length}
- Non-zero points: ${nonZeroData.length}
- Zero points: ${zeroCount} (${zeroPercentage.toFixed(1)}%)
- KPI name: ${data[0]?.kpi_name || 'Unknown'}
- Date range: ${data[0]?.executed_at} to ${data[data.length - 1]?.executed_at}
- Sequential values with dates: ${data.slice(-15).map((d, i) => `${new Date(d.executed_at).toISOString().slice(0, 7)}: ${d.kpi_value}`).join(', ')}

**CRITICAL ANALYSIS RULES:**
1. Data quality is excellent (99%+) - trust all values as accurate measurements
2. Zeros are ACTUAL values (no sales, off-season, closures) - NOT errors or missing data
3. Three main frequencies to handle: daily, weekly, monthly
4. Detect patterns:
   - Daily: Day-of-week patterns, weekly cycles
   - Weekly: Seasonal trends, monthly cycles
   - Monthly: Quarterly/annual seasonality (e.g., Q4 sales peak, summer lows)
5. **Seasonality**: If values cluster in specific periods with zeros elsewhere → seasonal pattern

Analyze this time series:
1. Trend direction (increasing/decreasing/stable/volatile)
2. Seasonality: Repeating patterns by day/week/month/quarter?
3. Volatility level (low/medium/high)
4. Outliers count
5. Recommended ML model:
   - **Seasonal patterns**: Use period-based grouping (MonthlySeasonalPattern/DailyPattern)
   - **Smooth trends**: Use GradientBoostingRegressor with time features
   - **Volatile data**: Use RandomForestRegressor
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
    model: openai(MODEL),
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
  forecastHorizon: number,
  dataFrequency: 'daily' | 'weekly' | 'monthly'
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
- Data Frequency: ${dataFrequency.toUpperCase()} (CRITICAL: respect this for forecast dates)

Task: Generate complete, runnable Python code that:
1. Reads historical_data.json (contains array of {kpi_name, kpi_value, executed_at, frequency})
2. Preprocesses and cleans the data
3. Trains an appropriate ML model (${analysis.recommendedModel} or better alternative)
4. Generates ${forecastHorizon} future predictions
5. Outputs JSON with: predictions (array of numbers), forecast_dates (array of ISO date strings), model_info, confidence_scores

CRITICAL Requirements:
- ONLY use scikit-learn, numpy, pandas (these are guaranteed available in E2B)
- DO NOT use statsmodels, prophet, or any external packages not in scikit-learn
- **DO NOT use PolynomialFeatures** - it causes wild extrapolation and unrealistic predictions
- For cyclical/seasonal data: Use **GradientBoostingRegressor** with cyclical time features (month_sin, month_cos, quarter_sin, quarter_cos)
- For simple trends: Use **RandomForestRegressor** or **LinearRegression** with basic time index
- Use max_depth=3 or max_depth=4 for tree models to prevent overfitting on small datasets
- Use standard scikit-learn APIs (e.g., mean_squared_error() without 'squared' parameter)
- For confidence scores, use simple heuristics: 90 for first prediction, decreasing by 2-3 points
- Include proper error handling and edge case handling
- The LAST line of output MUST be valid JSON using: print(json.dumps(result))
- Add confidence_scores as array of numbers (0-100) for each prediction
- The code must be 100% runnable without any external dependencies
- Always close with sys.exit(0) after printing JSON

**CRITICAL DATE HANDLING:**
- The input data has frequency="${dataFrequency}"
- For MONTHLY data: forecast dates must increment by 1 MONTH (e.g., 2025-01-15, 2025-02-15, 2025-03-15)
- For WEEKLY data: forecast dates must increment by 7 DAYS/1 WEEK (e.g., 2025-01-06, 2025-01-13, 2025-01-20)
- For DAILY data: forecast dates must increment by 1 DAY (e.g., 2025-01-15, 2025-01-16, 2025-01-17)
- MUST use pandas to generate dates properly:
  * Get the last date from the data: pd.to_datetime(data[-1]['executed_at'])
  * For MONTHLY: use pd.date_range(start=last_date, periods=forecast_horizon+1, freq='MS')[1:] or add pd.DateOffset(months=i)
  * For WEEKLY: use pd.date_range(start=last_date, periods=forecast_horizon+1, freq='W')[1:]
  * For DAILY: use pd.date_range(start=last_date, periods=forecast_horizon+1, freq='D')[1:]
- Convert dates to ISO 8601 string format: date.isoformat()
- DO NOT return None or null dates - every prediction must have a valid date
- DO NOT default to daily predictions - ALWAYS respect the frequency from the input data

**CRITICAL DATA HANDLING - DAILY/WEEKLY/MONTHLY:**
- Data quality is excellent (99%+) - all values are accurate, including zeros
- Zeros represent real business state (no activity, closures, off-season)
- DO NOT filter data - use all values as-is

**APPROACH BY FREQUENCY:**

1. **MONTHLY DATA - Seasonal Grouping (Best for patterns like Q4 sales)**:
   \`\`\`python
   df['month'] = df['date'].dt.month
   monthly_avg = df.groupby('month')['kpi_value'].mean()
   # Predict: future_value = monthly_avg[future_month] * growth_factor
   \`\`\`

2. **WEEKLY DATA - Week-of-year or Day-of-week Grouping**:
   \`\`\`python
   df['week'] = df['date'].dt.isocalendar().week
   weekly_avg = df.groupby('week')['kpi_value'].mean()
   # Or for day patterns: df['dayofweek'] = df['date'].dt.dayofweek
   \`\`\`

3. **DAILY DATA - Day-of-week Grouping or Time-based Model**:
   \`\`\`python
   df['dayofweek'] = df['date'].dt.dayofweek  # Mon=0, Sun=6
   daily_avg = df.groupby('dayofweek')['kpi_value'].mean()
   # Or use GradientBoostingRegressor for trends
   \`\`\`

**When to use each approach**:
- **Period grouping**: Strong repeating patterns (e.g., weekday vs weekend, Q4 vs other quarters)
- **ML model**: Smooth trends without strong periodicity

IMPORTANT: The code must be complete, self-contained, and executable. Include all imports, file reading, model training, and JSON output.

**YOU MUST USE THIS EXACT CODE STRUCTURE** for seasonal data with single cycle:
\`\`\`python
import pandas as pd
import numpy as np
import json
import sys

# Read ALL data (zeros are real seasonal data)
with open('historical_data.json', 'r') as f:
    data = json.load(f)

df = pd.DataFrame(data)
df['date'] = pd.to_datetime(df['executed_at'])
df = df.sort_values('date').reset_index(drop=True)
df['month'] = df['date'].dt.month

# CRITICAL: Learn the seasonal pattern by month
# Group by month and calculate average (this captures which months have sales)
monthly_pattern = df.groupby('month')['kpi_value'].mean().to_dict()

# Calculate growth rate from non-zero values (if any trend exists)
non_zero = df[df['kpi_value'] > 0].sort_values('date')
if len(non_zero) >= 2:
    # Simple linear growth rate
    first_val = non_zero.iloc[0]['kpi_value']
    last_val = non_zero.iloc[-1]['kpi_value']
    months_between = (non_zero.iloc[-1]['date'] - non_zero.iloc[0]['date']).days / 30.44
    if months_between > 0 and first_val > 0:
        monthly_growth_rate = ((last_val / first_val) ** (1 / months_between)) - 1
    else:
        monthly_growth_rate = 0.01  # Default 1% growth
else:
    monthly_growth_rate = 0.01

# Generate future dates
last_date = df['date'].iloc[-1]
frequency = data[0]['frequency']
forecast_horizon = ${forecastHorizon}

if frequency == 'monthly':
    future_dates = [last_date + pd.DateOffset(months=i+1) for i in range(forecast_horizon)]
elif frequency == 'weekly':
    future_dates = [last_date + pd.Timedelta(weeks=i+1) for i in range(forecast_horizon)]
else:
    future_dates = [last_date + pd.Timedelta(days=i+1) for i in range(forecast_horizon)]

# Predict based on monthly pattern with growth
predictions = []
for i, future_date in enumerate(future_dates):
    month = future_date.month
    base_value = monthly_pattern.get(month, 0)
    # Apply growth to non-zero months
    if base_value > 0:
        grown_value = base_value * ((1 + monthly_growth_rate) ** (i + 1))
        predictions.append(max(0, grown_value))
    else:
        predictions.append(0.0)

# Generate confidence scores
confidence_scores = [max(50, 90 - i * 3) for i in range(forecast_horizon)]

# Convert to native Python types
result = {
    "predictions": [float(p) for p in predictions],
    "forecast_dates": [d.isoformat() for d in future_dates],
    "confidence_scores": confidence_scores,
    "model_info": {
        "algorithm": "MonthlySeasonalPattern",
        "training_samples": int(len(df)),
        "frequency": frequency,
        "growth_rate": float(monthly_growth_rate)
    }
}

print(json.dumps(result))
sys.exit(0)
\`\`\`

Example output format for MONTHLY data (MUST match this structure exactly):
{
  "predictions": [59150.5, 59180.3, 59210.8, 59245.2, 59280.6, 59315.4],
  "forecast_dates": ["2025-02-15T05:30:00+00:00", "2025-03-15T05:30:00+00:00", "2025-04-15T05:30:00+00:00", "2025-05-15T05:30:00+00:00", "2025-06-15T05:30:00+00:00", "2025-07-15T05:30:00+00:00"],
  "confidence_scores": [90, 87, 84, 81, 78, 75],
  "model_info": {"algorithm": "PolynomialRegression", "training_samples": 4, "frequency": "monthly", "non_zero_points": 4}
}

AVOID common API errors:
- mean_squared_error() does NOT have 'squared' parameter in older sklearn versions
- Use np.sqrt(mean_squared_error()) for RMSE instead
- Dates MUST be valid ISO 8601 format strings, not None or null
- Use pd.to_datetime() and .isoformat() for date generation
- Test that len(forecast_dates) == len(predictions) == len(confidence_scores)
- **CRITICAL JSON SERIALIZATION**: Convert all numpy/pandas types to native Python:
  * Use .tolist() for numpy arrays
  * Use int() for numpy integers (np.int64, np.int32)
  * Use float() for numpy floats (np.float64, np.float32)
  * Example: {"training_samples": int(len(X)), "predictions": predictions.tolist()}
  * This prevents "Object of type int64 is not JSON serializable" errors

Respond with:
1. PYTHON_CODE: The complete executable Python code (wrapped in \`\`\`python ... \`\`\`)
2. MODEL_TYPE: The model algorithm used
3. REASONING: Brief explanation of why this model is suitable (1-2 sentences)`;

  const response = await generateText({
    model: openai(MODEL),
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


