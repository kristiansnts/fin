
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { z } from "zod";
import { createCalendarTools } from "@/lib/google/calendar";
import { habitTools } from "@/lib/habits";
import { postgresTools } from "@/lib/postgres";
import { preferenceTools } from "@/lib/preferences";
import { searchTools } from "@/lib/search";
import { messageLogTools } from "@/lib/message-logs/tools";
import { createAuthDeepLink } from "@/lib/google/oauth";
import { tool } from "@langchain/core/tools";

// --- State Definition ---
export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    next: Annotation<string>({
        reducer: (x, y) => y ?? x ?? END,
        default: () => END,
    }),
});

// --- Model Setup ---
const getModel = () => new ChatOpenAI({
    model: "nvidia/nemotron-3-nano-30b-a3b:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    temperature: 0.7,
});

// --- Node: Supervisor (Router) ---
const supervisorPrompt = `You are Fin, the "Supervisor" of a personal agent system. 
Your goal is to route the user's message to the correct worker agent based on their intent.

Available Workers:
1. **Organizer**: Handles scheduling, calendar, habits, and productivity tasks.
2. **Listener**: Handles emotional support, chatting, analysis, journaling, and general queries.

Logic:
- If the user talks about time, schedule, calendar, habits, tasks, or "remind me" -> Route to **Organizer**.
- If the user wants to chat, vent, ask for analysis, or general knowledge -> Route to **Listener**.
- If unclear, default to **Listener**.

Output EXACTLY one of: "Organizer", "Listener".`;

async function supervisorNode(state: typeof AgentState.State) {
    const model = getModel();
    // A simple classification chain
    const response = await model.invoke([
        new SystemMessage(supervisorPrompt),
        ...state.messages,
    ]);

    const content = response.content as string;
    let next = "Listener"; // Default
    if (content.toLowerCase().includes("organizer")) next = "Organizer";
    if (content.toLowerCase().includes("listener")) next = "Listener";

    return { next };
}

// --- Node: Organizer ---
async function organizerNode(state: typeof AgentState.State, config: any) {
    const model = getModel();
    const whatsappId = config.configurable?.thread_id?.replace('wa_', '') || 'unknown';

    // Tools specific to Organizer
    const calendarTools = await createCalendarTools(whatsappId);
    const getAuthLinkTool = tool(
        async () => {
            const link = await createAuthDeepLink(whatsappId);
            return `Please connect your Google account: ${link}`;
        },
        {
            name: "get_google_auth_link",
            description: "Generate a Google OAuth link.",
            schema: z.object({}),
        }
    );

    const tools = [
        ...calendarTools,
        ...habitTools,
        getAuthLinkTool
    ];

    const modelWithTools = model.bindTools(tools);

    const systemPrompt = `You are Fin (Organizer Mode).
    Focus: Scheduling, Habits, Productivity.
    Tools: Calendar, Habits.
    Style: Efficient, "Bro/Bestie", Helpful.
    
    If you need to create an event or habit, DO IT.
    If the user has not connected Google Calendar and you need it, call 'get_google_auth_link'.
    Using 'checkpointer' logic: If you perform an action, Confirm it.`;

    const response = await modelWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages
    ]);

    return { messages: [response] };
}

// --- Node: Listener ---
async function listenerNode(state: typeof AgentState.State) {
    const model = getModel();

    // Tools specific to Listener (ReadOnly DB, Search, Memory)
    const tools = [
        ...searchTools,
        ...postgresTools, // Listener can query DB for context
        ...messageLogTools,
        ...preferenceTools
    ];

    const modelWithTools = model.bindTools(tools);

    const systemPrompt = `You are Fin (Listener Mode).
    Focus: Emotional Support, Reality Decoding, General Chat.
    Tools: Web Search, DB Query (read-only), Memory.
    Style: Empathetic, Sarkas/Funny (if appropriate), "Bro/Bestie".
    
    If the user is venting, listen and validate.
    If the user asks a question, use Search or DB.
    NO HALLUCINATIONS. Check 'messageLogTools' if you need past context.`;

    const response = await modelWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages
    ]);

    return { messages: [response] };
}


// --- Graph Construction ---

export function createFinGraph() {
    const workflow = new StateGraph(AgentState)
        .addNode("Supervisor", supervisorNode)
        .addNode("Organizer", organizerNode)
        .addNode("Listener", listenerNode)
        .addEdge(START, "Supervisor")
        .addConditionalEdges(
            "Supervisor",
            (state) => state.next,
            {
                Organizer: "Organizer",
                Listener: "Listener"
            }
        )
        .addEdge("Organizer", END)
        .addEdge("Listener", END);

    return workflow;
}
