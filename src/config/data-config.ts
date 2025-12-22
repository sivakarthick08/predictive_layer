/**
 * Data Configuration Module
 * Centralized management for data from both JSON files and Postgres database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

// Dynamically resolve project root to avoid duplicate top-level declarations in bundles
function getProjectRoot() {
  // This function is only called inside other functions, so __filename is not redeclared at top level
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..', '..');
}

// Data sources configured via environment variables only
// DATABASE_URL for PostgreSQL, DATA_FILE for file path
if (!process.env.DATABASE_URL && !process.env.DATA_FILE) {
  console.warn('⚠️  Warning: Neither DATABASE_URL (PostgreSQL) nor DATA_FILE (JSON file path) is configured in environment variables.');
}

// Type definitions
export type KpiDataPoint = {
  kpi_name: string;
  kpi_value: number;
  executed_at: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
};

export type DataSourceConfig = {
  mode: 'file' | 'postgres';
  filePath?: string;
  pgConnectionString?: string;
  pgQuery?: string;
  pgTable?: string;
};

/**
 * Resolve data file path - uses DATA_FILE environment variable only
 * No automatic fallbacks or hardcoded paths
 */
export function resolveDataFilePath(): string | null {
  if (!process.env.DATA_FILE) {
    return null; // No DATA_FILE configured
  }
  const abs = path.isAbsolute(process.env.DATA_FILE)
    ? process.env.DATA_FILE
    : path.resolve(process.cwd(), process.env.DATA_FILE);
  if (fs.existsSync(abs)) {
    return abs;
  }
  throw new Error(`DATA_FILE environment variable points to non-existent file: ${abs}`);
}

/**
 * Get default dataSource configuration
 */
export function getDefaultDataSource(): DataSourceConfig {
  return {
    mode: 'file',
    filePath: undefined, // Will auto-resolve in tools
  };
}

/**
 * Read and parse data file (JSON only)
 * Requires DATA_FILE environment variable or explicit filePath parameter
 */
export function readDataFile(filePath?: string): KpiDataPoint[] {
  let fp: string | null = null;
  
  if (filePath) {
    // Use provided path
    fp = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  } else if (process.env.DATA_FILE) {
    // Use DATA_FILE env var
    fp = path.isAbsolute(process.env.DATA_FILE)
      ? process.env.DATA_FILE
      : path.resolve(process.cwd(), process.env.DATA_FILE);
  } else {
    throw new Error('DATA_FILE environment variable must be set or filePath parameter must be provided');
  }
  
  if (!fs.existsSync(fp)) {
    throw new Error(`Data file not found at: ${fp}\n(Set via DATA_FILE environment variable or explicit filePath parameter)`);
  }

  console.log(`[File Loading] Reading JSON file: ${fp}`);
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.data || []);
  console.log(`[File Loaded] ${arr.length} data points from file`);
  
  // Normalize to KpiDataPoint
  return arr.map((item: any) => ({
    kpi_name: item.kpi_name || 'unknown',
    kpi_value: Number(item.kpi_value ?? 0),
    executed_at: item.executed_at || new Date().toISOString(),
    frequency: (item.frequency || 'daily') as 'daily' | 'weekly' | 'monthly',
  }));
}

/**
 * Load data from Postgres database
 */
export async function loadDataFromPostgres(config: {
  pgConnectionString: string;
  pgQuery?: string;
  pgTable?: string;
}): Promise<KpiDataPoint[]> {
  const conn = config.pgConnectionString || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error('Postgres connection string required (pgConnectionString or DATABASE_URL env var)');
  }

  const dbName = conn.split('/').pop()?.split('?')[0] || 'unknown';
  console.log(`[PostgreSQL] Connecting to database: ${dbName}`);
  
  const client = new Client({ connectionString: conn });
  await client.connect();
  console.log(`[PostgreSQL] Connected successfully`);
  
  try {
    const query = config.pgQuery || (config.pgTable ? `SELECT * FROM ${config.pgTable} ORDER BY executed_at ASC` : null);
    if (!query) {
      throw new Error('pgQuery or pgTable required for Postgres mode');
    }

    console.log(`[PostgreSQL] Executing query: ${query}`);
    const result = await client.query(query);
    const rows = result.rows || [];
    console.log(`[PostgreSQL] Retrieved ${rows.length} rows from database`);

    // Map Postgres rows to KpiDataPoint, handling various column naming conventions
    return rows.map((row: any) => ({
      kpi_name: row.kpi_name || row.name || row.metric || row.kpi || 'unknown',
      kpi_value: Number(row.kpi_value ?? row.value ?? row.kpi_value_num ?? 0),
      executed_at: (row.executed_at || row.timestamp || row.created_at || row.date || new Date()).toString(),
      frequency: (row.frequency || 'daily') as 'daily' | 'weekly' | 'monthly',
    }));
  } finally {
    await client.end();
    console.log(`[PostgreSQL] Connection closed`);
  }
}

/**
 * Load data from any source (file or Postgres)
 * Main function to use in tools and workflows
 * Priority: explicit config > environment variables
 */
export async function loadData(dataSource?: DataSourceConfig | null): Promise<KpiDataPoint[]> {
  const config = dataSource;

  // If explicit config provided, use it
  if (config) {
    if (config.mode === 'postgres') {
      const pgConnectionString = config.pgConnectionString || process.env.DATABASE_URL || '';
      const pgTable = config.pgTable || process.env.DATABASE_TABLE;
      console.log(`[Data Source] Loading from PostgreSQL: ${pgConnectionString.split('@')[1] || 'custom'} | Table: ${pgTable}`);
      return await loadDataFromPostgres({
        pgConnectionString,
        pgQuery: config.pgQuery,
        pgTable,
      });
    } else {
      const filePath = config.filePath || process.env.DATA_FILE;
      console.log(`[Data Source] Loading from JSON File: ${filePath}`);
      return readDataFile(filePath);
    }
  }

  // No explicit config: use environment variables
  // Priority: DATABASE_URL (postgres) over DATA_FILE (file)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    const pgTable = process.env.DATABASE_TABLE || 'public.kpi_data';
    console.log(`[Data Source] Loading from PostgreSQL (env var): ${process.env.DATABASE_URL.split('@')[1] || 'custom'} | Table: ${pgTable}`);
    return await loadDataFromPostgres({
      pgConnectionString: process.env.DATABASE_URL,
      pgTable,
    });
  } else if (process.env.DATA_FILE) {
    console.log(`[Data Source] Loading from JSON File (env var): ${process.env.DATA_FILE}`);
    return readDataFile(process.env.DATA_FILE);
  } else {
    throw new Error('No data source configured. Set DATABASE_URL (PostgreSQL) with optional DATABASE_TABLE, or DATA_FILE (JSON file path) environment variables.');
  }
}

/**
 * List available KPIs from data
 */
export function listAvailableKpis(data: KpiDataPoint[]): Array<{ name: string; count: number; last_value: number; last_date: string }> {
  const kpiMap = new Map<string, KpiDataPoint[]>();
  
  for (const d of data) {
    if (d.kpi_name) {
      const arr = kpiMap.get(d.kpi_name) || [];
      arr.push(d);
      kpiMap.set(d.kpi_name, arr);
    }
  }

  return Array.from(kpiMap.entries())
    .map(([name, values]) => {
      const sorted = values.sort((a, b) => new Date(a.executed_at || 0).getTime() - new Date(b.executed_at || 0).getTime());
      const lastItem = sorted[sorted.length - 1];
      return {
        name,
        count: values.length,
        last_value: lastItem?.kpi_value || 0,
        last_date: lastItem?.executed_at || new Date().toISOString(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Utility: Detect which data source is configured
export function getActiveDataSourceType(): 'file' | 'postgres' | 'none' {
  if (process.env.DATA_FILE) return 'file';
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) return 'postgres';
  return 'none';
}

// Utility: Get the effective data file path from DATA_FILE env var
export function getEffectiveDataFilePath(): string | null {
  if (!process.env.DATA_FILE) {
    return null;
  }
  return path.isAbsolute(process.env.DATA_FILE)
    ? process.env.DATA_FILE
    : path.resolve(process.cwd(), process.env.DATA_FILE);
}
