"use client";

import { useState } from "react";

export default function TestCronPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const triggerCron = async (endpoint: string, name: string) => {
        setLoading(name);
        setResult(null);
        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            setResult(data);
        } catch (error: any) {
            setResult({ error: error.message });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>🕵️‍♂️ Cron Tester</h1>
            <p style={{ marginBottom: "30px", color: "#666" }}>
                Test your proactive agent logic immediately without waiting for Vercel Scheduler.
            </p>

            <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <CronCard
                    title="🌅 Morning Briefing"
                    desc="Checks calendar + habits, sends kickoff message."
                    onClick={() => triggerCron("/api/cron/morning-briefing", "morning")}
                    loading={loading === "morning"}
                />
                <CronCard
                    title="👀 Hourly Nudge"
                    desc="Checks free time (30m) + pending habits. Sends soft nudge."
                    onClick={() => triggerCron("/api/cron/nudge", "nudge")}
                    loading={loading === "nudge"}
                />
                <CronCard
                    title="🌙 Evening Summary"
                    desc="Recaps completed habits + events. Sends closure."
                    onClick={() => triggerCron("/api/cron/evening-summary", "evening")}
                    loading={loading === "evening"}
                />
            </div>

            <div style={{ marginTop: "40px", padding: "20px", background: "#f5f5f5", borderRadius: "8px", minHeight: "200px" }}>
                <h3 style={{ marginBottom: "10px" }}>Result:</h3>
                {loading && <p>Processing... (This might take a few seconds)</p>}
                {!loading && result && (
                    <pre style={{ overflow: "auto", background: "#000", color: "#0f0", padding: "15px", borderRadius: "4px" }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                )}
                {!loading && !result && <p style={{ color: "#999" }}>Click a button to see the output.</p>}
            </div>
        </div>
    );
}

function CronCard({ title, desc, onClick, loading }: { title: string, desc: string, onClick: () => void, loading: boolean }) {
    return (
        <div style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#555", flex: 1 }}>{desc}</p>
            <button
                onClick={onClick}
                disabled={loading}
                style={{
                    padding: "10px 20px",
                    background: loading ? "#ccc" : "#000",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    marginTop: "10px"
                }}
            >
                {loading ? "Running..." : "Run Now"}
            </button>
        </div>
    );
}
