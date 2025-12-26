import { prisma } from "@/lib/prisma";

export interface CreateHabitInput {
    userId: string;
    title: string;
    description?: string;
    frequency?: "daily" | "weekly";
    timeOfDay?: "morning" | "afternoon" | "evening";
}

export interface LogHabitInput {
    habitId: string;
    notes?: string;
}

export class HabitService {
    /**
     * Create a new habit for a user
     */
    async createHabit(input: CreateHabitInput) {
        return await prisma.habit.create({
            data: {
                userId: input.userId,
                title: input.title,
                description: input.description,
                frequency: input.frequency || "daily",
                timeOfDay: input.timeOfDay,
            },
        });
    }

    /**
     * Log a habit completion
     */
    async logHabit(input: LogHabitInput) {
        return await prisma.habitLog.create({
            data: {
                habitId: input.habitId,
                notes: input.notes,
            },
        });
    }

    /**
     * Get all habits for a user
     */
    async getUserHabits(userId: string) {
        return await prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    orderBy: { completedAt: "desc" },
                    take: 5,
                },
            },
        });
    }

    /**
     * Get pending habits (not completed today)
     */
    async getPendingHabits(userId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const habits = await prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    where: {
                        completedAt: {
                            gte: today,
                        },
                    },
                },
            },
        });

        // Filter habits that haven't been logged today
        return habits.filter((habit: { logs: any[] }) => habit.logs.length === 0);
    }

    /**
     * Delete a habit
     */
    async deleteHabit(habitId: string) {
        return await prisma.habit.delete({
            where: { id: habitId },
        });
    }
}

export const habitService = new HabitService();
