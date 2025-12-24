import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "../oauth";
import { CalendarService } from "./service";

/**
 * Get an authenticated CalendarService for a specific WhatsApp user.
 * Handles token retrieval and automatic refreshing.
 */
export async function getCalendarServiceForUser(whatsappId: string): Promise<CalendarService | null> {
    const user = await prisma.user.findUnique({
        where: { whatsappId },
        include: { oauthAccounts: true },
    });

    if (!user || user.oauthAccounts.length === 0) {
        return null;
    }

    const account = user.oauthAccounts[0]; // Assuming 1-to-1 for now as per callback logic

    let accessToken = account.accessToken;
    const now = new Date();

    // Buffer: refresh if it expires in less than 5 minutes
    const buffer = 5 * 60 * 1000;
    if (account.expiresAt.getTime() - now.getTime() < buffer) {
        try {
            const refreshed = await refreshAccessToken(account.refreshToken);
            accessToken = refreshed.access_token;

            // Update the DB with new token
            await prisma.oAuthAccount.update({
                where: { id: account.id },
                data: {
                    accessToken: refreshed.access_token,
                    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                },
            });
        } catch (error) {
            console.error(`Failed to refresh token for user ${whatsappId}:`, error);
            // If refresh fails, we might need the user to re-auth, but for now just return with existing
        }
    }

    return new CalendarService({
        accessToken,
        defaultCalendarId: "primary",
    });
}
