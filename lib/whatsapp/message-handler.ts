import { getWahaClient } from "@/lib/waha/waha-client";
import { WahaWebhookPayload } from "@/app/api/whatsapp/webhook/types";

export interface ProcessedMessage {
    id: string;
    from: string;
    text: string;
    session: string;
    timestamp: number;
}

/**
 * Extract and normalize message data from webhook payload
 */
export function extractMessage(payload: WahaWebhookPayload): ProcessedMessage | null {
    const whatsappId = payload.payload?.from;
    const messageText = payload.payload?.body;
    const messageId = payload.payload?.id || payload.sender?.id || `msg_${Date.now()}`; // Fallback if no ID
    const session = payload.session || "default";

    if (!whatsappId || !messageText) {
        return null;
    }

    return {
        id: messageId,
        from: whatsappId,
        text: messageText,
        session,
        timestamp: payload.timestamp || Date.now(),
    };
}

/**
 * Send a WhatsApp message reply
 */
export async function sendWhatsAppReply(
    to: string,
    text: string,
    session: string = "default"
): Promise<void> {
    // Safety check: Never send to status broadcast (story upload)
    if (to === 'status@broadcast') {
        console.warn("🛡️ Blocked attempt to send message to status@broadcast");
        return;
    }

    const client = getWahaClient();

    await client.sendText({
        session,
        chatId: to,
        text,
    });
}

/**
 * Mark a chat as seen
 */
export async function markAsSeen(
    chatId: string,
    session: string = "default"
): Promise<void> {
    const client = getWahaClient();
    try {
        await client.sendSeen({
            session,
            chatId,
        });
    } catch (error) {
        console.error("Failed to mark as seen:", error);
    }
}

/**
 * Start typing indicators
 */
export async function startTyping(
    chatId: string,
    session: string = "default"
): Promise<void> {
    const client = getWahaClient();
    try {
        await client.startTyping({
            session,
            chatId,
        });
    } catch (error) {
        console.error("Failed to start typing:", error);
    }
}

/**
 * Stop typing indicators
 */
export async function stopTyping(
    chatId: string,
    session: string = "default"
): Promise<void> {
    const client = getWahaClient();
    try {
        await client.stopTyping({
            session,
            chatId,
        });
    } catch (error) {
        console.error("Failed to stop typing:", error);
    }
}

/**
 * Set presence for the session
 */
export async function setPresence(
    presence: "offline" | "online" | "typing" | "recording" | "paused",
    chatId?: string,
    session: string = "default"
): Promise<void> {
    const client = getWahaClient();
    try {
        await client.setPresence({
            session,
            chatId,
            presence,
        });
    } catch (error) {
        console.error(`Failed to set presence to ${presence}:`, error);
    }
}

/**
 * Process incoming WhatsApp message with your business logic
 * This is where you'd integrate with your LangChain agent or other services
 */
export async function processWhatsAppMessage(message: ProcessedMessage): Promise<string> {
    // TODO: Integrate with your LangChain agent here
    // For now, just echo the message
    console.log(`Processing message from ${message.from}: ${message.text}`);

    // Example: You could call your agent like this:
    // const response = await basicAgent({
    //     input: { messages: [{ role: "user", content: message.text }] },
    //     apiKey: process.env.OPENROUTER_API_KEY!,
    //     config: { configurable: { thread_id: message.from } }
    // });

    return `Received: ${message.text}`;
}
