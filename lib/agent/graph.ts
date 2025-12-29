
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, START, END, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

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
- **Organizer**: scheduling, calendar, habits, tasks, reminders
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

    const systemPrompt = `You are Fin (Organizer Mode). 
Focus: Scheduling, Habits, Productivity.
Style: Casual "bro/bestie" Indonesian (Jakarta slang). Be helpful and efficient.

Current time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

IMPORTANT: Since you don't have access to tools right now, if the user asks about:
- Calendar/scheduling: Tell them you'll help them set it up and ask for the auth link
- Habits: Acknowledge and encourage them
- General productivity: Give advice

Keep responses SHORT (2-3 sentences max).`;

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages
    ]);

    console.log(`[Organizer] Response generated`);
    return { messages: [response], next: "end" };
}

// --- Listener Node ---
async function listenerNode(state: typeof AgentState.State) {
    const model = getModel();

    const systemPrompt = `You are Fin (Listener Mode). 
Focus: Chat, Emotional Support, Analysis, General Questions.
Style: Empathetic, casual "bro/bestie" Indonesian (Jakarta slang). Be supportive and real.

Be conversational and helpful. If they're venting, listen and validate.
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
