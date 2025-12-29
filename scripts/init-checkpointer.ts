
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL is not set in environment variables.");
        process.exit(1);
    }

    console.log("🔌 Connecting to Neon database...");
    const pool = new Pool({ connectionString: databaseUrl });
    const checkpointer = new PostgresSaver(pool);

    try {
        console.log("🛠️  Setting up LangGraph checkpoint tables...");
        await checkpointer.setup();
        console.log("✅ Checkpoint tables created/verified successfully.");
    } catch (error) {
        console.error("❌ Failed to setup checkpoint tables:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
