/**
 * Predictive Model Tool
 * 
 * Intelligent KPI forecasting tool that:
 * 1. Validates and cleans data
 * 2. Uses LLM to analyze data characteristics and select optimal ML model
 * 3. Generates custom Python ML code via LLM based on data patterns
 * 4. Executes generated code in E2B sandbox for predictions
 * 5. Returns only future predictions for Mastra UI
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { executePythonCode } from './e2b-client.js';
import { 
  analyzeDataCharacteristics, 
  generateMLModelCode,  
} from './ml-model-generator.js';

/**
 * Validate and clean historical data
 */
function validateAndCleanData(data: any[]): { 
  valid: boolean; 
  cleaned?: any[]; 
  error?: string;
  stats?: {
    original_count: number;
    cleaned_count: number;
    removed: number;
  }
} {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { valid: false, error: 'Data must be a non-empty array' };
  }

  let cleaned: any[] = [];
  let removed = 0;

  for (const record of data) {
    // Validate required fields
    if (!record.kpi_name || typeof record.kpi_name !== 'string') {
      removed++;
      continue;
    }

    if (record.kpi_value === null || record.kpi_value === undefined || !Number.isFinite(record.kpi_value)) {
      removed++;
      continue;
    }

    if (!record.executed_at || typeof record.executed_at !== 'string') {
      removed++;
      continue;
    }

    // Validate date format
    const dateTime = new Date(record.executed_at);
    if (isNaN(dateTime.getTime())) {
      removed++;
      continue;
    }

    // Add valid record
    cleaned.push({
      kpi_name: record.kpi_name.trim(),
      kpi_value: Number(record.kpi_value),
      executed_at: record.executed_at,
      frequency: record.frequency || 'daily',
    });
  }

  // Must have at least 5 data points
  if (cleaned.length < 5) {
    return { 
      valid: false, 
      error: `Insufficient valid data: need at least 5 data points, got ${cleaned.length} (removed ${removed} invalid records)`,
      stats: {
        original_count: data.length,
        cleaned_count: cleaned.length,
        removed,
      }
    };
  }

  // Sort by date ascending
  cleaned.sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());

  return {
    valid: true,
    cleaned,
    stats: {
      original_count: data.length,
      cleaned_count: cleaned.length,
      removed,
    }
  };
}

/**
 * Validate predictions output from ML model
 */
function validatePredictions(predictions: any[]): boolean {
  if (!Array.isArray(predictions)) return false;
  return predictions.every(p => 
    typeof p === 'number' && Number.isFinite(p)
  );
}

export const predictiveModelTool = createTool({
  id: 'predictive-model',
  description: 'Intelligent KPI forecasting: Validates data, LLM analyzes patterns, generates optimal ML code, executes in E2B sandbox, provides business insights',
  inputSchema: z.object({
    historical_data: z.array(z.object({
      kpi_name: z.string(),
      kpi_value: z.number(),
      executed_at: z.string(),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    })),
    forecast_horizon: z.number().describe('Number of future periods to forecast'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kpi_name: z.string().optional(),
    current_value: z.number().optional(),
    data_points_used: z.number().optional(),
    predictions: z.array(z.object({
      date: z.string(),
      value: z.number(),
      confidence: z.number(),
    })).optional(),
    model_used: z.string().optional(),
    trend_detected: z.string().optional(),
    data_quality: z.object({
      original_count: z.number(),
      cleaned_count: z.number(),
      removed: z.number(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { historical_data, forecast_horizon } = context;

      console.log('[Predictive Model] Step 0: Validating and cleaning data...');
      
      // Step 0: Validate and clean data
      const validation = validateAndCleanData(historical_data);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          data_quality: validation.stats,
        };
      }

      const cleanedData = validation.cleaned!;
      const kpiName = cleanedData[0].kpi_name;
      const currentValue = cleanedData[cleanedData.length - 1].kpi_value;

      console.log(`[Predictive Model] Data cleaned: ${validation.stats?.original_count} → ${validation.stats?.cleaned_count} records (removed ${validation.stats?.removed})`);
      console.log(`[Predictive Model] Step 1: LLM analyzing data characteristics...`);
      
      // Step 1: Use LLM to analyze data characteristics
      const dataAnalysis = await analyzeDataCharacteristics(cleanedData);
      
      console.log(`[Predictive Model] Analysis complete - Trend: ${dataAnalysis.trend} | Recommended: ${dataAnalysis.recommendedModel}`);

      // Step 2: Use LLM to generate appropriate ML model code
      console.log(`[Predictive Model] Step 2: Generating ML model code...`);
      const generatedCode = await generateMLModelCode(dataAnalysis, forecast_horizon);
      
      console.log(`[Predictive Model] Generated model: ${generatedCode.modelType}`);

      // Step 3: Execute generated code in E2B sandbox
      console.log(`[Predictive Model] Step 3: Executing ML model in E2B...`);
      const files = {
        'historical_data.json': JSON.stringify(cleanedData),
      };

      const execResult = await executePythonCode(generatedCode.pythonCode, files, 45000);

      // SystemExit(0) is expected and means success
      const hasRealError = execResult.error && 
        !(execResult.error.name === 'SystemExit' && execResult.error.value === '0');

      if (hasRealError) {
        return {
          success: false,
          kpi_name: kpiName,
          data_points_used: cleanedData.length,
          data_quality: validation.stats,
          error: `E2B execution failed: ${JSON.stringify(execResult.error)}`,
        };
      }

      // Parse ML execution output
      console.log(`[Predictive Model] Parsing execution results...`);
      const output = execResult.stdout.trim();
      const lastLine = output.split('\n').filter(line => line.trim()).pop() || '{}';
      
      let mlResult;
      try {
        mlResult = JSON.parse(lastLine);
      } catch (parseError) {
        console.error(`[Predictive Model] Failed to parse output: ${lastLine}`);
        return {
          success: false,
          kpi_name: kpiName,
          data_points_used: cleanedData.length,
          data_quality: validation.stats,
          error: 'Failed to parse ML model output. Check E2B execution.',
        };
      }

      if (mlResult.error) {
        return {
          success: false,
          kpi_name: kpiName,
          data_points_used: cleanedData.length,
          data_quality: validation.stats,
          error: `ML execution error: ${mlResult.error}`,
        };
      }

      // Validate predictions
      if (!mlResult.predictions || !validatePredictions(mlResult.predictions)) {
        return {
          success: false,
          kpi_name: kpiName,
          data_points_used: cleanedData.length,
          data_quality: validation.stats,
          error: 'ML model produced invalid predictions (non-numeric or NaN values)',
        };
      }

      console.log(`[Predictive Model] ✅ Success! Generated ${mlResult.predictions.length} predictions`);

      // Build clean prediction result
      const predictions = (mlResult.predictions || []).map((pred: number, idx: number) => {
        // Generate forecast dates (assuming daily frequency)
        const lastDate = new Date(cleanedData[cleanedData.length - 1].executed_at);
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + idx + 1);

        return {
          date: forecastDate.toISOString().split('T')[0],
          value: Math.round(pred * 100) / 100,
          confidence: mlResult.confidence_scores?.[idx] || (90 - idx * 2),
        };
      });

      return {
        success: true,
        kpi_name: kpiName,
        current_value: currentValue,
        data_points_used: cleanedData.length,
        predictions,
        model_used: generatedCode.modelType,
        trend_detected: dataAnalysis.trend,
        data_quality: validation.stats,
      };

    } catch (error: any) {
      console.error('[Predictive Model] Unexpected error:', error);
      return {
        success: false,
        error: `Predictive Model error: ${error.message || 'Unknown error'}`,
      };
    }
  },
});

export default predictiveModelTool;
