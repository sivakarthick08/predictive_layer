# 🚀 Batch Forecasting Guide

Multi-KPI forecasting allows you to forecast multiple KPIs at once with a single request. This is useful for generating comprehensive reports, comparing multiple metrics, and batch processing.

---

## ✨ Key Features

### ✅ Simultaneous Multi-KPI Forecasting
- Forecast 2, 5, 10+ KPIs in one request
- Parallel or sequential execution
- Shared result format across all KPIs

### ⚡ Performance Options
- **Parallel Mode** (default): All KPIs forecast simultaneously
  - Faster: ~30-60 seconds for 2-3 KPIs
  - Uses more resources
  - Best for small batches (2-5 KPIs)

- **Sequential Mode**: KPIs forecast one at a time
  - Slower but predictable
  - Lower resource usage
  - Best for large batches (10+ KPIs)
  - Helps avoid rate limiting

### 🤖 Intelligent Model Selection
Each KPI automatically gets the best available model:
- Prophet (primary) for 10+ data points
- LSTM (fallback) for 25+ data points
- Adaptive ML (fallback) for 5+ data points
- Simple Forecast (final fallback) for 3+ data points

---

## 📊 Quick Start

### 1. Test with Demo Script
```bash
npm run batch-forecast
```

This runs a complete example with both parallel and sequential forecasting.

### 2. Use in Your Code

```typescript
import { batchIntelligentForecastTool } from './tools/index.js';

// Forecast multiple KPIs
const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: ['Active Product Count', 'Total Dealer Count'],
    forecast_horizon: 7,
    parallel: true,
  },
});

console.log(`✅ Forecasted ${result.successful_forecasts} KPIs`);
for (const forecast of result.forecasts) {
  console.log(`${forecast.kpi_name}: ${forecast.model_used}`);
}
```

### 3. Use in Agent Conversations

```
User: "Forecast Active Product Count and Total Dealer Count for the next 7 days"

Agent: [Uses batch-intelligent-forecast tool automatically]

Agent Response: Shows predictions for both KPIs with trends and confidence intervals
```

---

## 📋 API Reference

### Input Schema

```typescript
{
  kpi_names: string[]              // Required: Array of KPI names
  forecast_horizon?: number        // Optional: Days to forecast (default: 7)
  parallel?: boolean               // Optional: Parallel/sequential (default: true)
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `kpi_names` | `string[]` | ✅ Yes | - | List of KPI names to forecast |
| `forecast_horizon` | `number` | ❌ No | 7 | Number of periods to forecast |
| `parallel` | `boolean` | ❌ No | true | Run in parallel (true) or sequentially (false) |

### Output Schema

```typescript
{
  success: boolean                    // Overall success
  total_kpis: number                 // Total KPIs requested
  successful_forecasts: number       // Successfully forecasted
  failed_forecasts: number           // Failed forecasts
  total_time_ms: number              // Total execution time
  forecasts: Array<{
    kpi_name: string
    success: boolean
    current_value?: number
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
    data_points_used?: number
    predictions?: Array<{
      date: string
      value: number
      confidence?: number
      lower_bound?: number
      upper_bound?: number
    }>
    model_used?: string
    model_tier?: 'primary' | 'secondary' | 'tertiary'
    summary?: string
    highlights?: string[]
    recommended_actions?: Array<{
      action: string
      horizon: string
    }>
    error?: string                   // Only if failed
  }>
  error?: string                     // Only if critical error
}
```

---

## 🎯 Usage Examples

### Example 1: Basic Multi-KPI Forecast

```typescript
const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: ['Active Product Count', 'Total Dealer Count'],
    forecast_horizon: 7,
  },
});
```

**Result:**
```json
{
  "success": true,
  "total_kpis": 2,
  "successful_forecasts": 2,
  "failed_forecasts": 0,
  "total_time_ms": 45000,
  "forecasts": [
    {
      "kpi_name": "Active Product Count",
      "success": true,
      "current_value": 7229,
      "model_used": "Prophet",
      "data_points_used": 63,
      "predictions": [...]
    },
    {
      "kpi_name": "Total Dealer Count",
      "success": true,
      "current_value": 15644,
      "model_used": "Adaptive ML",
      "data_points_used": 6,
      "predictions": [...]
    }
  ]
}
```

### Example 2: Extended Forecast Horizon

```typescript
// Forecast 30 days ahead for all KPIs
const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: ['Active Product Count', 'Total Dealer Count'],
    forecast_horizon: 30,
    parallel: true,
  },
});
```

### Example 3: Sequential for Rate Limiting

```typescript
// If you have rate limiting concerns, use sequential mode
const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: [
      'KPI1',
      'KPI2', 
      'KPI3',
      'KPI4',
      'KPI5',
    ],
    forecast_horizon: 7,
    parallel: false,  // Execute one at a time
  },
});
```

### Example 4: Error Handling

```typescript
const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: ['Active Product Count', 'NonExistent KPI'],
    forecast_horizon: 7,
  },
});

if (!result.success) {
  console.error('Some forecasts failed:');
  for (const forecast of result.forecasts) {
    if (!forecast.success) {
      console.error(`${forecast.kpi_name}: ${forecast.error}`);
    }
  }
}
```

---

## ⚙️ Configuration Options

### Parallel vs Sequential

#### Parallel Mode (Default)
```typescript
parallel: true  // or omit for default
```

**Advantages:**
- Fastest for small batches
- ~30-60 seconds for 2-3 KPIs
- Good for interactive use

**Disadvantages:**
- Higher resource usage
- May hit rate limits with 10+ KPIs
- Can be slower with very large datasets

**Best for:**
- 2-5 KPIs
- Interactive forecasting
- Quick dashboards

#### Sequential Mode
```typescript
parallel: false
```

**Advantages:**
- Lower resource usage
- Won't hit rate limits
- Predictable timing
- Better for large batches

**Disadvantages:**
- Slower: ~5-30 seconds per KPI
- Less responsive for interactive use

**Best for:**
- 5+ KPIs
- Batch processing
- Scheduled reports
- Rate-limited environments

### Forecast Horizon

```typescript
forecast_horizon: 7    // Default (1 week)
forecast_horizon: 14   // 2 weeks
forecast_horizon: 30   // 1 month
forecast_horizon: 365  // 1 year
```

---

## 📊 Sample Output

```json
{
  "success": true,
  "total_kpis": 2,
  "successful_forecasts": 2,
  "failed_forecasts": 0,
  "total_time_ms": 42156,
  "forecasts": [
    {
      "kpi_name": "Active Product Count",
      "success": true,
      "current_value": 7229,
      "frequency": "daily",
      "data_points_used": 63,
      "predictions": [
        {
          "date": "2025-12-18T11:30:00.000Z",
          "value": 7245,
          "confidence": 0.95,
          "lower_bound": 7100,
          "upper_bound": 7380
        },
        {
          "date": "2025-12-19T11:30:00.000Z",
          "value": 7260,
          "confidence": 0.94,
          "lower_bound": 7080,
          "upper_bound": 7420
        }
      ],
      "model_used": "Prophet",
      "model_tier": "primary",
      "summary": "Active Product Count shows an upward trend with stable patterns.",
      "highlights": [
        "Consistent growth trend observed",
        "Forecast confidence: 95%",
        "Peak expected around day 5"
      ],
      "recommended_actions": [
        {
          "action": "Monitor inventory levels",
          "horizon": "next 7 days"
        }
      ]
    },
    {
      "kpi_name": "Total Dealer Count",
      "success": true,
      "current_value": 15644,
      "frequency": "daily",
      "data_points_used": 6,
      "predictions": [
        {
          "date": "2025-12-18T11:30:00.000Z",
          "value": 15655
        }
      ],
      "model_used": "Adaptive ML",
      "model_tier": "tertiary",
      "summary": "Limited historical data available for this KPI.",
      "highlights": [
        "Using Adaptive ML model",
        "Forecast confidence: 75%",
        "Consider adding more historical data"
      ],
      "recommended_actions": [
        {
          "action": "Collect more historical data",
          "horizon": "ongoing"
        }
      ]
    }
  ]
}
```

---

## 🔧 Advanced Usage

### Conditional Parallel/Sequential Based on KPI Count

```typescript
const kpiNames = ['KPI1', 'KPI2', 'KPI3', 'KPI4'];

const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: kpiNames,
    forecast_horizon: 7,
    parallel: kpiNames.length <= 3,  // Parallel if 3 or fewer
  },
});
```

### Error Recovery

```typescript
const result = await batchIntelligentForecastTool.execute({
  context: {
    kpi_names: ['KPI1', 'KPI2', 'KPI3'],
    forecast_horizon: 7,
  },
});

const successful = result.forecasts.filter(f => f.success);
const failed = result.forecasts.filter(f => !f.success);

console.log(`Successful: ${successful.length}, Failed: ${failed.length}`);

if (failed.length > 0) {
  console.log('Failed forecasts:');
  failed.forEach(f => console.log(`  - ${f.kpi_name}: ${f.error}`));
}

// Process successful forecasts
successful.forEach(forecast => {
  saveToDatabase(forecast);
});
```

### Batch Dashboard Generation

```typescript
async function generateDashboard(kpiList: string[]) {
  const result = await batchIntelligentForecastTool.execute({
    context: {
      kpi_names: kpiList,
      forecast_horizon: 30,
      parallel: true,
    },
  });

  const dashboard = {
    generated_at: new Date(),
    total_kpis: result.total_kpis,
    successful: result.successful_forecasts,
    execution_time: result.total_time_ms,
    kpi_forecasts: result.forecasts
      .filter(f => f.success)
      .map(f => ({
        name: f.kpi_name,
        current: f.current_value,
        model: f.model_used,
        predictions: f.predictions,
        summary: f.summary,
      })),
  };

  return dashboard;
}
```

---

## 📈 Performance Benchmarks

### Parallel Mode
- 1 KPI: ~15-20 seconds
- 2 KPIs: ~30-40 seconds
- 3 KPIs: ~35-50 seconds
- 5 KPIs: ~45-60 seconds

### Sequential Mode
- Per KPI: ~15-20 seconds
- 3 KPIs: ~45-60 seconds
- 5 KPIs: ~75-100 seconds

*Times vary based on data size, model complexity, and system load*

---

## ❓ FAQ

**Q: Can I forecast more than 10 KPIs at once?**
A: Yes! Use `parallel: false` for stability with large batches.

**Q: What happens if a KPI forecast fails?**
A: The batch continues. Failed KPIs appear in results with error details.

**Q: Can I mix different forecast horizons?**
A: Currently all KPIs use the same horizon. Request individual forecasts for different horizons.

**Q: What if a KPI doesn't exist?**
A: It will fail with an error in the results. Other KPIs will still be forecasted.

**Q: Can I get raw predictions only (no summaries)?**
A: Currently summaries are always included. Create a custom tool if you need raw data only.

**Q: How accurate are batch forecasts vs single forecasts?**
A: Identical. Batch just forecasts them together, not differently.

---

## 🚀 Next Steps

1. **Try the demo:**
   ```bash
   npm run batch-forecast
   ```

2. **Use in your agent:**
   ```bash
   npm run dev
   ```
   Then ask: "Forecast Active Product Count and Total Dealer Count"

3. **Integrate into workflows:**
   Create a custom script that calls `batchIntelligentForecastTool`

4. **Generate reports:**
   Use batch forecasting in scheduled tasks for daily/weekly reports

---

## 📞 Support

For issues or questions:
1. Check [ERROR_RESOLUTION.md](ERROR_RESOLUTION.md)
2. Run `npm run verify` to check configuration
3. Review [QUICK_START.md](QUICK_START.md) for basics
