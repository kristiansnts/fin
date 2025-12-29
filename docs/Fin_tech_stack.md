# Fin Technical Stack: Next.js + Neon + LangGraph

## 1. Database Persistence (Neon)
We use Neon (Postgres) to store LangGraph "checkpoints." This is what allows Fin to remember conversation context across multiple WhatsApp messages.

- **Checkpointer:** `@langchain/langgraph-checkpoint-postgres`
- **Driver:** `@neondatabase/serverless` (using the connection pooler string)

## 2. API Architecture (Next.js App Router)
- **Endpoint:** `/api/webhook/waha` (Route Handler)
- **Role:** 1. Receive POST from WAHA.
  2. Extract `chatId` (used as `thread_id` for persistence).
  3. Invoke the LangGraph.
  4. Send the result back to WAHA via `fetch`.

## 3. Environment Variables
- `DATABASE_URL`: Neon connection string.
- `WAHA_URL`: URL of your WAHA instance (e.g., http://localhost:3000).
- `GOOGLE_CALENDAR_CLIENT_ID/SECRET`: For Calendar CRUD.
- `OPENAI_API_KEY`: The brain.