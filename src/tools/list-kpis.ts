import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadData, listAvailableKpis, DataSourceConfig } from '../config/data-config.js';

export const listKpisTool = createTool({
  id: 'list-kpis',
  description: 'List all available KPIs from PostgreSQL database or JSON files with statistics',
  inputSchema: z.object({
    dataSource: z.object({
      mode: z.enum(['file', 'postgres']).optional(),
      filePath: z.string().optional(),
      pgConnectionString: z.string().optional(),
      pgQuery: z.string().optional(),
      pgTable: z.string().optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kpis: z.array(z.object({
      name: z.string(),
      count: z.number(),
      last_value: z.number(),
      last_date: z.string(),
    })).optional(),
    total_kpis: z.number().optional(),
    total_data_points: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { dataSource } = context as any;
      console.log('[listKpis] Starting...');
      console.log('[listKpis] Data source config:', dataSource || 'Using environment variables');
      
      // Load data: uses environment variables (DATABASE_URL + DATABASE_TABLE priority) if no explicit dataSource
      const data = await loadData(dataSource || undefined);
      
      if (!data || data.length === 0) {
        console.log('[listKpis] ERROR: No data available');
        return { success: false, error: 'No data available' };
      }
      
      console.log(`[listKpis] Data loaded successfully: ${data.length} points`);
      
      // List KPIs using centralized function
      const kpis = listAvailableKpis(data);
      console.log(`[listKpis] Found ${kpis.length} unique KPIs`);
      
      return {
        success: true,
        kpis,
        total_kpis: kpis.length,
        total_data_points: data.length,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[listKpis] ERROR: ${errMsg}`);
      return {
        success: false,
        error: `Failed to list KPIs: ${errMsg}`,
      };
    }
  },
});


export default listKpisTool;
