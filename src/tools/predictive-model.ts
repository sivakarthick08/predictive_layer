/**
 * Predictive Model Tool
 * 
 * Intelligent KPI forecasting tool that:
 * 1. Uses LLM to analyze data characteristics and select optimal ML model
 * 2. Generates custom Python ML code via LLM based on data patterns
 * 3. Executes generated code in E2B sandbox for predictions
 * 4. Returns only future predictions for Mastra UI
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { executePythonCode } from './e2b-client.js';
import { 
  analyzeDataCharacteristics, 
  generateMLModelCode,  
} from './ml-model-generator.js';

export const predictiveModelTool = createTool({
  id: 'predictive-model',
  description: 'Intelligent KPI forecasting: LLM analyzes data, generates optimal ML model code, executes in E2B, and provides business insights',
  inputSchema: z.object({
    historical_data: z.array(z.object({
      kpi_name: z.string(),
      kpi_value: z.number(),
      executed_at: z.string(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
    })),
    forecast_horizon: z.number().describe('Number of future periods to forecast'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kpi_name: z.string().optional(),
    current_value: z.number().optional(),
    predictions: z.array(z.object({
      date: z.string(),
      value: z.number(),
      confidence: z.number(),
    })).optional(),
    model_used: z.string().optional(),
    trend_detected: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { historical_data, forecast_horizon } = context;

      if (!historical_data || historical_data.length === 0) {
        return {
          success: false,
          error: 'No historical data provided',
        };
      }

      console.log('Step 1: LLM analyzing data trend...');
      
      // Step 1: Use LLM to analyze data characteristics
      const dataAnalysis = await analyzeDataCharacteristics(historical_data);
      
      console.log('Trend:', dataAnalysis.trend, '| Model:', dataAnalysis.recommendedModel);

      // Step 2: Use LLM to generate appropriate ML model code
      console.log('Step 2: Generating ML model code...');
      const generatedCode = await generateMLModelCode(dataAnalysis, forecast_horizon);
      
      console.log('Model:', generatedCode.modelType);

      // Step 3: Execute generated code in E2B sandbox
      console.log('Step 3: Executing ML model in E2B...');
      const files = {
        'historical_data.json': JSON.stringify(historical_data),
      };

      const execResult = await executePythonCode(generatedCode.pythonCode, files, 45000); // 45 second timeout

      // SystemExit(0) is expected and means success
      const hasRealError = execResult.error && 
        !(execResult.error.name === 'SystemExit' && execResult.error.value === '0');

      if (hasRealError) {
        return {
          success: false,
          error: `E2B execution error: ${JSON.stringify(execResult.error)}`,
        };
      }

      // Parse ML execution output
      const output = execResult.stdout.trim();
      const lastLine = output.split('\n').filter(line => line.trim()).pop() || '{}';
      let mlResult;
      
      try {
        mlResult = JSON.parse(lastLine);
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse ML model output',
        };
      }

      if (mlResult.error) {
        return {
          success: false,
          error: mlResult.error,
        };
      }

      console.log('Predictions generated successfully!');

      // Build clean prediction result
      const predictions = (mlResult.predictions || []).map((pred: number, idx: number) => ({
        date: mlResult.forecast_dates?.[idx] || new Date().toISOString(),
        value: Math.round(pred * 100) / 100, // Round to 2 decimals
        confidence: mlResult.confidence_scores?.[idx] || 50,
      }));

      return {
        success: true,
        kpi_name: historical_data[0].kpi_name,
        current_value: historical_data[historical_data.length - 1].kpi_value,
        predictions,
        model_used: generatedCode.modelType,
        trend_detected: dataAnalysis.trend,
      };

    } catch (error: any) {
      console.error('Error:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  },
});

export default predictiveModelTool;
