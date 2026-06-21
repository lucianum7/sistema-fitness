import { handleRouteError } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { buildDataExportJson } from "@/lib/server/pdf-exports";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    const file = await buildDataExportJson(user.id);
    return new Response(new Uint8Array(file.buffer), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${file.filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
