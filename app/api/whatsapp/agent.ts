import { HumanMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createFinGraph } from "@/lib/agent/graph";

const DB_URI = process.env.DATABASE_URL!;
if (!DB_URI) throw new Error("Missing DATABASE_URL");

const checkpointer = PostgresSaver.fromConnString(DB_URI);
let isCheckpointerSetup = false;

/**
 * Process a WhatsApp message using a LangGraph agent.
 */
export async function processWhatsAppWithAgent(whatsappId: string, messageText: string) {
    try {
        console.log(`[Agent] Processing for ${whatsappId}: ${messageText}`);

        // Lazy setup for checkpointer tables
        if (!isCheckpointerSetup) {
            console.log("[Agent] Setting up checkpointer...");
            await checkpointer.setup();
            isCheckpointerSetup = true;
        }

        const graph = createFinGraph();

        // Compile the graph with persistence
        const app = graph.compile({ checkpointer });

        const config = { configurable: { thread_id: `wa_${whatsappId}` } };

        console.log(`[Agent] Invoking graph for thread ${whatsappId}...`);

        const result = await app.invoke(
            { messages: [new HumanMessage(messageText)] },
            config
        );

        // LangGraph returns the final state. We extract the last message content.
        const messages = result.messages;
        const lastMessage = messages[messages.length - 1];

        let content = "";
        if (typeof lastMessage.content === "string") {
            content = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
            // detailed content blocks
            content = lastMessage.content.map((c: any) => c.text || JSON.stringify(c)).join(" ");
        }

        console.log(`[Agent] Success! Response: ${content.substring(0, 50)}...`);
        return content;
    } catch (error: any) {
        console.error("[Agent Error]:", error);
        return `Aduh bro, sorry banget sistem error: ${error.message}`;
    }
}
