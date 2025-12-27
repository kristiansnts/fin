import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { AIMessage } from "@langchain/core/messages";

const DB_URI = process.env.DATABASE_URL;
if (!DB_URI) {
    throw new Error("Missing DATABASE_URL");
}

const checkpointer = PostgresSaver.fromConnString(DB_URI);
let isCheckpointerSetup = false;

export async function injectAgentMemory(whatsappId: string, messageText: string) {
    if (!isCheckpointerSetup) {
        await checkpointer.setup();
        isCheckpointerSetup = true;
    }

    const config = { configurable: { thread_id: `wa_${whatsappId}` } };

    // We need to inject the message as if the AI said it.
    // In LangGraph, we can't easily "inject" into the middle of a flow without retrieving state.
    // But we can update the state.

    const currentState = await checkpointer.get(config);

    // If no state exists, we can't really "append" easily without initializing.
    // However, saving a new checkpoint with the appended message is the way.

    // Simplified: Just log it for now? 
    // LangGraph's `checkpointer.put` expects a full state object.

    // AUTOMATED FIX: The easiest way to "sync" cron messages to Agent memory 
    // is to treat the cron message as an AI Message and save it to the thread.

    // NOTE: Direct manipulation of LangGraph state is tricky. 
    // A safer alternative is to have a "Shadow Agent" invocation that just returns the text 
    // but that costs tokens.

    // Ideal: Use `checkpointer.put` to add an AIMessage to the message history.
    // But we need the correct structure.

    // For now, let's assume we can't easily hack LangGraph state from outside without risky code.
    // Instead, we will rely on a "Last Interaction" Log in the database.
}

// Alternative: Save to a simple DB table "AgentMemory" and have the Agent always read the last 5 rows?
// PostgresTools already does this! 
// Let's just create a `MessageLog` entry. 
// The Agent prompts says "JANGAN HALUSINASI". 
// If we log the Cron message to the `MessageLog` table in DB, the Agent can query it!
