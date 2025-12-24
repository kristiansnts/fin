import pg from "pg";

const connectionString = process.env.NEXT_PUBLIC_DB_URI;

if (!connectionString) {
    throw new Error("NEXT_PUBLIC_DB_URI is not defined");
}

let pool: pg.Pool | null = null;

/**
 * Returns a singleton PostgreSQL connection pool.
 */
export function getPostgresPool() {
    if (!pool) {
        pool = new pg.Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            // In development, you might want more verbose logging
        });

        pool.on("error", (err) => {
            console.error("Unexpected error on idle PostgreSQL client", err);
        });
    }
    return pool;
}

/**
 * Helper to get a client from the pool.
 */
export async function getPostgresClient() {
    const p = getPostgresPool();
    return await p.connect();
}
