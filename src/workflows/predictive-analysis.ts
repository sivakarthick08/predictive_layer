import { createWorkflow, createStep } from '@mastra/core';
import { z } from 'zod';
import { predictiveModelTool } from '../tools/index.js';
import { loadData, listAvailableKpis, getDefaultDataSource } from '../config/data-config.js';

type KpiPoint = {
  kpi_name: string;
  kpi_value: number;
  executed_at: string;
  frequency?: string;
};

// STEP 1: Load data and list KPIs
const loadDataStep = createStep({
  id: 'load-data',
  inputSchema: z.object({
    dataSource: z.object({
      mode: z.enum(['file', 'postgres']).optional().default('file'),
      filePath: z.string().optional(),
      pgConnectionString: z.string().optional(),
      pgQuery: z.string().optional(),
      pgTable: z.string().optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    kpi_list: z.array(z.string()),
    total_points: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { dataSource } = inputData as any;
    const data = await loadData(dataSource);
    
    if (!data || data.length === 0) {
      throw new Error('No historical data available');
    }

    // Extract unique KPIs
    const kpiSet = Array.from(new Set(data.map(d => d.kpi_name))).filter(Boolean) as string[];
    
    // Return only summaries (not the large dataset)
    return {
      kpi_list: kpiSet,
      total_points: data.length,
    };
  },
});

// STEP 2: Ask user to select KPI and forecast parameters
const selectKpiStep = createStep({
  id: 'select-kpi',
  inputSchema: z.object({
    kpi_list: z.array(z.string()),
    total_points: z.number(),
  }),
  outputSchema: z.object({
    selected_kpi: z.string(),
    forecast_horizon: z.number(),
  }),
  suspendSchema: z.object({
    message: z.string(),
    available_kpis: z.array(z.string()),
  }),
  resumeSchema: z.object({
    selected_kpi: z.string(),
    forecast_horizon: z.number().optional(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { kpi_list } = inputData as any;

    // If no resume data, suspend and ask user
    if (!resumeData?.selected_kpi) {
      return await suspend({
        message: 'Please select a KPI and forecast period',
        available_kpis: kpi_list,
      });
    }

    // Use resume data
    const horizon = resumeData.forecast_horizon || 7;
    return {
      selected_kpi: resumeData.selected_kpi,
      forecast_horizon: horizon,
    };
  },
});

// STEP 3: Load and preprocess data for selected KPI
const preprocessStep = createStep({
  id: 'preprocess-data',
  inputSchema: z.object({
    dataSource: z.object({
      mode: z.enum(['file', 'postgres']).optional().default('file'),
      filePath: z.string().optional(),
      pgConnectionString: z.string().optional(),
      pgQuery: z.string().optional(),
      pgTable: z.string().optional(),
    }).optional(),
    selected_kpi: z.string(),
    forecast_horizon: z.number(),
  }),
  outputSchema: z.object({
    selected_kpi: z.string(),
    data_points: z.number(),
    last_value: z.number(),
    last_date: z.string(),
    forecast_horizon: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { dataSource, selected_kpi, forecast_horizon } = inputData as any;

    const allData = await loadData(dataSource);

    // Filter for selected KPI
    let filtered = allData.filter(d => d.kpi_name === selected_kpi);
    filtered = filtered.filter(d => d && typeof d.kpi_value === 'number' && typeof d.executed_at === 'string');
    
    if (!filtered || filtered.length === 0) {
      throw new Error(`No data available for KPI: ${selected_kpi}`);
    }

    // Sort by date
    filtered.sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());
    
    const lastItem = filtered[filtered.length - 1];

    // Return summary (not the full dataset)
    return {
      selected_kpi,
      data_points: filtered.length,
      last_value: lastItem.kpi_value,
      last_date: lastItem.executed_at,
      forecast_horizon,
    };
  },
});

// STEP 4: Generate predictions using ML model
const modelStep = createStep({
  id: 'generate-predictions',
  inputSchema: z.object({
    dataSource: z.object({
      mode: z.enum(['file', 'postgres']).optional().default('file'),
      filePath: z.string().optional(),
      pgConnectionString: z.string().optional(),
      pgQuery: z.string().optional(),
      pgTable: z.string().optional(),
    }).optional(),
    selected_kpi: z.string(),
    data_points: z.number(),
    forecast_horizon: z.number(),
  }),
  outputSchema: z.object({
    predictions: z.any(),
    model_used: z.string(),
    insights: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData }) => {
    const { dataSource, selected_kpi, forecast_horizon } = inputData as any;

    const allData = await loadData(dataSource);
    const filtered = allData
      .filter(d => d.kpi_name === selected_kpi)
      .filter(d => d && typeof d.kpi_value === 'number')
      .sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());

    // Call predictive model tool
    const result = await predictiveModelTool.execute({
      context: {
        historical_data: filtered,
        forecast_horizon,
      },
      requestContext,
    });

    if (!result.success) {
      throw new Error(`Model execution failed: ${result.error}`);
    }

    return {
      predictions: result.predictions || [],
      model_used: result.model_used || 'GradientBoostingRegressor',
      insights: result.insights || [],
    };
  },
});

// STEP 5: Format output
const formatStep = createStep({
  id: 'format-output',
  inputSchema: z.object({
    selected_kpi: z.string(),
    data_points: z.number(),
    last_value: z.number(),
    last_date: z.string(),
    forecast_horizon: z.number(),
    predictions: z.any(),
    model_used: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kpi_name: z.string(),
    forecast_count: z.number(),
    forecast_data: z.array(z.object({
      date: z.string(),
      forecast_value: z.number(),
      confidence: z.number(),
    })),
    metadata: z.object({
      model_used: z.string(),
      historical_points: z.number(),
      last_historical_value: z.number(),
      last_historical_date: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { selected_kpi, data_points, last_value, last_date, predictions, model_used } = inputData as any;

    const formattedPredictions = (predictions || []).map((p: any, idx: number) => ({
      date: p.date || p.forecast_date || new Date(new Date(last_date).getTime() + (idx + 1) * 86400000).toISOString(),
      forecast_value: p.value || p.forecast_value || p.prediction || 0,
      confidence: p.confidence || Math.max(40, 90 - idx),
    }));

    return {
      success: true,
      kpi_name: selected_kpi,
      forecast_count: formattedPredictions.length,
      forecast_data: formattedPredictions,
      metadata: {
        model_used,
        historical_points: data_points,
        last_historical_value: last_value,
        last_historical_date: last_date,
      },
    };
  },
});

// Define the workflow
export const predictiveAnalysisWorkflow = createWorkflow({
  id: 'predictive-analysis-workflow',
  inputSchema: z.object({
    dataSource: z.object({
      mode: z.enum(['file', 'postgres']).optional().default('file'),
      filePath: z.string().optional(),
      pgConnectionString: z.string().optional(),
      pgQuery: z.string().optional(),
      pgTable: z.string().optional(),
    }).optional(),
    selected_kpi: z.string().optional(),
    forecast_horizon: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kpi_name: z.string(),
    forecast_count: z.number(),
    forecast_data: z.any(),
    metadata: z.any(),
  }),
})
  .then(loadDataStep)
  .then(selectKpiStep)
  .then(preprocessStep)
  .then(modelStep)
  .then(formatStep)
  .commit();

export default predictiveAnalysisWorkflow;
