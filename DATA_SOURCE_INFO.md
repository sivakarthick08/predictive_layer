# Data Source Configuration & Status

## Current Setup

### Environment Configuration
- **Environment Variable**: `DATA_FILE`
- **Current Path**: `C:\Users\dhamo\OneDrive\Desktop\Deepspot\predictive_layer\data.json`
- **Status**: ✅ **CONFIGURED AND ACCESSIBLE**

### Data File Details
- **File Path**: `data.json` (located in project root)
- **File Format**: JSON with `{ "data": [...] }` structure
- **Total Records**: 69 KPI data points
- **File Size**: ~10 KB

### Available KPIs
| KPI Name | Data Points | Last Value | Last Date |
|----------|------------|-----------|-----------|
| Total Dealer Count | 6 | 15,644 | 2025-12-17 |
| Active Product Count | 63 | 7,229 | 2025-12-17 |

### Data Record Format
Each record in the data file contains:
```json
{
  "kpi_name": "Active Product Count",
  "kpi_value": 7229,
  "executed_at": "2025-12-17T11:30:00.000Z",
  "frequency": "daily"
}
```

**Required Fields:**
- `kpi_name` (string): The KPI identifier
- `kpi_value` (number): The metric value
- `executed_at` (string): ISO 8601 timestamp
- `frequency` (string): 'daily', 'weekly', 'monthly', or 'yearly'

---

## Forecasting Configuration

### Available Models (in order of use)
1. **Prophet** (Primary)
   - Requires: ≥10 historical data points
   - Best for: Business metrics with seasonality
   - Status for "Active Product Count": ✅ Can use (63 points)
   - Status for "Total Dealer Count": ❌ Insufficient (6 points)

2. **LSTM** (Secondary Fallback)
   - Requires: ≥25 historical data points
   - Best for: Complex patterns
   - Status for "Active Product Count": ✅ Can use (63 points)
   - Status for "Total Dealer Count": ❌ Insufficient (6 points)

3. **Adaptive ML** (Tertiary Fallback)
   - Requires: ≥5 historical data points
   - Best for: Guaranteed forecast with LLM-powered model selection
   - Status for "Active Product Count": ✅ Can use (63 points)
   - Status for "Total Dealer Count": ✅ Can use (6 points)

---

## External Dependencies

### API Keys Configuration
| Service | API Key | Status | Notes |
|---------|---------|--------|-------|
| OpenAI | `OPENAI_API_KEY` | ✅ Set | Required for LLM-powered analysis |
| E2B | `E2B_API_KEY` | ✅ Set | Required for Python code execution |

### Environment File Location
- **Path**: `.env`
- **Contains**: `DATA_FILE`, `OPENAI_API_KEY`, `E2B_API_KEY`, `PORT`

---

## How to Use the Agent

### 1. List All Available KPIs
```bash
npm run interactive-forecast
```
Then select "list KPIs" option.

### 2. Forecast a Specific KPI
```bash
npm run interactive-forecast
```
Then select "forecast" and choose from:
- **Active Product Count** (recommended - has 63 data points)
- **Total Dealer Count** (limited - only 6 data points)

### 3. Specify Forecast Horizon
- Input the number of days/weeks/months to forecast
- Recommended: 7-30 days

---

## Troubleshooting

### "No data available" Error
**Cause**: Data file not found or empty
**Solution**:
1. Verify `DATA_FILE` path in `.env`
2. Ensure `data.json` contains valid records
3. Check file permissions

### "E2B execution failed" Error
**Cause**: Connection issues with E2B service
**Solution**:
1. Verify `E2B_API_KEY` is valid at https://e2b.dev
2. Check internet connection
3. The system will automatically fall back to simpler models

### "Insufficient data points" Error
**Cause**: KPI has too few historical records
**Solution**:
1. For "Total Dealer Count": Consider adding more historical data
2. Or use "Active Product Count" which has plenty of data
3. Adaptive ML will still work with as few as 5 points

---

## Next Steps

1. **Test Data Loading**:
   ```bash
   npm run test
   ```

2. **Run Interactive Forecasting**:
   ```bash
   npm run interactive-forecast
   ```

3. **Start the Agent Server**:
   ```bash
   npm run dev
   ```

---

## File Locations Summary

```
project-root/
├── .env                    # Configuration file (API keys, data source)
├── data.json              # Your KPI historical data (69 records)
├── src/
│   ├── config/
│   │   └── data-config.ts # Data loading logic
│   ├── tools/
│   │   ├── e2b-client.ts  # E2B API integration
│   │   ├── list-kpis.ts   # List available KPIs
│   │   └── advanced-forecasting-models.ts # Forecast models
│   └── agents/
│       └── predictive-agent.ts # Main agent
└── package.json
```

---

**Last Updated**: December 24, 2025
**Status**: ✅ All systems operational with valid data configuration
