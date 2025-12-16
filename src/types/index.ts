/**
 * Core types for the Predictive KPI Agent
 */

export interface KpiDataPoint {
  kpi_name: string;
  kpi_value: number;
  executed_at: string; // ISO 8601 date string
  frequency: 'daily' | 'weekly' | 'monthly';
}

export interface PredictionResult {
  kpi_name: string;
  predictions: number[];
  forecast_dates: string[];
  confidence?: string;
  model_info?: {
    algorithm: string;
    training_samples: number;
    features_used: string[];
  };
}

export interface PredictiveAnalysisInput {
  historical_data: KpiDataPoint[];
  forecast_horizon: number; // number of periods to forecast
}

export interface PredictiveAnalysisOutput {
  success: boolean;
  predictions?: PredictionResult;
  error?: string;
  metadata?: {
    analysis_timestamp: string;
    data_points_analyzed: number;
    forecast_horizon: number;
  };
}
