/**
 * Test Script for Predictive KPI Agent
 * 
 * This script tests the predictive model tool with sample data.
 */

import 'dotenv/config';
import { predictiveModelTool } from './tools/predictive-model.js';

// Sample historical KPI data (Sales Inventory Average)
const sampleData = [
  { kpi_name: 'Sales Inv Average', kpi_value: 58500.12, executed_at: '2025-12-01T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 58650.34, executed_at: '2025-12-02T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 58800.56, executed_at: '2025-12-03T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 58900.78, executed_at: '2025-12-04T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59000.90, executed_at: '2025-12-05T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59100.12, executed_at: '2025-12-06T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59200.34, executed_at: '2025-12-07T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59300.56, executed_at: '2025-12-08T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59400.78, executed_at: '2025-12-09T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59500.90, executed_at: '2025-12-10T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59600.12, executed_at: '2025-12-11T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59700.34, executed_at: '2025-12-12T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59800.56, executed_at: '2025-12-13T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59900.78, executed_at: '2025-12-14T13:30:00.000Z', frequency: 'daily' },
  { kpi_name: 'Sales Inv Average', kpi_value: 59056.44, executed_at: '2025-12-15T13:30:00.000Z', frequency: 'daily' },
];

async function runTest() {
  console.log('🚀 Starting Predictive KPI Agent Test\n');
  console.log('📊 Sample Data Points:', sampleData.length);
  console.log('📅 Date Range:', sampleData[0].executed_at, 'to', sampleData[sampleData.length - 1].executed_at);
  console.log('\n⏳ Running predictive model tool...\n');

  try {
    const result = await predictiveModelTool.execute({
      context: {
        historical_data: sampleData,
        forecast_horizon: 7,
      },
      // Provide a minimal runtimeContext for local tests. Cast to any to satisfy TypeScript.
      runtimeContext: {} as any,
      suspend: async () => {},
    });

    if (!result.success) {
      console.error('❌ Failed:', result.error);
      process.exit(1);
    }

    console.log('✅ Success!\n');
    console.log('📊 KPI:', result.kpi_name);
    console.log('📈 Current Value:', result.current_value);
    console.log('📉 Trend Detected:', result.trend_detected);
    console.log('🤖 Model Used:', result.model_used);
    console.log('\n🔮 Future Predictions:');
    
    result.predictions?.forEach((pred, idx) => {
      console.log(`   ${idx + 1}. ${pred.date.split('T')[0]} → ${pred.value.toFixed(2)} (${pred.confidence}% confidence)`);
    });
    
    console.log('\n💡 Ready for Mastra UI:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

runTest();
