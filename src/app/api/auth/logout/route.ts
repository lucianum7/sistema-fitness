import { jsonOk } from "@/lib/server/api";
import { clearSessionCookie } from "@/lib/server/session";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ signedOut: true });
}
