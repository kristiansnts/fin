# Implementation Steps for Antigravity Agent

## Step 1: Database Initialization
Create a migration or script to initialize the LangGraph checkpoint tables in Neon.
- Use `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres`.
- Run `await saver.setup()` to create the internal schema.

## Step 2: Calendar Tool (CRUD)
Implement the `manage_calendar` tool using `googleapis`.
- **Constraint:** Ensure the tool returns a string that the "Sanity Agent" can interpret (e.g., "Conflict detected: You have 2 meetings at 3 PM").

## Step 3: The Next.js Route Handler
Implement `app/api/webhook/waha/route.ts`:
1. **Deduplication:** Use Neon to check if `message.id` has been processed.
2. **Persistence Config:** ```typescript
   const config = { configurable: { thread_id: payload.from } };
3. **Graph Invocation:** Call graph.invoke({ messages: [new HumanMessage(payload.body)] }, config).

### Step 4: Persona System Prompts
Include the three personas (Supervisor, Organizer, Listener) defined in the architecture doc.

### Step 5: WAHA Integration
Use WAHA's presence API to send "composing" (typing) status before the graph starts processing.

Use WAHA's sendText to deliver the final AI output.