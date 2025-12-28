import { NextRequest, NextResponse } from "next/server";
import { runMorningBriefing, runNudge, runEveningSummary } from "@/lib/cron/services";

/**
 * MASTER CRON DISPATCHER
 * 
 * Runs hourly to overcome Vercel's Hobby Plan limit (max 2 cron jobs).
 * This endpoint checks the current UTC hour and dispatches the appropriate task.
 * 
 * Schedule: 0 * * * * (Hourly)
 */
export async function GET(req: NextRequest) {
    const now = new Date();
    const utcHour = now.getUTCHours(); // 0 - 23

    console.log(`[Cron Dispatcher] Tick at UTC Hour: ${utcHour}`);

    let result: any = { status: "no_action" };

    try {
        // 07:00 WIB = 00:00 UTC
        if (utcHour === 0) {
            console.log("[Cron Dispatcher] Triggering Morning Briefing");
            result = await runMorningBriefing();
        }
        // 20:00 WIB = 13:00 UTC
        else if (utcHour === 13) {
            console.log("[Cron Dispatcher] Triggering Evening Summary");
            result = await runEveningSummary();
        }
        // Waking Hours: 08:00 - 19:00 WIB = 01:00 - 12:00 UTC
        else if (utcHour >= 1 && utcHour <= 12) {
            console.log("[Cron Dispatcher] Triggering Hourly Nudge");
            result = await runNudge();
        }

        return NextResponse.json({
            success: true,
            utcHour,
            action: result
        });

    } catch (error) {
        console.error("[Cron Dispatcher] Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
