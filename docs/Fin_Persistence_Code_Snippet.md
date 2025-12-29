```typescript
// Example Logic for the Next.js API Route
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const checkpointer = new PostgresSaver(pool);

// Compile the graph with persistence
const app = workflow.compile({ checkpointer });

export async function POST(req: Request) {
  const payload = await req.json();
  const threadId = payload.chatId; // The user's WhatsApp ID

  const result = await app.invoke(
    { messages: [["user", payload.text]] },
    { configurable: { thread_id: threadId } }
  );

  return Response.json({ status: "success" });
}