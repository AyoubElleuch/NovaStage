import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to scrub a production database.");
}

if (process.argv[2] !== "--confirm") {
  console.error("This permanently deletes all rows from public tables.");
  console.error("Run: npm run db:scrub -- --confirm");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Keep this list synchronized with public tables in supabase/migrations.
// Never add auth.users or any other table in the auth schema here.
const tables = [
  { name: "project_members", requiredColumn: "project_id" },
  { name: "projects", requiredColumn: "id" },
  { name: "user_roles", requiredColumn: "role_id" },
  { name: "role_permissions", requiredColumn: "role_id" },
  { name: "profiles", requiredColumn: "id" },
  { name: "waitlist", requiredColumn: "email" },
  { name: "roles", requiredColumn: "id" },
  { name: "permissions", requiredColumn: "id" },
];

for (const table of tables) {
  const { error } = await supabase
    .from(table.name)
    .delete()
    .not(table.requiredColumn, "is", null);

  if (error) {
    throw new Error(`Failed to scrub ${table.name}: ${error.message}`);
  }
}

console.log("Development database scrubbed. Supabase auth.users was preserved.");
