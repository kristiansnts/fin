
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
    // Deterministic routing based on keywords
    const lastMessage = state.messages[state.messages.length - 1];
    const messageText = (lastMessage.content as string).toLowerCase();

    const organizerKeywords = ['calendar', 'kalender', 'schedule', 'jadwal', 'habit', 'kebiasaan',
        'google', 'login', 'link', 'auth', 'connect', 'hubungkan',
        'task', 'tugas', 'remind', 'ingatkan'];

    const isOrganizerTask = organizerKeywords.some(keyword => messageText.includes(keyword));
    const next = isOrganizerTask ? "organizer" : "listener";

    console.log(`[Supervisor] Message: "${messageText.substring(0, 50)}..."`);
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
            console.log(`[Tool] Generated deep link: ${link}`);
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
- get_google_auth_link: Generates a Google Calendar authentication link

IMPORTANT: If the user asks for a "link", "login", or mentions "Google Calendar", you MUST call the get_google_auth_link tool.
Do NOT just tell them about it - actually call the tool to generate the link.
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
                    // Call the tool function directly with the args
                    const result = await foundTool.func({} as any);
                    console.log(`[Organizer] Tool result type: ${typeof result}, value: ${result}`);
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
        console.log(`[Organizer] Tool messages count: ${toolMessages.length}`);
        console.log(`[Organizer] First tool message type: ${toolMessages[0]?.constructor.name}`);
        console.log(`[Organizer] First tool message content type: ${typeof toolMessages[0]?.content}`);

        console.log(`[Organizer] First tool message content:`, toolMessages[0]?.content);
        console.log(`[Organizer] First tool message content stringified:`, JSON.stringify(toolMessages[0]?.content));

        const linkResults = toolMessages
            .filter(msg => msg instanceof ToolMessage)
            .map(msg => {
                const content = (msg as ToolMessage).content;
                console.log(`[Organizer] Processing content, type: ${typeof content}, value:`, content);
                // Handle if content is an object or string
                return typeof content === 'string' ? content : JSON.stringify(content);
            })
            .join('\n');

        console.log(`[Organizer] Extracted link (final): ${linkResults}`);

        // Create a direct response with the link instead of asking LLM to format it
        const responseText = `Silakan klik tautan berikut untuk menghubungkan Google Calendar Anda:\n\n${linkResults}\n\nTautan ini akan kedaluwarsa dalam 1 jam. Jika ada yang perlu dibantu, saya siap membantu.`;

        const finalResponse = new AIMessage({
            content: responseText
        });

        console.log(`[Organizer] Final response: ${responseText.substring(0, 100)}...`);
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

