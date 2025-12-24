import { getPostgresClient } from "./client";
import { TableColumn, TableSummary } from "./types";

export class PostgresService {
    /**
     * Execute a raw SQL query safely.
     */
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        const client = await getPostgresClient();
        try {
            const res = await client.query(sql, params);
            return res.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Get all table names in the public schema.
     */
    async getTableNames(): Promise<string[]> {
        const sql = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `;
        const rows = await this.query<{ table_name: string }>(sql);
        return rows.map((r) => r.table_name);
    }

    /**
     * Get the schema for a specific table.
     */
    async getTableSchema(tableName: string): Promise<TableColumn[]> {
        const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
        return this.query<TableColumn>(sql, [tableName]);
    }

    /**
     * Get a summary of all tables and their columns.
     */
    async getDatabaseSummary(): Promise<TableSummary[]> {
        const tables = await this.getTableNames();
        const summary = await Promise.all(
            tables.map(async (table) => {
                const columns = await this.getTableSchema(table);
                return {
                    table,
                    columns: columns.map((c) => `${c.column_name} (${c.data_type})`),
                };
            })
        );
        return summary;
    }
}

// Export a singleton instance
export const postgresService = new PostgresService();
