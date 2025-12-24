import { tool } from "langchain";
import { z } from "zod";
import { postgresService } from "./service";

/**
 * Tool to list all tables in the database.
 */
export const listTablesTool = tool(
    async () => {
        try {
            const tables = await postgresService.getTableNames();
            return JSON.stringify(tables, null, 2);
        } catch (error: any) {
            return `Error listing tables: ${error.message}`;
        }
    },
    {
        name: "list_tables",
        description: "List all tables available in the database to understand the data structure.",
        schema: z.object({}),
    }
);

/**
 * Tool to get the schema of a specific table.
 */
export const getTableSchemaTool = tool(
    async ({ tableName }) => {
        try {
            const schema = await postgresService.getTableSchema(tableName);
            return JSON.stringify(schema, null, 2);
        } catch (error: any) {
            return `Error getting schema for table ${tableName}: ${error.message}`;
        }
    },
    {
        name: "get_table_schema",
        description: "Get the column names and data types for a specific table.",
        schema: z.object({
            tableName: z.string().describe("The name of the table to inspect"),
        }),
    }
);

/**
 * Tool to execute a raw SQL query.
 */
export const executeQueryTool = tool(
    async ({ sql }) => {
        try {
            const results = await postgresService.query(sql);
            return JSON.stringify(results, null, 2);
        } catch (error: any) {
            return `Error executing query: ${error.message}`;
        }
    },
    {
        name: "execute_query",
        description: "Execute a raw SQL query on the PostgreSQL database. Use this to fetch data or perform analysis.",
        schema: z.object({
            sql: z.string().describe("The SQL query to execute. Be careful with write operations."),
        }),
    }
);

/**
 * Tool to get a summary of the entire database.
 */
export const getDatabaseSummaryTool = tool(
    async () => {
        try {
            const summary = await postgresService.getDatabaseSummary();
            return JSON.stringify(summary, null, 2);
        } catch (error: any) {
            return `Error getting database summary: ${error.message}`;
        }
    },
    {
        name: "get_database_summary",
        description: "Get a summary of all tables and their columns in the database. Useful for getting an overview of available data.",
        schema: z.object({}),
    }
);

/**
 * Export all postgres tools as an array for easy use with LangChain agents.
 */
export const postgresTools = [
    listTablesTool,
    getTableSchemaTool,
    executeQueryTool,
    getDatabaseSummaryTool,
];
