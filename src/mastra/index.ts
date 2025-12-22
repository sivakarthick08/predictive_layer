/**
 * Mastra Instance
 * 
 * Main configuration for the Predictive Agent application
 * Includes storage for suspend/resume workflow support
 */

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import dotenv from 'dotenv';
import path from 'path';
import { predictiveKpiAgent } from '../agents/index.js';
import { predictiveAnalysisWorkflow } from '../workflows/index.js';

// Load environment variables
dotenv.config();

export const mastra = new Mastra({
  agents: {
    predictiveKpiAgent,
  },
  workflows: {
    predictiveAnalysisWorkflow,
  },
  storage: new LibSQLStore({
    id: 'workflow-snapshots-storage',
    url: `file:${path.resolve(process.cwd(), 'workflow-snapshots.db')}`,
  }),
  server: {
    port: parseInt(process.env.PORT || '4111', 10),
    cors: {
      origin: '*',
      credentials: false,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
  },
});
