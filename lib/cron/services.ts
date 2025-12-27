import { prisma } from "@/lib/prisma";
import { getCalendarServiceForUser } from "@/lib/google/calendar/service-factory";
import { habitService } from "@/lib/habits/service";
import { sendWhatsAppReply } from "@/lib/whatsapp/message-handler";
import { MICRO_HABITS } from "@/lib/habits/data/micro-habits";

/**
 * MORNING BRIEFING
 * 07:00 WIB (00:00 UTC)
 */
export async function runMorningBriefing() {
    console.log("[Cron] Starting morning briefing...");
    const users = await prisma.user.findMany({
        where: { oauthAccounts: { some: {} } },
        include: { preferences: true }
    });

    const results = [];

    for (const user of users) {
        try {
            const calendarService = await getCalendarServiceForUser(user.whatsappId);
            if (!calendarService) continue;

            const events = await calendarService.getTodayEvents();
            const pendingHabits = await habitService.getPendingHabits(user.id);

            // Construct Message
            const busyCount = events.length;
            let scheduleAnalysis = "";
            let conflicts = 0;

            if (busyCount === 0) {
                scheduleAnalysis = "Jadwal kosong hari ini. Enjoy the silence.";
            } else {
                for (let i = 0; i < events.length - 1; i++) {
                    const currentEnd = events[i].end?.dateTime ? new Date(events[i].end!.dateTime as string).getTime() : 0;
                    const nextStart = events[i + 1].start?.dateTime ? new Date(events[i + 1].start!.dateTime as string).getTime() : 0;
                    if (currentEnd > nextStart && currentEnd !== 0 && nextStart !== 0) conflicts++;
                }

                if (conflicts > 0) {
                    scheduleAnalysis = `⚠️ Warning: Ada ${conflicts} overlap di jadwal hari ini. Cek kalender sekarang daripada panik nanti.\n\n`;
                }

                scheduleAnalysis += `Agenda utama (${busyCount} total):`;
                events.slice(0, 5).forEach(evt => {
                    const start = evt.start;
                    const time = (start && start.dateTime)
                        ? new Date(start.dateTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                        : 'All Day';
                    scheduleAnalysis += `\n- ${time}: ${evt.summary}`;
                });
                if (busyCount > 5) scheduleAnalysis += `\n...dan ${busyCount - 5} lainnya.`;
            }

            let habitNudge = "";
            if (pendingHabits.length > 0) {
                habitNudge = `\n\n🎯 Target: ${pendingHabits.length} habits pending.`;
            }

            const intro = `Yo. Briefing pagi buat ${new Date().toLocaleDateString('id-ID', { weekday: 'long' })}.`;
            const message = `${intro}\n\n${scheduleAnalysis}${habitNudge}`;

            await sendWhatsAppReply(user.whatsappId, message);

            await prisma.messageLog.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    message: "[CRON_MORNING_BRIEFING]",
                    response: message,
                }
            });

            results.push({ userId: user.id, status: 'sent' });

        } catch (error) {
            console.error(`[Cron] Error morning briefing user ${user.id}:`, error);
            results.push({ userId: user.id, status: 'error', error: String(error) });
        }
    }
    return results;
}

/**
 * NUDGE
 * Hourly 08:00 - 19:00 WIB (01:00 - 12:00 UTC)
 */
export async function runNudge() {
    console.log("[Cron] Starting nudge check...");
    const users = await prisma.user.findMany({
        where: {} // Check all users
    });

    const results = [];
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    for (const user of users) {
        try {
            const allHabits = await habitService.getUserHabits(user.id);
            const pendingHabits = await habitService.getPendingHabits(user.id);

            const calendarService = await getCalendarServiceForUser(user.whatsappId);
            let isFree = true;
            if (calendarService) {
                isFree = await calendarService.isTimeFree(now, thirtyMinutesFromNow);
            }

            if (!isFree) {
                console.log(`[Cron] User ${user.whatsappId} is busy. Skipping Nudge.`);
                results.push({ userId: user.id, status: 'skipped', reason: 'busy' });
                continue;
            }

            // Scenario 1: No Habits at all -> Suggest Micro-Habit
            // Scenario 1: No Habits at all -> Suggest Micro-Habit
            if (allHabits.length === 0) {
                const suggestion = MICRO_HABITS[Math.floor(Math.random() * MICRO_HABITS.length)];

                const message = `Keliatan kamu lagi ada jeda sebentar.

Yang paling ringan: ${suggestion.action}

Buat ${suggestion.impact}`;

                await sendWhatsAppReply(user.whatsappId, message);

                // Log to DB so Agent can recall it later if needed
                await prisma.messageLog.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: user.id,
                        message: "[CRON_NUDGE_ZERO_HABIT]",
                        response: message,
                    }
                });

                console.log(`[Cron] Sent zero-habit suggestion to ${user.whatsappId}`);
                results.push({ userId: user.id, status: 'sent', type: 'zero_habit_suggestion' });
                continue;
            }

            // Scenario 2: Has habits but all done -> Relax
            if (pendingHabits.length === 0) {
                console.log(`[Cron] User ${user.whatsappId} has 0 pending habits. Skipping Nudge.`);
                results.push({ userId: user.id, status: 'skipped', reason: 'no_pending' });
                continue;
            }

            // Scenario 3: Has pending habits -> Nudge
            const habitToNudge = pendingHabits[Math.floor(Math.random() * pendingHabits.length)];
            const message = `👀 Mumpung ada waktu kosong 30 menit.

Kalo lagi mood, boleh nih nyicil "${habitToNudge.title}" bentar. 5 menit cukup, gak usah perfect.

Kalo lagi pengen istirahat, skip aja santai bro. 👌`;

            await sendWhatsAppReply(user.whatsappId, message);

            await prisma.messageLog.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    message: `[CRON_NUDGE_HABIT:${habitToNudge.title}]`,
                    response: message,
                }
            });

            console.log(`[Cron] Sent nudge to ${user.whatsappId} for habit ${habitToNudge.title}`);
            results.push({ userId: user.id, status: 'sent', habit: habitToNudge.title });

        } catch (error) {
            console.error(`[Cron] Error nudge user ${user.id}:`, error);
            results.push({ userId: user.id, status: 'error', error: String(error) });
        }
    }
    return results;
}

/**
 * EVENING SUMMARY
 * 20:00 WIB (13:00 UTC)
 */
export async function runEveningSummary() {
    console.log("[Cron] Starting evening summary...");
    const users = await prisma.user.findMany({
        where: { oauthAccounts: { some: {} } }
    });

    const results = [];

    for (const user of users) {
        try {
            const calendarService = await getCalendarServiceForUser(user.whatsappId);
            const allHabits = await habitService.getUserHabits(user.id);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const completedHabits = allHabits.filter(h =>
                h.logs.some(log => new Date(log.completedAt) >= today)
            );

            let eventsCount = 0;
            if (calendarService) {
                const events = await calendarService.getTodayEvents();
                eventsCount = events.length;
            }

            if (completedHabits.length === 0 && eventsCount === 0) {
                const message = `Hari udah mau abis bro. Istirahat yang cukup ya. 😴\n\nBesok kita hajar lagi. Good night!`;
                await sendWhatsAppReply(user.whatsappId, message);
                results.push({ userId: user.id, status: 'sent', type: 'empty' });
                continue;
            }

            let summary = `🌙 Daily Closure\n\n`;
            if (eventsCount > 0) {
                summary += `Hari ini lu udah lewatin ${eventsCount} agenda. `;
                summary += (eventsCount > 5) ? "Gila sih, busy banget." : "Not bad.";
                summary += "\n";
            }

            if (completedHabits.length > 0) {
                summary += `\n✅ Habits Done:\n`;
                completedHabits.forEach(h => summary += `- ${h.title}\n`);
                summary += `\nNice progress on these!`;
            } else {
                summary += `\n(No habits logged today. Its okay, besok coba nyicil satu ya.)`;
            }

            const message = `${summary}\n\nSekarang waktunya disconnect. Sampai ketemu besok pagi! 👋`;

            await sendWhatsAppReply(user.whatsappId, message);

            await prisma.messageLog.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    message: "[CRON_EVENING_SUMMARY]",
                    response: message,
                }
            });

            results.push({ userId: user.id, status: 'sent' });

        } catch (error) {
            console.error(`[Cron] Error evening summary user ${user.id}:`, error);
            results.push({ userId: user.id, status: 'error', error: String(error) });
        }
    }
    return results;
}
