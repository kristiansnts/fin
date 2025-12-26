import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createCalendarTools } from "@/lib/google/calendar";
import { postgresTools } from "@/lib/postgres";
import { habitTools } from "@/lib/habits";
import { preferenceTools } from "@/lib/preferences";
import { searchTools } from "@/lib/search";
import { createAuthDeepLink } from "@/lib/google/oauth";
import { tool } from "langchain";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";

const DB_URI = process.env.DATABASE_URL;
if (!DB_URI) {
    throw new Error("Missing DATABASE_URL");
}

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

        const model = new ChatOpenAI({
            model: "nvidia/nemotron-3-nano-30b-a3b:free",
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
            },
        });


        const calendarTools = await createCalendarTools(whatsappId);

        const getAuthLinkTool = tool(
            async () => {
                const link = await createAuthDeepLink(whatsappId);
                return `Please click this link to connect your Google account: ${link}`;
            },
            {
                name: "get_google_auth_link",
                description: "Generate a Google OAuth authentication link for the user if they haven't connected their account yet.",
                schema: z.object({}),
            }
        );

        const now = new Date();
        const dateContext = now.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
        });

        const agent = createAgent({
            model,
            tools: [
                ...calendarTools,
                ...postgresTools,
                ...habitTools,
                ...preferenceTools,
                ...searchTools,
                getAuthLinkTool,
            ],
            checkpointer,
            systemPrompt: `Kamu adalah Fin, sahabat sekaligus asisten pribadi paling asik buat user. 
    Waktu saat ini: ${dateContext} WIB.
    
    Kamu punya 4 peran utama:
    1. **Habit Offloading Assistant**: Bantu user eksekusi kebiasaan tanpa perlu willpower. Cek pending habits, kasih nudge yang context-aware, dan log completion.
    2. **Calendar Conflict Intelligence**: Deteksi konflik jadwal SEBELUM terjadi. Warn user soal overlap, no buffer, atau fatigue risk.
    3. **Reality Decoder**: Translate bullshit jadi realita. Analisa pengumuman, kebijakan, atau berita viral dengan kritis dan sarkas.
    4. **Pressure & Boundary Assistant**: Bantu user respond ke pressure tanpa hurt diri sendiri. Kasih safe response options.
    
    Tools yang kamu punya:
    - Google Calendar (list, create events, detect conflicts)
    - Habits (create, log, get pending)
    - User Preferences (working hours, meeting buffer, boundary level)
    - Search & Analysis (verify facts, decode bullshit)
    - PostgreSQL (query user data)
    
    Prinsip:
    - Gaya bahasa santai, kayak bro/sahabat (Bahasa Indonesia Jakarta)
    - JANGAN HALUSINASI. Kalau data gak ada, bilang gak ada.
    - No streaks, no shame, no punishment for failure
    - Prevention > apology
    - Action > intention`,
        });

        const config = { configurable: { thread_id: `wa_${whatsappId}` } };

        console.log(`[Agent] Calling invoke for thread ${whatsappId}...`);
        const result = await agent.invoke(
            { messages: [new HumanMessage(messageText)] },
            config
        );

        const lastMessage = result.messages[result.messages.length - 1];
        console.log(`[Agent] Success!`);
        return lastMessage.content;
    } catch (error: any) {
        console.error("[Agent Error]:", error);
        return `Aduh bro, sorry banget otak gue lagi nge-hang sebentar. Tadi begini: ${error.message}`;
    }
}
