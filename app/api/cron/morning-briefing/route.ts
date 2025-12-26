import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCalendarServiceForUser } from "@/lib/google/calendar/service-factory";
import { getWahaClient } from "@/lib/waha/waha-client";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        console.log("🌅 Starting Morning Briefing Cron...");

        // GMT+7 (WIB) is the target timezone for the user "4 AM".
        // Vercel Cron runs in UTC. 4 AM WIB = 21:00 UTC (previous day)
        // However, the Cron Schedule in vercel.json usually just triggers this.
        // We will assume the cron calls this at the right time.

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const users = await prisma.user.findMany({
            include: {
                oauthAccounts: true, // Needed for calendar check
            }
        });

        const results = [];

        for (const user of users) {
            // Skip if no WhatsApp ID or no connected calendar
            if (!user.whatsappId || user.oauthAccounts.length === 0) continue;

            try {
                const calendar = await getCalendarServiceForUser(user.whatsappId);

                if (!calendar) {
                    results.push({ user: user.whatsappId, status: "No calendar service available" });
                    continue;
                }

                const events = await calendar.getEventsInRange(startOfDay, endOfDay);

                // Format the message
                let message = "";

                if (events.length === 0) {
                    // Micro-habit suggestions (Low friction, < 5 mins)
                    const suggestions = [
                        { text: "lari 5 menit", benefit: "bagus buat kesehatan" },
                        { text: "baca 5 menit berita di Bing News", benefit: "oke nih buat nambah ilmu" },
                        { text: "stretching 5 menit", benefit: "bikin badan gak kaku" },
                        { text: "rapihin meja 5 menit", benefit: "bikin mood kerja lebih enak" },
                        { text: "meditasi 5 menit", benefit: "bantu pikiran lebih fokus" }
                    ];

                    // Pick 2 distinct suggestions
                    const idx1 = Math.floor(Math.random() * suggestions.length);
                    let idx2 = Math.floor(Math.random() * suggestions.length);
                    while (idx1 === idx2) {
                        idx2 = Math.floor(Math.random() * suggestions.length);
                    }

                    const s1 = suggestions[idx1];
                    const s2 = suggestions[idx2];

                    message = `Selamat pagi! ☀️\n\nHari ini jadwal lo kosong. Pagi gini *${s1.text}* ${s1.benefit}, atau *${s2.text}* ${s2.benefit}.\n\nMenurut lo, pagi ini mau jalanin yang mana?`;
                } else {
                    const eventList = events.map(e => {
                        // Parse time
                        let timeStr = "All Day";
                        if (e.start?.dateTime) {
                            const date = new Date(e.start.dateTime);
                            timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                        }
                        return `• ${timeStr}: *${e.summary || "No Title"}*`;
                    }).join("\n");

                    message = `Selamat pagi! ☀️\n\nSiap-siap, ini agenda lo hari ini ada ${events.length} event:\n\n${eventList}\n\nJangan lupa napas. Good luck!`;
                }

                let chatId = user.whatsappId;
                if (!chatId.includes('@')) {
                    chatId = `${chatId}@c.us`;
                }

                const client = getWahaClient();
                await client.sendText({
                    session: 'default',
                    chatId: chatId,
                    text: message
                });

                results.push({ user: user.whatsappId, status: `Briefing sent with ${events.length} events` });

            } catch (err) {
                console.error(`Failed to process briefing for ${user.whatsappId}`, err);
                results.push({ user: user.whatsappId, error: "Failed" });
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
