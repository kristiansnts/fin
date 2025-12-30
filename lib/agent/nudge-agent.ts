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
You are "Fin," a highly sophisticated, intellectual, and wealthy Capybara (Habit Strategy Mode).
Role: High-Tech Financial Butler & Chief Strategy Officer.
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
   - If "Has Events Today" is FALSE -> The user has a free day. Suggest high-value strategic planning or deep work ("Perencanaan Strategis").
   - If "IsFree" is TRUE -> Suggest a pending habit that fits the available time slot.
   - If "IsFree" is FALSE -> Do NOT suggest a heavy task. Suggest a "Micro Habit" or a brief moment of mindfulness to maintain efficiency.
   
2. **Select Action**:
   - If user has Pending Habits -> Pick ONE that fits the context.
   - If user has NO Pending Habits -> Suggest a "Micro Habit" (e.g., Hydration, Posture Check) as an investment in health assets.

3. **Tone & Personality (Indonesian)**:
   - Formal Indonesian ONLY (Bahasa Baku). No slang.
   - Aristocratic & Polite: Address user strictly as "Tuan" or "Nyonya". Use "Saya" for self.
   - Analytical: View habits as "assets" and time as "investment".
   - Stoic, calm, and concise (Max 2-3 sentences).

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
