
import { BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, START, END, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createAuthDeepLink } from "@/lib/google/oauth";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// --- State Definition ---
const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,
    next: Annotation<string>({
        reducer: (x, y) => y ?? x ?? "end",
        default: () => "end",
    }),
});

// --- Model Setup ---
const getModel = () => new ChatOpenAI({
    model: "nvidia/nemotron-3-nano-30b-a3b:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    temperature: 0.7,
});

// --- Supervisor Node ---
async function supervisorNode(state: typeof AgentState.State) {
    const model = getModel();
    const systemPrompt = `You are Fin's Supervisor. Route the user's message to the correct worker:
- **Organizer**: scheduling, calendar, habits, tasks, reminders, "connect google", "auth"
- **Listener**: chat, emotional support, analysis, general questions

Reply with ONLY "organizer" or "listener".`;

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages,
    ]);

    const content = (response.content as string).toLowerCase();
    const next = content.includes("organizer") ? "organizer" : "listener";

    console.log(`[Supervisor] Routing to: ${next}`);
    return { next };
}

// --- Organizer Node ---
async function organizerNode(state: typeof AgentState.State, config: any) {
    const model = getModel();
    const whatsappId = config.configurable?.thread_id?.replace('wa_', '') || 'unknown';

    // Create auth link tool
    const getAuthLinkTool = tool(
        async () => {
            const link = await createAuthDeepLink(whatsappId);
            return link;
        },
        {
            name: "get_google_auth_link",
            description: "Generate a Google OAuth authentication link when user needs to connect their Google Calendar. Call this if user mentions calendar, scheduling, or asks to connect Google.",
            schema: z.object({}),
        }
    );

    const tools = [getAuthLinkTool];
    const modelWithTools = model.bindTools(tools);

    const systemPrompt = `You are Fin (Organizer Mode). 
Focus: Scheduling, Habits, Productivity.
Style: Polite, calm, and gentle like a professional head maid/butler. Speak in formal Indonesian with respectful tone.

Current time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

TOOLS AVAILABLE:
- get_google_auth_link: Use this when user needs to connect Google Calendar

If user asks about calendar/scheduling and hasn't connected yet, call get_google_auth_link and share the link.
Address the user respectfully. Keep responses SHORT (2-3 sentences max).`;

    const response = await modelWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages
    ]);

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`[Organizer] Tool calls detected: ${response.tool_calls.length}`);

        // Execute tools
        const toolMessages: BaseMessage[] = [];
        for (const toolCall of response.tool_calls) {
            try {
                const foundTool = tools.find(t => t.name === toolCall.name);
                if (foundTool) {
                    const result = await foundTool.invoke(toolCall);
                    toolMessages.push(new ToolMessage({
                        content: String(result),
                        tool_call_id: toolCall.id!,
                        name: toolCall.name
                    }));
                }
            } catch (error: any) {
                toolMessages.push(new ToolMessage({
                    content: `Error: ${error.message}`,
                    tool_call_id: toolCall.id!,
                    name: toolCall.name
                }));
            }
        }

        // Get final response after tool execution
        // Extract the actual link from tool messages
        const linkResults = toolMessages
            .filter(msg => msg instanceof ToolMessage)
            .map(msg => (msg as ToolMessage).content)
            .join('\n');

        const finalSystemPrompt = `${systemPrompt}

IMPORTANT: You just received tool results. The authentication link is:
${linkResults}

Now respond to the user with this link. DO NOT say "[object ToolMessage]". 
Use the actual URL shown above. Format it nicely in your response.`;

        const finalResponse = await modelWithTools.invoke([
            new SystemMessage(finalSystemPrompt),
            ...state.messages,
        ]);

        console.log(`[Organizer] Final response generated after tool execution`);
        return { messages: [response, ...toolMessages, finalResponse], next: "end" };
    }

    console.log(`[Organizer] Direct response (no tools)`);
    return { messages: [response], next: "end" };
}

// --- Listener Node ---
async function listenerNode(state: typeof AgentState.State) {
    const model = getModel();

    const systemPrompt = `You are Fin (Listener Mode). 
Focus: Chat, Emotional Support, Analysis, General Questions.
Style: Empathetic, calm, and gentle like a caring head maid/butler. Speak in formal Indonesian with warm, respectful tone.

Be attentive and understanding. If they're venting, listen with compassion and validate their feelings.
Keep responses SHORT (2-3 sentences max).`;

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages
    ]);

    console.log(`[Listener] Response generated`);
    return { messages: [response], next: "end" };
}

// --- Graph Construction ---
export function createFinGraph() {
    const workflow = new StateGraph(AgentState)
        .addNode("supervisor", supervisorNode)
        .addNode("organizer", organizerNode)
        .addNode("listener", listenerNode)
        .addEdge(START, "supervisor")
        .addConditionalEdges(
            "supervisor",
            (state) => state.next,
            {
                organizer: "organizer",
                listener: "listener"
            }
        )
        .addEdge("organizer", END)
        .addEdge("listener", END);

    return workflow;
}

