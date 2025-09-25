import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

// Type for our Drizzle database instance
export type Database = DrizzleD1Database<typeof schema>;

/**
 * Initialize Drizzle ORM with D1 database
 */
export function createDatabase(env: Env): Database {
  return drizzle(env.WEBCAM_DB, { schema });
}

/**
 * Get a database instance from the environment
 * This is the main function to use throughout the application
 */
export function getDatabase(env: Env): Database {
  return createDatabase(env);
}
