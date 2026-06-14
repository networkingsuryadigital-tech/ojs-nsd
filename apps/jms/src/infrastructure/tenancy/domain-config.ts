import "server-only";

export function getCnameTarget(): string {
  const explicit = process.env.JMS_CNAME_TARGET?.trim();
  if (explicit) {
    return explicit.toLowerCase().replace(/\.$/, "");
  }
  return "cname.jms.nsd.id";
}
