/**
 * Predictive Analysis Workflow
 * 
 * A Mastra workflow that generates KPI predictions using ML models.
 */

import { createWorkflow } from '@mastra/core';
import { z } from 'zod';
import { predictiveModelTool } from '../tools/index.js';

// Define the workflow
export const predictiveAnalysisWorkflow = createWorkflow({
  id: 'predictive-analysis-workflow',
  inputSchema: z.object({
    historical_data: z.array(z.object({
      kpi_name: z.string(),
      kpi_value: z.number(),
      executed_at: z.string(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
    })),
    forecast_horizon: z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    predictions: z.any().optional(),
    metadata: z.any().optional(),
  }),
});

predictiveAnalysisWorkflow
  .map(async ({ inputData, runtimeContext }) => {
    // Step 1: Validate and prepare data
    const { historical_data, forecast_horizon } = inputData;

    // Validation
    if (!historical_data || historical_data.length === 0) {
      throw new Error('No historical data provided');
    }

    if (historical_data.length < 7) {
      throw new Error('Insufficient data: need at least 7 data points for reliable predictions');
    }

    // Sort by date
    const sorted = [...historical_data].sort(
      (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    );

    return {
      validated_data: sorted,
      forecast_horizon,
      runtimeContext,
      data_summary: {
        total_points: sorted.length,
        kpi_name: sorted[0]?.kpi_name || 'Unknown',
        date_range: {
          start: sorted[0]?.executed_at,
          end: sorted[sorted.length - 1]?.executed_at,
        },
      },
    };
  })
  .map(async ({ inputData, runtimeContext }) => {
    // Step 2: Generate predictions using ML model
    const { validated_data, forecast_horizon } = inputData;

    const result = await predictiveModelTool.execute({
      context: {
        historical_data: validated_data,
        forecast_horizon,
      },
      // runtimeContext is provided by Mastra at runtime; pass through when available
      runtimeContext,
      suspend: async () => {},
    });

    if (!result.success) {
      throw new Error(`Prediction failed: ${result.error}`);
    }

    // Our predictive tool now returns predictions as an array of { date, value, confidence }
    return {
      ...inputData,
      predictions: result.predictions,
      model_info: { algorithm: result.model_used },
      forecast_dates: result.predictions?.map((p: any) => p.date) ?? [],
    };
  })
  .map(async ({ inputData }) => {
    // Step 3: Return predictions only
    const {
      data_summary,
      predictions,
      forecast_dates,
      model_info,
    } = inputData;

    return {
      success: true,
      predictions: {
        kpi_name: data_summary.kpi_name,
        predictions,
        forecast_dates,
        model_info,
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        data_points_analyzed: data_summary.total_points,
        forecast_horizon: predictions.length,
      },
    };
  })
  .commit();

export default predictiveAnalysisWorkflow;
