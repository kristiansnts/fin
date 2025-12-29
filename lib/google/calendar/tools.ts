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

    const deleteEventTool = tool(
        async ({ eventId }) => {
            try {
                await service.deleteEvent(eventId);
                return `Event deleted successfully.`;
            } catch (error: any) {
                return `Error deleting event: ${error.message}`;
            }
        },
        {
            name: "delete_calendar_event",
            description: "Delete a calendar event by its ID.",
            schema: z.object({
                eventId: z.string().describe("The ID of the event to delete"),
            }),
        }
    );

    const updateEventTool = tool(
        async (options) => {
            try {
                const event = await service.updateEvent({
                    eventId: options.eventId,
                    summary: options.summary,
                    description: options.description,
                    location: options.location,
                    startTime: options.startTime,
                    endTime: options.endTime,
                    attendees: options.attendees,
                });
                return `Event updated successfully: ${event.htmlLink}`;
            } catch (error: any) {
                return `Error updating event: ${error.message}`;
            }
        },
        {
            name: "update_calendar_event",
            description: "Update an existing calendar event. Provide the event ID and the fields you want to change.",
            schema: z.object({
                eventId: z.string().describe("The ID of the event to update"),
                summary: z.string().optional().describe("The new title of the event"),
                description: z.string().optional().describe("The new description of the event"),
                location: z.string().optional().describe("The new location of the event"),
                startTime: z.string().optional().describe("ISO string for new start time"),
                endTime: z.string().optional().describe("ISO string for new end time"),
                attendees: z.array(z.string()).optional().describe("List of attendee emails"),
            }),
        }
    );

    const bulkCreateEventsTool = tool(
        async ({ events }) => {
            try {
                const results = [];
                for (const eventData of events) {
                    const event = await service.createEvent({
                        summary: eventData.summary,
                        description: eventData.description,
                        location: eventData.location,
                        startTime: eventData.startTime,
                        endTime: eventData.endTime,
                        attendees: eventData.attendees,
                    });
                    results.push({ success: true, summary: eventData.summary, link: event.htmlLink });
                }
                return `Successfully created ${results.length} events:\n${results.map(r => `- ${r.summary}: ${r.link}`).join('\n')}`;
            } catch (error: any) {
                return `Error in bulk create: ${error.message}`;
            }
        },
        {
            name: "bulk_create_calendar_events",
            description: "Create multiple calendar events at once. Useful for batch scheduling.",
            schema: z.object({
                events: z.array(z.object({
                    summary: z.string().describe("The title of the event"),
                    description: z.string().optional().describe("The description of the event"),
                    location: z.string().optional().describe("The location of the event"),
                    startTime: z.string().describe("ISO string for start time"),
                    endTime: z.string().describe("ISO string for end time"),
                    attendees: z.array(z.string()).optional().describe("List of attendee emails"),
                })).describe("Array of events to create"),
            }),
        }
    );

    const bulkUpdateEventsTool = tool(
        async ({ updates }) => {
            try {
                const results = [];
                for (const updateData of updates) {
                    const event = await service.updateEvent({
                        eventId: updateData.eventId,
                        summary: updateData.summary,
                        description: updateData.description,
                        location: updateData.location,
                        startTime: updateData.startTime,
                        endTime: updateData.endTime,
                        attendees: updateData.attendees,
                    });
                    results.push({ success: true, eventId: updateData.eventId, link: event.htmlLink });
                }
                return `Successfully updated ${results.length} events.`;
            } catch (error: any) {
                return `Error in bulk update: ${error.message}`;
            }
        },
        {
            name: "bulk_update_calendar_events",
            description: "Update multiple calendar events at once. Provide array of event IDs with their updates.",
            schema: z.object({
                updates: z.array(z.object({
                    eventId: z.string().describe("The ID of the event to update"),
                    summary: z.string().optional().describe("The new title of the event"),
                    description: z.string().optional().describe("The new description of the event"),
                    location: z.string().optional().describe("The new location of the event"),
                    startTime: z.string().optional().describe("ISO string for new start time"),
                    endTime: z.string().optional().describe("ISO string for new end time"),
                    attendees: z.array(z.string()).optional().describe("List of attendee emails"),
                })).describe("Array of event updates"),
            }),
        }
    );

    const bulkDeleteEventsTool = tool(
        async ({ eventIds }) => {
            try {
                const results = [];
                for (const eventId of eventIds) {
                    await service.deleteEvent(eventId);
                    results.push({ success: true, eventId });
                }
                return `Successfully deleted ${results.length} events.`;
            } catch (error: any) {
                return `Error in bulk delete: ${error.message}`;
            }
        },
        {
            name: "bulk_delete_calendar_events",
            description: "Delete multiple calendar events at once. Provide array of event IDs.",
            schema: z.object({
                eventIds: z.array(z.string()).describe("Array of event IDs to delete"),
            }),
        }
    );

    return [
        listEventsTool,
        getUpcomingEventsTool,
        createEventTool,
        quickAddTool,
        deleteEventTool,
        updateEventTool,
        bulkCreateEventsTool,
        bulkUpdateEventsTool,
        bulkDeleteEventsTool
    ];
}
