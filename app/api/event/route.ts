import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AppError,
  createSchema,
  mutationSchema,
  publicEvent,
  transition,
  type StoredEvent,
} from "@/lib/model";
import {
  hash,
  isLocalMemory,
  rateLimit,
  readEvent,
  saveNew,
  updateEvent,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
function fail(error: unknown) {
  return json(
    {
      error:
        error instanceof AppError
          ? error.message
          : "Não foi possível concluir. Tente novamente.",
    },
    error instanceof AppError ? error.status : 500,
  );
}
function idFrom(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!uuid.test(id)) throw new AppError("Link de rolê inválido.", 400);
  return id;
}
function ipFrom(req: NextRequest) {
  // Vercel sets x-real-ip; do not use user-supplied X-Forwarded-For as an identity.
  return process.env.VERCEL
    ? req.headers.get("x-real-ip") || "unknown"
    : "local";
}
async function bodyFrom(req: NextRequest) {
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== req.nextUrl.origin
  )
    throw new AppError("Origem inválida.", 403);
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("Envie JSON.", 415);
  if (Number(req.headers.get("content-length") || 0) > 10000)
    throw new AppError("Dados muito grandes.", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new AppError("Dados inválidos.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 10000) {
      await reader.cancel();
      throw new AppError("Dados muito grandes.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("JSON inválido.");
  }
}
export async function GET(req: NextRequest) {
  try {
    const id = idFrom(req);
    await rateLimit(ipFrom(req), "read", 600);
    return json({
      event: publicEvent(await readEvent(id)),
      local: isLocalMemory(),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    await rateLimit(ipFrom(req), "create", 10);
    const parsed = createSchema.safeParse(await bodyFrom(req));
    if (!parsed.success)
      throw new AppError("Confira o nome, organizador e até 12 datas válidas.");
    const data = parsed.data;
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: data.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date())
      .replace(" ", "T");
    if (
      data.slots.some(
        (at) =>
          at <= parts || Number(at.slice(0, 4)) > new Date().getFullYear() + 2,
      )
    )
      throw new AppError(
        "Escolha datas futuras, dentro dos próximos dois anos.",
      );
    const ownerToken = randomBytes(32).toString("hex");
    const event: StoredEvent = {
      ...data,
      id: randomUUID(),
      slots: data.slots.sort().map((at) => ({ id: randomUUID(), at })),
      ownerHash: hash(ownerToken),
      participants: [],
      officialSlot: null,
      createdAt: Date.now(),
      revision: 0,
    };
    await saveNew(event);
    return json(
      { event: publicEvent(event), ownerToken, local: isLocalMemory() },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    const id = idFrom(req);
    await rateLimit(ipFrom(req), "write", 40);
    const token =
      req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new AppError("Identificação inválida. Recarregue a página.", 401);
    const parsed = mutationSchema.safeParse(await bodyFrom(req));
    if (!parsed.success)
      throw new AppError("Confira sua resposta e tente novamente.");
    const updated = await updateEvent(id, (event) =>
      transition(event, parsed.data, hash(token)),
    );
    return json({ event: publicEvent(updated) });
  } catch (error) {
    return fail(error);
  }
}
