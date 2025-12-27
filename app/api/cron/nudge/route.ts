import { NextRequest, NextResponse } from "next/server";
import { runNudge } from "@/lib/cron/services";

export async function GET(req: NextRequest) {
    try {
        const result = await runNudge();
        return NextResponse.json({ success: true, result });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
