/** Never put credentials in URLs, shared project files, or browser storage. */
export function mcpSetup(projectId: string, origin: string, token: string, shell: "powershell" | "bash") {
  const suffix = projectId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const name = `novastage-${suffix.toLowerCase()}`;
  const env = `NOVASTAGE_${suffix.toUpperCase()}_TOKEN`;
  const endpoint = new URL("/api/mcp", origin).href;
  const quote = (value: string) => shell === "powershell" ? `'${value.replaceAll("'", "''")}'` : `'${value.replaceAll("'", "'\\''")}'`;
  return {
    name,
    codex: `${shell === "powershell" ? `$env:${env} = ${quote(token)}` : `export ${env}=${quote(token)}`}\ncodex mcp add ${name} --url ${quote(endpoint)} --bearer-token-env-var ${env}`,
    claude: `claude mcp add --transport http --scope user ${name} ${quote(endpoint)} --header ${quote(`Authorization: Bearer ${token}`)}`,
  };
}
