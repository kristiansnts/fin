
import * as dotenv from "dotenv";
dotenv.config();

import { createFinGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

async function main() {
    console.log("🚀 Testing LangGraph Routing...");

    // We don't strictly need persistence for this routing test, but graph requires it if compiled with it.
    // However, createFinGraph returns the graph definition.
    const graph = createFinGraph();

    // Compile WITHOUT checkpointer for simple in-memory test (if possible) 
    // OR we can mock it.
    // Actually, let's just use the graph structure to test the Supervisor Node directly?
    // Or simpler: Compile it and run.

    const app = graph.compile(); // No checkpointer = in-memory checkpointer

    console.log("\n🧪 Test 1: Scheduling Intent");
    let result = await app.invoke({ messages: [new HumanMessage("Schedule a meeting with Boss tomorrow at 10am")] });
    // We expect the Supervisor to have routed to Organizer.
    // We can check the node trace if possible, or just the final output.
    // Since we can't easily inspect the path in simple invoke without listener, 
    // we can check if the response comes from Organizer (which has tools).
    let lastMsg = result.messages[result.messages.length - 1];
    console.log("Response:", lastMsg.content.toString().substring(0, 100) + "...");

    console.log("\n🧪 Test 2: Emotional Support Intent");
    result = await app.invoke({ messages: [new HumanMessage("I feel overwhelmed today.")] });
    lastMsg = result.messages[result.messages.length - 1];
    console.log("Response:", lastMsg.content.toString().substring(0, 100) + "...");
}

main().catch(console.error);
