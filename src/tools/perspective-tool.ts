/**
 * Perspective Tool
 *
 * Generates a concise, business-friendly "perspection" (narrative + recommendations)
 * from predictive model output. Uses an LLM to convert numeric forecasts into
 * prioritized actions, confidence assessments, and an executive summary.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const PredictionSchema = z.object({
  date: z.string(),
  forecast_value: z.number(),
  confidence: z.number().optional(),
});

export const perspectiveTool = createTool({
  id: 'perspective-tool',
  description: 'Generate a business-facing perspection (summary + prioritized recommendations) from predictive output',
  inputSchema: z.object({
    success: z.boolean(),
    kpi_name: z.string(),
    forecast_count: z.number().optional(),
    forecast_data: z.array(PredictionSchema).optional(),
    metadata: z.object({
      model_used: z.string().optional(),
      historical_points: z.number().optional(),
      last_historical_value: z.number().optional(),
      last_historical_date: z.string().optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    recommended_actions: z.array(z.object({ 
      action: z.string(), 
      horizon: z.string() 
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (!context || !context.success) {
        return { success: false, error: 'Input indicates predictive step failed or context missing' };
      }

      const { kpi_name, forecast_data = [], metadata = {} } = context;

      const summaryLines = [];
      summaryLines.push(`KPI: ${kpi_name}`);
      if (metadata.last_historical_value !== undefined) {
        summaryLines.push(`Current value: ${metadata.last_historical_value}`);
      }
      if (forecast_data.length) {
        summaryLines.push(`Forecast horizon: ${forecast_data.length} periods`);
      }
      if (metadata.model_used) {
        summaryLines.push(`Model: ${metadata.model_used}`);
      }
      if (metadata.historical_points) {
        summaryLines.push(`Historical data points: ${metadata.historical_points}`);
      }

      const prompt = `You are an expert business analyst. Given the following predictive output, produce a JSON object only (no extra text) with the fields:
- summary: A detailed 4-5 line business-friendly summary explaining the forecast trends, key metrics, growth patterns, and strategic business implications (50-70 words). Focus on what the numbers mean for the business.
- highlights: An array of EXACTLY 3-4 bullet points about the forecast. Each point must be 1-2 lines maximum (10-20 words each)
- recommended_actions: An array of 3-4 strategic action recommendations. Each recommendation must contain 2-3 complete sentences (25-40 words total) explaining the action, its rationale, and expected impact. Include horizon (Immediate/Short-term/Medium-term/Long-term)

Input data (do not invent numbers beyond this input):
${summaryLines.join('\n')}

Predictions (first 5 shown):
${forecast_data.slice(0, 5).map(p => `- ${p.date}: ${p.forecast_value} (confidence: ${p.confidence ?? 'N/A'})`).join('\n')}

STRICT REQUIREMENTS:
- summary: 4-5 lines, 50-70 words total. Must explain: (1) what the forecast shows, (2) the trend direction and magnitude, (3) business impact, (4) strategic considerations
- highlights: EXACTLY 3-4 points, each 10-20 words (1-2 lines max)
- recommended_actions: 3-4 actions, each containing 2-3 complete business-friendly sentences totaling 25-40 words. Explain WHAT to do, WHY it matters, and the expected BENEFIT. Include only "action" (full description) and "horizon"
- Be professional, strategic, and business-focused
- NO priority field in recommended_actions

Respond with only valid JSON. Example schema:
{
  "summary": "The forecast reveals a consistent upward trajectory with the KPI projected to grow by X% over the forecast period, rising from current value to predicted peak. This growth signals expanding market opportunities and increasing demand for our offerings. The trend suggests strong business momentum that could translate into revenue gains. Strategic resource allocation will be critical to capitalize on this positive outlook while managing operational capacity.",
  "highlights": ["Consistent upward trend with 5% average growth", "Strong confidence levels above 85%", "Peak demand expected mid-period"],
  "recommended_actions": [
    {"action":"Enhance inventory management systems to support the projected growth trajectory and prevent potential stockouts. This will ensure we maintain service levels during increased demand periods. Implementing automated reordering systems will optimize stock levels and reduce carrying costs.","horizon":"Immediate"},
    {"action":"Allocate additional resources for production scaling to meet the anticipated demand increase. Expanding capacity now will position us to capture market opportunities. This investment will generate positive ROI through increased sales and market share.","horizon":"Short-term"},
    {"action":"Develop strategic partnerships with key suppliers to ensure reliable supply chain operations. This collaboration will mitigate risks and improve responsiveness. Strong supplier relationships are essential for sustained growth.","horizon":"Medium-term"}
  ]
}`;

      const response = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.2,
        maxTokens: 600,
      } as any);

      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'Failed to parse LLM response as JSON' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        summary: parsed.summary,
        highlights: parsed.highlights,
        recommended_actions: parsed.recommended_actions,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  },
});

export default perspectiveTool;
