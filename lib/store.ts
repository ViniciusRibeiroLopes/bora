import { createHash } from "node:crypto";
import { AppError, type StoredEvent } from "./model";

// REST works in Vercel functions. No persistent sockets, SDK or database migration required.
const TTL = 180 * 24 * 60 * 60;
type Memory = Map<string, { value: string; expires: number }>;
const globalStore = globalThis as typeof globalThis & { boraMemory?: Memory };
const memory = (globalStore.boraMemory ??= new Map());
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function isLocalMemory() {
  return (
    process.env.BORA_DEV_MEMORY === "1" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL
  );
}
function localGet(key: string) {
  const item = memory.get(key);
  if (!item || item.expires <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return item.value;
}
async function redis<T>(command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token)
    throw new AppError(
      "O armazenamento ainda não foi configurado. Configure o Redis para compartilhar rolês.",
      503,
    );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new AppError(
      "Não foi possível acessar os rolês. Tente novamente.",
      503,
    );
  const data = await response.json();
  if (data.error)
    throw new AppError(
      "O armazenamento está indisponível. Tente novamente.",
      503,
    );
  return data.result as T;
}
export async function rateLimit(ip: string, action: string, limit: number) {
  const key = `bora:limit:${hash(ip)}:${action}:${Math.floor(Date.now() / 60000)}`;
  let count: number;
  if (isLocalMemory()) {
    // Bound local development memory, including expired limiter buckets.
    for (const [k, v] of memory) if (v.expires <= Date.now()) memory.delete(k);
    count = Number(localGet(key) || 0) + 1;
    memory.set(key, { value: String(count), expires: Date.now() + 65000 });
  } else {
    count = await redis<number>([
      "EVAL",
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],65) end; return n",
      1,
      key,
    ]);
  }
  if (count > limit)
    throw new AppError(
      "Muitas tentativas. Espere um minuto e tente de novo.",
      429,
    );
}
export async function readEvent(id: string) {
  const key = `bora:event:${id}`;
  const raw = isLocalMemory()
    ? localGet(key)
    : await redis<string | null>(["GET", key]);
  if (!raw) throw new AppError("Rolê não encontrado ou expirado.", 404);
  return JSON.parse(raw) as StoredEvent;
}
export async function saveNew(event: StoredEvent) {
  const key = `bora:event:${event.id}`,
    value = JSON.stringify(event);
  if (isLocalMemory())
    memory.set(key, { value, expires: Date.now() + TTL * 1000 });
  else if (
    (await redis<string | null>(["SET", key, value, "EX", TTL, "NX"])) !== "OK"
  )
    throw new AppError("Tente gerar o rolê novamente.", 409);
}
/** Optimistic concurrency: no lost votes when simultaneous visitors update the same event. */
export async function updateEvent(
  id: string,
  mutate: (event: StoredEvent) => StoredEvent,
) {
  const key = `bora:event:${id}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const before = await readEvent(id);
    const after = mutate(before);
    const oldValue = JSON.stringify(before),
      newValue = JSON.stringify(after);
    if (isLocalMemory()) {
      const current = localGet(key);
      if (current === oldValue) {
        memory.set(key, { value: newValue, expires: memory.get(key)!.expires });
        return after;
      }
    } else {
      const changed = await redis<number>([
        "EVAL",
        "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'KEEPTTL'); return 1 else return 0 end",
        1,
        key,
        oldValue,
        newValue,
      ]);
      if (changed === 1) return after;
    }
  }
  throw new AppError(
    "O rolê recebeu várias respostas juntas. Tente salvar novamente.",
    409,
  );
}
