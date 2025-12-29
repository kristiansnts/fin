import { NextRequest, NextResponse } from "next/server";
import {
    WahaWebhookPayload,
    WebhookResponse,
    WebhookSuccessResponse,
    WebhookSkippedResponse,
    WebhookErrorResponse
} from "./types";
import { extractMessage, sendWhatsAppReply, markAsSeen, startTyping, stopTyping, setPresence } from "@/lib/whatsapp/message-handler";
import { processWhatsAppWithAgent } from "../agent";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest): Promise<NextResponse<WebhookResponse>> {
    try {
        const payload = (await req.json()) as WahaWebhookPayload;

        // Extract message from payload
        const message = extractMessage(payload);

        if (!message) {
            console.log("⚠️ Could not extract sender or message from payload");
            const response: WebhookSkippedResponse = {
                success: true,
                skipped: true,
                reason: "Missing sender ID or message text"
            };
            return NextResponse.json(response);
        }

        // Ignore status updates, group messages (if intended to be personal agent), and LID messages
        if (
            message.from === 'status@broadcast' ||
            message.from.includes('@g.us') ||
            message.from.includes('@lid')
        ) {
            console.log(`⏭️ Skipping non-personal or LID message from ${message.from}`);
            return NextResponse.json({
                success: true,
                skipped: true,
                reason: "Not a personal message or is a Linked Device ID"
            });
        }

        // --- DEDUPLICATION ---
        // Try to reserve this message ID in the database.
        // If it already exists (UniqueConstraintViolation), we skip it.
        try {
            await prisma.messageLog.create({
                data: {
                    id: message.id, // WAHA message ID
                    message: message.text,
                    response: "PROCESSING", // Initial state
                    createdAt: new Date(),
                    // We don't have a guaranteed User ID here unless we query it. 
                    // Leaving userId null is allowed by schema (String?).
                }
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                console.log(`♻️ Skipping duplicate message ID: ${message.id}`);
                return NextResponse.json({
                    success: true,
                    skipped: true,
                    reason: "Duplicate message ID"
                });
            }
            // If other error, log but maybe continue or throw?
            // Safer to continue if DB is just acting up, but better to log.
            console.error("Deduplication check failed:", error);
        }

        console.log(`📩 Message from ${message.from} on session ${message.session}: ${message.text}`);

        const session = message.session || 'default';

        // 1. Mark as seen
        await markAsSeen(message.from, session);

        // 2. Start typing & set presence typing
        await startTyping(message.from, session);
        await setPresence("typing", message.from, session);

        // 3. Process the message with the agent
        const agentResponse = await processWhatsAppWithAgent(message.from, message.text);

        // 4. Stop typing
        await stopTyping(message.from, session);

        // 5. Send the agent's response back to WhatsApp
        await sendWhatsAppReply(message.from, String(agentResponse), session);

        // 6. Set presence online
        await setPresence("online", undefined, session);

        // Update the log with the response
        // We do this asynchronously to not block the webhook response time too much
        // although we are already at the end.
        try {
            await prisma.messageLog.update({
                where: { id: message.id },
                data: { response: String(agentResponse) }
            });
        } catch (updateError) {
            console.error("Failed to update message log with response:", updateError);
        }

        const response: WebhookSuccessResponse = {
            success: true,
            message: "Message received and processed",
            data: {
                from: message.from,
                messageReceived: message.text,
                session: message.session
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Webhook error:", error);
        const response: WebhookErrorResponse = {
            success: false,
            error: "Failed to process webhook",
            details: error instanceof Error ? error.message : String(error)
        };
        return NextResponse.json(response, { status: 500 });
    }
}
