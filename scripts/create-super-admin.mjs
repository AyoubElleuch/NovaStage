import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Please ensure .env.local has valid Supabase credentials.");
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }

  return parsed;
}

const args = parseArgs();
const email = args.email?.trim().toLowerCase();
const password = args.password?.trim();
const name = args.name?.trim() || "NovaStage Super Admin";
const role = args.role?.trim() || "super_admin";

if (!email || !password) {
  console.log(`
NovaStage Super Admin Creation Tool
====================================
Usage:
  npm run admin:create -- --email <email> --password <password> [--name "<name>"] [--role "<role>"]

Example:
  npm run admin:create -- --email admin@novastage.dev --password SecurePassword123! --name "Admin Lead"
`);
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Error: Invalid email format.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Error: Password must be at least 8 characters long.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log(`\nConfiguring ${role} user for: ${email}...`);

  // 1. Check if user already exists in auth.users
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error(`Failed to query users: ${listError.message}`);
    process.exit(1);
  }

  const existingUser = userList.users.find((u) => u.email?.toLowerCase() === email);

  let userId;

  if (existingUser) {
    console.log(`User already exists in Supabase Auth (ID: ${existingUser.id}). Updating credentials and privileges...`);
    userId = existingUser.id;

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: role,
      },
    });

    if (updateError) {
      console.error(`Failed to update user in auth: ${updateError.message}`);
      process.exit(1);
    }
  } else {
    console.log("Creating new user in Supabase Auth...");
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: role,
      },
    });

    if (createError || !newUser.user) {
      console.error(`Failed to create user in auth: ${createError?.message || "Unknown error"}`);
      process.exit(1);
    }

    userId = newUser.user.id;
  }

  // 2. Ensure profile exists and has role set to super_admin
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name: name,
      role: role,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (profileError) {
    console.error(`Warning: User created in Auth, but profile update failed: ${profileError.message}`);
  }

  // 3. Assign role in public.user_roles junction table
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({
      user_id: userId,
      role_id: role,
      assigned_at: new Date().toISOString(),
    }, { onConflict: "user_id,role_id" });

  if (roleError) {
    console.error(`Warning: Role assignment in user_roles failed: ${roleError.message}`);
  }

  console.log("\n========================================");
  console.log(`SUCCESS: ${role.toUpperCase()} configured!`);
  console.log(`Email:    ${email}`);
  console.log(`Role:     ${role}`);
  console.log(`User ID:  ${userId}`);
  console.log("========================================");
  console.log("\nYou can now sign in at http://localhost:3000/login (select 'Log in').");
  console.log("Admins are automatically routed to /admin.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
