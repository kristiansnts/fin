import { tool } from "langchain";
import { z } from "zod";

/**
 * Tool to search the web for information
 * This is a placeholder - you'll need to integrate with a real search API like:
 * - Tavily (https://tavily.com)
 * - Google Custom Search
 * - Serper API
 */
export const webSearchTool = tool(
    async ({ query }) => {
        try {
            // TODO: Integrate with actual search API
            // For now, return a placeholder message
            return `Web search functionality not yet implemented. Query was: "${query}". Please integrate with Tavily, Google Custom Search, or Serper API.`;
        } catch (error: any) {
            return `Error searching web: ${error.message}`;
        }
    },
    {
        name: "search_web",
        description: "Search the web for current information, news, or facts. Use this for the Reality Decoder to verify claims or get context about announcements, policies, or viral news.",
        schema: z.object({
            query: z.string().describe("The search query"),
        }),
    }
);

/**
 * Tool to analyze text for bullshit/manipulation
 * This uses the LLM's reasoning to detect vague or manipulative language
 */
export const analyzeBullshitTool = tool(
    async ({ text }) => {
        try {
            // This is a meta-tool that instructs the agent to analyze
            // The actual analysis happens in the agent's reasoning
            return `Analyzing text for manipulation patterns. Text to analyze: "${text}". 
            
Please provide:
1. What it actually means (plain language)
2. Who benefits from this framing
3. Likely outcomes
4. Red flags or manipulation tactics used
5. The lazy-smart path (minimum effort response)`;
        } catch (error: any) {
            return `Error analyzing text: ${error.message}`;
        }
    },
    {
        name: "analyze_bullshit",
        description: "Analyze text (announcements, policies, news) for vague, manipulative, or confusing language. Use this for Solution 3 (Reality Decoder).",
        schema: z.object({
            text: z.string().describe("The text to analyze for bullshit"),
        }),
    }
);

/**
 * Export all search/analysis tools
 */
export const searchTools = [
    webSearchTool,
    analyzeBullshitTool,
];
