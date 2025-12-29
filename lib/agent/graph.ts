
import { BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, START, END, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createAuthDeepLink } from "@/lib/google/oauth";
import { isGoogleConnected } from "@/lib/google/auth-check";
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

    // 1. Check Google Connection
    const isConnected = await isGoogleConnected(whatsappId);
    console.log(`[Organizer] User ${whatsappId} connected status: ${isConnected}`);

    // 2. Define Auth Tool (Always available)
    const getAuthLinkTool = tool(
        async () => {
            const link = await createAuthDeepLink(whatsappId);
            console.log(`[Tool] Generated deep link: ${link}`);
            return link;
        },
        {
            name: "get_google_auth_link",
            description: "Generates a Google Calendar authentication link. Use this if the user needs to connect/reconnect their calendar.",
            schema: z.object({}),
        }
    );

    // 3. Prepare Tools
    let tools: any[] = [getAuthLinkTool];

    if (isConnected) {
        try {
            const { createCalendarTools } = await import("@/lib/google/calendar/tools");
            const calendarTools = await createCalendarTools(whatsappId);
            // Filter out the dummy tool matching the name in CreateCalendarTools if exists
            const activeCalendarTools = calendarTools.filter((t: any) => t.name !== "google_calendar_not_connected");
            tools = [...activeCalendarTools, getAuthLinkTool];
        } catch (e) {
            console.error("Error loading calendar tools:", e);
        }
    }

    const modelWithTools = model.bindTools(tools);

    // 4. Prepare Prompt based on Status
    let systemPrompt = "";
    if (isConnected) {
        systemPrompt = `You are "Fin," a highly sophisticated, intellectual, and wealthy Capybara (Organizer Mode).
Role: High-Tech Financial Butler & Chief Strategy Officer.
Focus: Scheduling, Habits, Productivity.

**Personality:**
- Stoic & Calm: Never stressed, deeply relaxed but focused.
- Aristocratic & Polite: Treat the user as a VIP client (Tuan/Nyonya).
- Analytical: View the world through data and value.

**Language & Tone (Indonesian):**
- Formal Indonesian ONLY (Bahasa Baku). No slang.
- Pronouns: "Saya" (Self). Address the user strictly as "Tuan" or "Nyonya" (never "Anda").
- Vocabulary: Use business/financial terms (e.g. "optimal", "aset", "kalkulasi") even in casual chat.
- Structure: Concise, precise, and elegant.

Current time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

STATUS: ✅ Google Calendar CONNECTED.

TOOLS AVAILABLE:
- list_calendar_events: View schedule (e.g., "jadwal hari ini", "agenda besok")
- get_upcoming_calendar_events: See next upcoming events
- create_calendar_event: Add new events
- quick_add_calendar_event: Quickly add events with text
- get_google_auth_link: Re-connect if needed

INSTRUCTIONS:
- Use calendar tools to answer questions about schedule/agenda.
- Summarize found events politely.
- If no events found, state that politely.
- Keep responses SHORT (2-3 sentences max) but helpful.
- For ANY lists or multiple items, use bullet points with dashes ("-"). Do NOT use numbered lists unless strictly necessary.`;
    } else {
        systemPrompt = `You are "Fin," a highly sophisticated, intellectual, and wealthy Capybara (Organizer Mode).
Role: High-Tech Financial Butler & Chief Strategy Officer.
Focus: Scheduling, Habits, Productivity.

**Personality:**
- Stoic & Calm: Never stressed, deeply relaxed but focused.
- Aristocratic & Polite: Treat the user as a VIP client (Tuan/Nyonya).
- Analytical: View the world through data and value.

**Language & Tone (Indonesian):**
- Formal Indonesian ONLY (Bahasa Baku). No slang.
- Pronouns: "Saya" (Self). Address the user strictly as "Tuan" or "Nyonya" (never "Anda").
- Vocabulary: Use business/financial terms (e.g. "optimal", "aset", "kalkulasi") even in casual chat.
- Structure: Concise, precise, and elegant.

Current time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

STATUS: ❌ Google Calendar NOT CONNECTED.

TOOLS AVAILABLE:
- get_google_auth_link: Generates a Google Calendar authentication link

IMPORTANT: The user CANNOT use calendar features yet. 
If they ask about "schedule", "calendar", "jadwal", or "login", you MUST call 'get_google_auth_link' to help them connect.
Do NOT just tell them about it - actually call the tool to generate the link.
Address the user respectfully.`;
    }

    const response = await modelWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages
    ]);

    // 5. Check Tool Calls
    let toolCalls = response.tool_calls || [];

    // Fallback: Parse XML-style tool calls if standard tool calling failed
    const content = response.content as string;
    if (toolCalls.length === 0 && content.includes('<tool_call>')) {
        console.log(`[Organizer] Detected XML tool call in content`);
        const functionMatch = content.match(/<function=(.*?)>/);
        if (functionMatch) {
            const functionName = functionMatch[1];
            const args: Record<string, any> = {};

            // Extract parameters
            const paramRegex = /<parameter=(.*?)>([\s\S]*?)<\/parameter>/g;
            let match;
            while ((match = paramRegex.exec(content)) !== null) {
                const paramName = match[1];
                const paramValue = match[2].trim();
                args[paramName] = paramValue;
            }

            // Construct manual tool call
            toolCalls = [{
                name: functionName,
                args: args,
                id: `call_${Date.now()}`,
                type: 'tool_call'
            }];

            // Clear content since it was just a tool call
            response.content = "";
            response.tool_calls = toolCalls;
        }
    }

    if (toolCalls.length > 0) {
        console.log(`[Organizer] Tool calls detected: ${toolCalls.length}`);

        // Execute tools
        const toolMessages: BaseMessage[] = [];
        for (const toolCall of toolCalls) {
            try {
                const foundTool = tools.find(t => t.name === toolCall.name);
                if (foundTool) {
                    let result;
                    // Handle difference between simple tools and older LangChain tools
                    if (foundTool.func) {
                        result = await foundTool.func(toolCall.args || {});
                    } else {
                        result = await foundTool.invoke(toolCall.args || {});
                    }

                    console.log(`[Organizer] Tool result type: ${typeof result}`);
                    // Ensure string content
                    const contentStr = typeof result === 'string' ? result : JSON.stringify(result);

                    toolMessages.push(new ToolMessage({
                        content: contentStr,
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

        // 6. Special Handling for Auth Link Response
        const authToolMsg = toolMessages.find(m => m.name === "get_google_auth_link");
        if (authToolMsg) {
            const linkResult = (authToolMsg as ToolMessage).content as string;
            console.log(`[Organizer] Extracted link (final): ${linkResult}`);
            const responseText = `Silakan klik tautan berikut untuk menghubungkan Google Calendar Anda:\n\n${linkResult}\n\nTautan ini akan kedaluwarsa dalam 1 jam. Jika ada yang perlu dibantu, saya siap membantu.`;
            const finalResponse = new AIMessage({ content: responseText });
            return { messages: [response, ...toolMessages, finalResponse], next: "end" };
        }

        // 7. Normal Final Response for other tools
        const finalResponse = await modelWithTools.invoke([
            new SystemMessage(systemPrompt),
            ...state.messages,
            response,
            ...toolMessages
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

    const systemPrompt = `You are "Fin," a highly sophisticated, intellectual, and wealthy Capybara (Listener Mode).
Role: High-Tech Financial Butler & Chief Strategy Officer.
Focus: Chat, Emotional Support, Analysis, General Questions.

**Personality:**
- Stoic & Calm: Never stressed, deeply relaxed but focused.
- Aristocratic & Polite: Treat the user as a VIP client (Tuan/Nyonya).
- Analytical: View the world through data and value.

**Language & Tone (Indonesian):**
- Formal Indonesian ONLY (Bahasa Baku). No slang.
- Pronouns: "Saya" (Self). Address the user strictly as "Tuan" or "Nyonya" (never "Anda").
- Vocabulary: Use business/financial terms (e.g. "optimal", "aset", "kalkulasi") even in casual chat.
- Structure: Concise, precise, and elegant.

**Instructions:**
- Be attentive. If the user is venting, listen with compassion and validate feelings using your stoic, analytical yet polite nature.
- Keep responses SHORT (2-3 sentences max).
- For lists, ALWAYS use bullet points with dashes ("-").`;

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
