import { prisma } from "@/lib/prisma";

export interface CreatePreferenceInput {
    userId: string;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    meetingBufferMin?: number;
    boundaryLevel?: "low" | "medium" | "high";
}

export interface UpdatePreferenceInput {
    workingHoursStart?: string;
    workingHoursEnd?: string;
    meetingBufferMin?: number;
    boundaryLevel?: "low" | "medium" | "high";
}

export class PreferenceService {
    /**
     * Get or create user preferences
     */
    async getOrCreatePreferences(userId: string) {
        let preferences = await prisma.userPreference.findUnique({
            where: { userId },
        });

        if (!preferences) {
            preferences = await prisma.userPreference.create({
                data: {
                    userId,
                    workingHoursStart: "09:00",
                    workingHoursEnd: "17:00",
                    meetingBufferMin: 15,
                    boundaryLevel: "medium",
                },
            });
        }

        return preferences;
    }

    /**
     * Update user preferences
     */
    async updatePreferences(userId: string, input: UpdatePreferenceInput) {
        return await prisma.userPreference.upsert({
            where: { userId },
            update: input,
            create: {
                userId,
                ...input,
            },
        });
    }

    /**
     * Get user preferences
     */
    async getPreferences(userId: string) {
        return await prisma.userPreference.findUnique({
            where: { userId },
        });
    }
}

export const preferenceService = new PreferenceService();
