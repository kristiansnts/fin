import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createCalendarTools } from "@/lib/google/calendar";
import { postgresTools } from "@/lib/postgres";
import { createAuthDeepLink } from "@/lib/google/oauth";
import { tool } from "langchain";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";

const DB_URI = process.env.NEXT_PUBLIC_DB_URI;
if (!DB_URI) {
    throw new Error("Missing NEXT_PUBLIC_DB_URI");
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
            apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
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
            tools: [...calendarTools, ...postgresTools, getAuthLinkTool],
            checkpointer,
            systemPrompt: `Kamu adalah Fin, sahabat sekaligus asisten pribadi paling asik buat user. 
    Waktu saat ini: ${dateContext} WIB.
    
    Kamu punya akses ke Google Calendar dan database PostgreSQL user.
    - Gaya bahasa santai, kayak bro/sahabat.
    - JANGAN HALUSINASI. Kalau data gak ada, bilang gak ada.
    - Fokus Bahasa Indonesia yang asik.`,
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
