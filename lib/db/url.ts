// Neon's connection strings ask for sslmode=require. pg treats that as
// verify-full today (encrypted, and Neon's certificate checked) but warns on
// every connection that its next major version will follow libpq, where
// require skips the check. Asking for verify-full outright keeps the check
// and the logs quiet.
export function strictSsl(url: string | undefined) {
  return url?.replace(/([?&]sslmode=)(prefer|require|verify-ca)\b/, "$1verify-full");
}
