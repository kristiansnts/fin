import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCalendarServiceForUser } from "@/lib/google/calendar/service-factory";
import { getWahaClient } from "@/lib/waha/waha-client";

export const dynamic = 'force-dynamic'; // Ensure cron runs every time

export async function GET(req: NextRequest) {
    // Basic security check (optional, can be enhanced)
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    try {
        console.log("⏰ Starting Habit Nudge Cron...");

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 1. Get users with habits and preferences
        const users = await prisma.user.findMany({
            include: {
                habits: {
                    where: {
                        // Only active habits (future improvement: add 'active' boolean to Habit model)
                    },
                    include: {
                        logs: {
                            where: {
                                completedAt: {
                                    gte: startOfDay
                                }
                            }
                        }
                    }
                },
                preferences: true,
                oauthAccounts: true, // Needed for calendar check
            }
        });

        const results = [];

        for (const user of users) {
            // Skip if no WhatsApp ID
            if (!user.whatsappId) continue;

            // 2. Identify Pending Habits
            const pendingHabits = user.habits.filter(h => h.logs.length === 0);

            if (pendingHabits.length === 0) {
                results.push({ user: user.whatsappId, status: "No pending habits" });
                continue;
            }

            // 3. User Preferences Check (Time of Day)
            const prefs = user.preferences;
            const currentHour = now.getHours();

            // Default working hours 9-17 if not set
            // Wait, nudges for habits might better happen OUTSIDE working hours or DURING breaks?
            // "Context-aware": Nudge when FREE.

            // Let's rely on Calendar for "Free".

            // 4. Check Calendar Availability
            const calendar = await getCalendarServiceForUser(user.whatsappId);

            let isFree = true; // Default to free if no calendar connected (aggressive nudging?) -> No, maybe safer to assume busy or just nudge anyway?
            // "Solution 1: Context-aware nudging". Without context (calendar), we're just a spam bot.
            // If no calendar, maybe only nudge if explicitly permitted?
            // For now: If calendar exists, check it. If not, assume free (fallback).

            if (calendar) {
                // Check next 30 minutes
                const endTime = new Date(now.getTime() + 30 * 60000); // +30 mins
                isFree = await calendar.isTimeFree(now, endTime);
            }

            if (!isFree) {
                results.push({ user: user.whatsappId, status: "User busy according to calendar" });
                continue;
            }

            // 5. Send Nudge
            // Pick one random pending habit to avoid overwhelming
            const habitToNudge = pendingHabits[Math.floor(Math.random() * pendingHabits.length)];

            const message = `👋 Hey! Gue liat jadwal lu lagi kosong nih. \n\nCuma mau ngingetin, hari ini belum: *${habitToNudge.title}*. \n\nGas sekarang? 5 menit jadi.`;

            try {
                const client = getWahaClient();
                // Check chat ID format (append @c.us if missing?)
                // Assuming whatsappId in DB is full format e.g. 628xxx@c.us
                // If stored as just number, might need appending. 
                // Let's assume stored correctly or trust Waha handles it? Waha usually needs @c.us

                let chatId = user.whatsappId;
                if (!chatId.includes('@')) {
                    chatId = `${chatId}@c.us`;
                }

                await client.sendText({
                    session: 'default',
                    chatId: chatId,
                    text: message
                });

                results.push({ user: user.whatsappId, status: `Nudged for ${habitToNudge.title}` });
            } catch (err) {
                console.error(`Failed to send nudge to ${user.whatsappId}`, err);
                results.push({ user: user.whatsappId, error: "Failed to send message" });
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            results
        });

    } catch (error: any) {
        console.error("Cron Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
