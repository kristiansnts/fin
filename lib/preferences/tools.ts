import { tool } from "langchain";
import { z } from "zod";
import { preferenceService } from "./service";

/**
 * Tool to get user preferences
 */
export const getUserPreferencesTool = tool(
    async ({ userId }) => {
        try {
            const preferences = await preferenceService.getOrCreatePreferences(userId);
            return JSON.stringify(preferences, null, 2);
        } catch (error: any) {
            return `Error getting preferences: ${error.message}`;
        }
    },
    {
        name: "get_user_preferences",
        description: "Get the user's preferences including working hours, meeting buffer time, and boundary level. Use this to understand the user's constraints.",
        schema: z.object({
            userId: z.string().describe("The user's ID"),
        }),
    }
);

/**
 * Tool to update user preferences
 */
export const updateUserPreferencesTool = tool(
    async ({ userId, workingHoursStart, workingHoursEnd, meetingBufferMin, boundaryLevel }) => {
        try {
            const preferences = await preferenceService.updatePreferences(userId, {
                workingHoursStart,
                workingHoursEnd,
                meetingBufferMin,
                boundaryLevel: boundaryLevel as "low" | "medium" | "high" | undefined,
            });
            return `Preferences updated successfully: Working hours ${preferences.workingHoursStart}-${preferences.workingHoursEnd}, Buffer: ${preferences.meetingBufferMin} min, Boundary: ${preferences.boundaryLevel}`;
        } catch (error: any) {
            return `Error updating preferences: ${error.message}`;
        }
    },
    {
        name: "update_user_preferences",
        description: "Update the user's preferences. Use this when the user wants to change their working hours, meeting buffer, or boundary level.",
        schema: z.object({
            userId: z.string().describe("The user's ID"),
            workingHoursStart: z.string().optional().describe("Working hours start time (e.g., '09:00')"),
            workingHoursEnd: z.string().optional().describe("Working hours end time (e.g., '17:00')"),
            meetingBufferMin: z.number().optional().describe("Minimum buffer time between meetings in minutes"),
            boundaryLevel: z.enum(["low", "medium", "high"]).optional().describe("How strict the boundary enforcement should be"),
        }),
    }
);

/**
 * Export all preference tools as an array for easy use with LangChain agents
 */
export const preferenceTools = [
    getUserPreferencesTool,
    updateUserPreferencesTool,
];
