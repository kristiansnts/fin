import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getCalendarServiceForUser } from "./service-factory";

/**
 * Factory function to create Google Calendar tools for a specific user.
 */
export async function createCalendarTools(whatsappId: string) {
    const service = await getCalendarServiceForUser(whatsappId);

    if (!service) {
        // Return a dummy tool that informs the agent the user needs to authenticate
        return [
            tool(
                async () => {
                    return "Error: The user has not connected their Google Calendar yet. Please provide them with the authentication link.";
                },
                {
                    name: "google_calendar_not_connected",
                    description: "This tool is used when Google Calendar is not connected.",
                    schema: z.object({}),
                }
            ),
        ];
    }

    const listEventsTool = tool(
        async ({ timeMin, timeMax, maxResults }) => {
            try {
                const events = await service.listEvents({
                    timeMin: timeMin || new Date().toISOString(),
                    timeMax,
                    maxResults: maxResults || 10,
                });
                return JSON.stringify(events, null, 2);
            } catch (error: any) {
                return `Error listing events: ${error.message}`;
            }
        },
        {
            name: "list_calendar_events",
            description: "List Google Calendar events for a given time range.",
            schema: z.object({
                timeMin: z.string().optional().describe("ISO string for start time. Defaults to now."),
                timeMax: z.string().optional().describe("ISO string for end time."),
                maxResults: z.number().optional().describe("Maximum number of events to return. Defaults to 10."),
            }),
        }
    );

    const getUpcomingEventsTool = tool(
        async ({ count }) => {
            try {
                const events = await service.getUpcomingEvents(count || 10);
                return JSON.stringify(events, null, 2);
            } catch (error: any) {
                return `Error getting upcoming events: ${error.message}`;
            }
        },
        {
            name: "get_upcoming_calendar_events",
            description: "Get the next upcoming events from Google Calendar.",
            schema: z.object({
                count: z.number().optional().describe("Number of upcoming events to fetch. Defaults to 10."),
            }),
        }
    );

    const createEventTool = tool(
        async (options) => {
            try {
                const event = await service.createEvent({
                    summary: options.summary,
                    description: options.description,
                    location: options.location,
                    startTime: options.startTime,
                    endTime: options.endTime,
                    attendees: options.attendees,
                });
                return `Event created successfully: ${event.htmlLink}`;
            } catch (error: any) {
                return `Error creating event: ${error.message}`;
            }
        },
        {
            name: "create_calendar_event",
            description: "Create a new event in Google Calendar.",
            schema: z.object({
                summary: z.string().describe("The title of the event"),
                description: z.string().optional().describe("The description of the event"),
                location: z.string().optional().describe("The location of the event"),
                startTime: z.string().describe("ISO string for start time"),
                endTime: z.string().describe("ISO string for end time"),
                attendees: z.array(z.string()).optional().describe("List of attendee emails"),
            }),
        }
    );

    const quickAddTool = tool(
        async ({ text }) => {
            try {
                const event = await service.quickAdd(text);
                return `Event quick-added successfully: ${event.summary} at ${event.start?.dateTime || event.start?.date}`;
            } catch (error: any) {
                return `Error quick-adding event: ${error.message}`;
            }
        },
        {
            name: "quick_add_calendar_event",
            description: "Quickly add an event using natural language (e.g., 'Meeting with John tomorrow at 3pm').",
            schema: z.object({
                text: z.string().describe("The natural language description of the event"),
            }),
        }
    );

    return [listEventsTool, getUpcomingEventsTool, createEventTool, quickAddTool];
}
