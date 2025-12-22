import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { predictiveModelTool } from './predictive-model.js';
import { loadData, readDataFile, DataSourceConfig } from '../config/data-config.js';

type KpiPoint = {
  kpi_name: string;
  kpi_value: number;
  executed_at: string;
  frequency: 'daily' | 'weekly' | 'monthly';
};


// Load .env variables
dotenv.config();
// Use DATA_FILE_STORE env var if set, otherwise default to data_store.json
const STORE_FILE = path.resolve(process.cwd(), process.env.DATA_FILE_STORE || 'data_store.json');

function appendToStore(records: KpiPoint[]) {
  let store: { data: KpiPoint[] } = { data: [] };
  if (fs.existsSync(STORE_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      if (!Array.isArray(store.data)) store.data = [];
    } catch (e) {
      store = { data: [] };
    }
  }

  store.data.push(...records);
  // Limit store size to avoid OOM (keep only last 5000 records)
  if (store.data.length > 5000) {
    store.data = store.data.slice(store.data.length - 5000);
  }
  let jsonStr;
  try {
    jsonStr = JSON.stringify(store, null, 2);
  } catch (e) {
    // Fallback: truncate data and try again
    store.data = store.data.slice(-1000);
    jsonStr = JSON.stringify(store, null, 2);
  }
  fs.writeFileSync(STORE_FILE, jsonStr, 'utf8');
}

export const dataIngestTool = createTool({
  id: 'data-ingest',
  description: 'Ingest KPI data from JSON files, direct payload, or Postgres database and optionally store or deliver to model',
  inputSchema: z.object({
    dataSource: z.object({
      mode: z.enum(['file', 'payload', 'postgres']).optional(),
      filePath: z.string().optional(),
      pgConnectionString: z.string().optional(),
      pgQuery: z.string().optional(),
      pgTable: z.string().optional(),
    }).optional(),
    payload: z.array(z.object({
      kpi_name: z.string(),
      kpi_value: z.number(),
      executed_at: z.string(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    })).optional(),
    store: z.boolean().optional().default(false).describe('Store ingested data in local data_store.json'),
    deliverTo: z.enum(['store', 'predictive-model']).optional().default('store').describe('Store locally or deliver to predictive model'),
    forecast_horizon: z.number().optional().default(7),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    imported: z.number().optional(),
    source: z.string().optional(),
    storePath: z.string().optional(),
    deliverTo: z.string().optional(),
    modelResult: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { dataSource, payload, store, deliverTo, forecast_horizon } = context as any;
      console.log('[dataIngest Tool] Starting...');
      
      let records: KpiPoint[] = [];

      if (dataSource?.mode === 'payload') {
        console.log('[dataIngest] Data source: Direct Payload');
        if (!payload || !Array.isArray(payload)) {
          return { success: false, error: 'payload array required when mode=payload' };
        }
        records = payload.map((p: any) => ({
          kpi_name: p.kpi_name || 'unknown',
          kpi_value: Number(p.kpi_value ?? 0),
          executed_at: p.executed_at || new Date().toISOString(),
          frequency: (p.frequency || 'daily') as 'daily' | 'weekly' | 'monthly',
        }));
        console.log(`[dataIngest] Loaded ${records.length} records from payload`);
      } else {
        // Load from PostgreSQL (env vars priority) or file using centralized function
        try {
          console.log('[dataIngest] Data source config:', dataSource || 'Using environment variables');
          const data = await loadData(dataSource || undefined);
          records = data as KpiPoint[];
          console.log(`[dataIngest] Loaded ${records.length} records`);
        } catch (err) {
          return {
            success: false,
            imported: 0,
            error: `Failed to load data: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }

      if (!records || records.length === 0) {
        return { success: false, imported: 0, error: 'No data to ingest' };
      }

      // Store if requested
      if (store) {
        appendToStore(records);
      }

      // Determine source
      const source = dataSource?.mode === 'postgres' ? 'Postgres' : dataSource?.mode === 'payload' ? 'Direct Payload' : 'JSON File';

      // Deliver to predictive model if requested
      if (deliverTo === 'predictive-model') {
        try {
          const modelResult = await predictiveModelTool.execute({
            context: {
              historical_data: records,
              forecast_horizon: Number(forecast_horizon || 7),
            },
          } as any);
          return {
            success: true,
            imported: records.length,
            source,
            deliverTo: 'predictive-model',
            modelResult,
          };
        } catch (err) {
          return {
            success: false,
            imported: records.length,
            error: `Failed to deliver to model: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }

      return {
        success: true,
        imported: records.length,
        source,
        storePath: store ? STORE_FILE : undefined,
        deliverTo: 'store',
      };
    } catch (err) {
      return {
        success: false,
        imported: 0,
        error: `Ingest failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});

export default dataIngestTool;
