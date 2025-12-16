/**
 * Mastra Instance
 * 
 * Main configuration for the Predictive Agent application
 */

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import dotenv from 'dotenv';
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
  logger: new PinoLogger({
    name: 'PredictiveAgent',
    level: 'info',
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
