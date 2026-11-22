import { Database } from "bun:sqlite";
import { schemaSql as authSchema, migrate as migrateAuth } from "./auth/discord/schema";
import { schemaSql as commentsSchema } from "./comments/schema";
import { schemaSql as spotifySchema } from "./spotify/schema";
import { schemaSql as statusSchema } from "./status/schema";

const dbPath = () => {
  return process.env.DB_PATH ?? "./data/main.db";
};

export const db = new Database(dbPath());

db.run([authSchema, commentsSchema, spotifySchema, statusSchema].join("\n"));
 migrateAuth(db);
