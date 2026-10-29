// Sending email: Resend's HTTP API when RESEND_API_KEY and EMAIL_FROM are
// set. In development without them, the email is printed to the server's
// terminal instead, so signing in works with no account anywhere.

type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY and EMAIL_FROM must be set to send email");
    console.log(`\n── Email to ${email.to}: ${email.subject}\n${email.text}\n──\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
