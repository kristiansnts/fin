import { tool } from "langchain";
import { z } from "zod";
import { habitService } from "./service";

/**
 * Tool to create a new habit for the user
 */
export const createHabitTool = tool(
    async ({ userId, title, description, frequency, timeOfDay }) => {
        try {
            const habit = await habitService.createHabit({
                userId,
                title,
                description,
                frequency: frequency as "daily" | "weekly" | undefined,
                timeOfDay: timeOfDay as "morning" | "afternoon" | "evening" | undefined,
            });
            return `Habit created successfully: ${habit.title} (${habit.frequency})`;
        } catch (error: any) {
            return `Error creating habit: ${error.message}`;
        }
    },
    {
        name: "create_habit",
        description: "Create a new habit for the user to track. Use this when the user wants to start a new habit.",
        schema: z.object({
            userId: z.string().describe("The user's ID"),
            title: z.string().describe("The habit title (e.g., 'Lari pagi', 'Baca buku')"),
            description: z.string().optional().describe("Optional description of the habit"),
            frequency: z.enum(["daily", "weekly"]).optional().describe("How often the habit should be done. Defaults to daily."),
            timeOfDay: z.enum(["morning", "afternoon", "evening"]).optional().describe("Preferred time of day for the habit"),
        }),
    }
);

/**
 * Tool to log a habit completion
 */
export const logHabitTool = tool(
    async ({ habitId, notes }) => {
        try {
            const log = await habitService.logHabit({ habitId, notes });
            return `Habit logged successfully at ${log.completedAt.toLocaleString('id-ID')}`;
        } catch (error: any) {
            return `Error logging habit: ${error.message}`;
        }
    },
    {
        name: "log_habit",
        description: "Mark a habit as completed. Use this when the user confirms they've done a habit.",
        schema: z.object({
            habitId: z.string().describe("The ID of the habit to log"),
            notes: z.string().optional().describe("Optional notes about the completion"),
        }),
    }
);

/**
 * Tool to get all habits for a user
 */
export const getUserHabitsTool = tool(
    async ({ userId }) => {
        try {
            const habits = await habitService.getUserHabits(userId);
            return JSON.stringify(habits, null, 2);
        } catch (error: any) {
            return `Error getting habits: ${error.message}`;
        }
    },
    {
        name: "get_user_habits",
        description: "Get all habits for the user, including recent completion logs.",
        schema: z.object({
            userId: z.string().describe("The user's ID"),
        }),
    }
);

/**
 * Tool to get pending habits (not done today)
 */
export const getPendingHabitsTool = tool(
    async ({ userId }) => {
        try {
            const pending = await habitService.getPendingHabits(userId);
            if (pending.length === 0) {
                return "No pending habits for today. User is all caught up!";
            }
            return JSON.stringify(pending, null, 2);
        } catch (error: any) {
            return `Error getting pending habits: ${error.message}`;
        }
    },
    {
        name: "get_pending_habits",
        description: "Get habits that haven't been completed today. Use this to check what the user still needs to do.",
        schema: z.object({
            userId: z.string().describe("The user's ID"),
        }),
    }
);

/**
 * Tool to delete a habit
 */
export const deleteHabitTool = tool(
    async ({ habitId }) => {
        try {
            await habitService.deleteHabit(habitId);
            return "Habit deleted successfully";
        } catch (error: any) {
            return `Error deleting habit: ${error.message}`;
        }
    },
    {
        name: "delete_habit",
        description: "Delete a habit. Use this when the user wants to stop tracking a habit.",
        schema: z.object({
            habitId: z.string().describe("The ID of the habit to delete"),
        }),
    }
);

/**
 * Export all habit tools as an array for easy use with LangChain agents
 */
export const habitTools = [
    createHabitTool,
    logHabitTool,
    getUserHabitsTool,
    getPendingHabitsTool,
    deleteHabitTool,
];
