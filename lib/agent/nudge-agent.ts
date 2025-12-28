import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { MICRO_HABITS } from "@/lib/habits/data/micro-habits";

interface NudgeContext {
    whatsappId: string;
    isFree: boolean;
    minutesAvailable: number;
    pendingHabits: { title: string; id: string }[]; // Simplified habit object
    nextEvent?: { summary: string; time: string }; // Optional next event for context
    hasEventsToday: boolean; // Explicit flag for "Zero Event" awareness
}

/**
 * Generates a context-aware nudge using the "Habit Agent".
 * This agent specializes in motivating the user based on their CURRENT schedule context.
 */
export async function generateNudge(context: NudgeContext): Promise<string> {
    const model = new ChatOpenAI({
        model: "nvidia/nemotron-3-nano-30b-a3b:free", // Lightweight model for high-frequency cron
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
        temperature: 0.7,
    });

    // We inject the Calendar State directly into the Habit Agent's prompt.
    // This is how the Habit Agent "knows" about the schedule (e.g. Zero Events).
    const prompt = PromptTemplate.fromTemplate(`
You are Fin's "Habit Agent". Your ONLY job is to send a short, punchy nudge to the user via WhatsApp.
Target User: {whatsappId}
Current Time: {currentTime}

### USER CONTEXT (Provided by Calendar Agent)
- Status: {isFree} (Available for {minutesAvailable} mins)
- Has Events Today: {hasEventsToday}
- Next Event: {nextEventText}

### PENDING HABITS
{habitList}

### INSTRUCTIONS
1. **Analyze Context**:
   - If "Has Events Today" is FALSE -> The user has a completely free day. Encouragement should be about "Designing their day" or "Deep work".
   - If "IsFree" is TRUE -> Suggest a habit that fits the available time.
   - If "IsFree" is FALSE -> Do NOT suggest a heavy task. Suggest a "Micro Habit" or just a friendly "Don't forget to hydrate" check-in.
   
2. **Select Action**:
   - If user has Pending Habits -> Pick ONE that fits.
   - If user has NO Pending Habits -> Suggest a "Micro Habit" (e.g., Drink water, Stretch) OR suggest starting a new habit (e.g., Reading).

3. **Tone**:
   - Casual, "Bro/Bestie" style. Indonesian slang (Jakarta).
   - Short. Max 2-3 sentences.
   - No "Robot" talk.

### MICRO HABIT BANK (Use if needed)
{microHabits}

Write the WhatsApp message now:
`);

    const microHabitsText = MICRO_HABITS.map(h => `- ${h.action}`).join("\n");
    const habitListText = context.pendingHabits.length > 0
        ? context.pendingHabits.map(h => `- ${h.title}`).join("\n")
        : "(No pending habits tracked)";

    const nextEventText = context.nextEvent
        ? `${context.nextEvent.summary} at ${context.nextEvent.time}`
        : "None";

    const isFreeText = context.isFree ? "FREE ✅" : "BUSY ❌";

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const response = await chain.invoke({
        whatsappId: context.whatsappId,
        currentTime: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }),
        isFree: isFreeText,
        minutesAvailable: context.minutesAvailable,
        hasEventsToday: context.hasEventsToday ? "YES" : "NO (Zero Events)",
        nextEventText: nextEventText,
        habitList: habitListText,
        microHabits: microHabitsText
    });

    return response;
}
