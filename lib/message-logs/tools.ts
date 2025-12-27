import { tool } from "langchain";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Tool to retrieve the last few messages sent to a user from the MessageLog.
 * This helps the agent understand context from Cron jobs or other sources that bypass the main thread history.
 */
export const getLastMessagesTool = tool(
    async ({ whatsappId, limit = 5 }) => {
        try {
            // First find the user ID from the whatsappId
            const user = await prisma.user.findUnique({
                where: { whatsappId },
                select: { id: true }
            });

            if (!user) {
                return "User not found.";
            }

            const logs = await prisma.messageLog.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: limit,
                select: {
                    message: true,
                    response: true, // The actual text sent to the user
                    createdAt: true
                }
            });

            if (logs.length === 0) {
                return "No recent message logs found.";
            }

            // Format nicely for the agent
            return logs.map(log =>
                `[${log.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}] System/Cron: "${log.response}" (Type: ${log.message})`
            ).join("\n");

        } catch (error: any) {
            return `Error retrieving message logs: ${error.message}`;
        }
    },
    {
        name: "get_recent_system_messages",
        description: "Retrieve the last 5 messages sent to the user by the System or Cron jobs. USE THIS if the user refers to something ('Done', 'Oke') but you don't know the context.",
        schema: z.object({
            whatsappId: z.string().describe("The user's WhatsApp ID (e.g., 628123...)"),
            limit: z.number().optional().describe("Number of messages to retrieve (default 5)")
        }),
    }
);

export const messageLogTools = [getLastMessagesTool];
