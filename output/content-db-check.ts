import postgres from "postgres";
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
console.log(JSON.stringify([...await client`SELECT count(*)::int AS applied, max(created_at)::text AS latest FROM drizzle.__drizzle_migrations`]));
console.log(JSON.stringify([...await client`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('articles', 'announcements', 'map_layers', 'email_templates')`]));
await client.end();
