
import { prisma } from '@/lib/prisma';

/**
 * Check if a WhatsApp user has a connected Google Account
 * @param whatsappId The user's WhatsApp ID (e.g. 628123...)
 */
export async function isGoogleConnected(whatsappId: string): Promise<boolean> {
    try {
        const user = await prisma.user.findFirst({
            where: { whatsappId },
            include: { oauthAccounts: true }
        });

        if (!user || user.oauthAccounts.length === 0) {
            return false;
        }

        // We assume if they have an account, it's connected. 
        // In a real app we might check for token expiration/refresh ability here,
        // but for now existence is enough to try using it.
        return true;
    } catch (error) {
        console.error("Error checking Google connection:", error);
        return false;
    }
}
