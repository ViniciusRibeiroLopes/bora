import { z } from "zod";

export type Vote = "yes" | "maybe" | "no";
export type Slot = { id: string; at: string };
export type Participant = {
  id: string;
  name: string;
  votes: Record<string, Vote>;
  rsvp: "yes" | "no" | null;
};
export type Event = {
  id: string;
  title: string;
  organizer: string;
  description: string;
  emoji: string;
  timezone: string;
  slots: Slot[];
  participants: Participant[];
  officialSlot: string | null;
  createdAt: number;
  revision: number;
};
export type StoredEvent = Event & { ownerHash: string };
export const emojis = ["🍻", "🍕", "🔥", "🎬", "🎂", "🏖️"] as const;
export const statusInfo = {
  yes: { label: "Posso!", short: "Posso", symbol: "✓" },
  maybe: { label: "Se for o jeito…", short: "Talvez", symbol: "~" },
  no: { label: "Não posso", short: "Não posso", symbol: "×" },
};
export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function slotLabel(at: string, full = false) {
  const date = new Date(`${at}:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: full ? "long" : "short",
    weekday: full ? "long" : "short",
  }).format(date);
}
export function counts(event: Event, id: string) {
  return event.participants.reduce(
    (a, p) => {
      const v = p.votes[id];
      if (v) a[v]++;
      return a;
    },
    { yes: 0, maybe: 0, no: 0 },
  );
}
/** Positivos primeiro; empate: mais "talvez", depois data cronológica. Sem votos, sem vencedor. */
export function rankedSlots(event: Event) {
  if (!event.participants.length) return [];
  return event.slots
    .map((slot) => ({ ...slot, ...counts(event, slot.id) }))
    .sort(
      (a, b) => b.yes - a.yes || b.maybe - a.maybe || a.at.localeCompare(b.at),
    );
}

function validWallDate(value: string) {
  const date = new Date(`${value}:00Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 16) === value
  );
}
export const createSchema = z
  .object({
    title: z.string().trim().min(2).max(80),
    organizer: z.string().trim().min(1).max(32),
    description: z.string().trim().max(280).default(""),
    emoji: z.enum(emojis),
    timezone: z
      .string()
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("pt-BR", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }),
    slots: z
      .array(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
          .refine(validWallDate),
      )
      .min(1)
      .max(12),
  })
  .refine((v) => new Set(v.slots).size === v.slots.length, "Datas repetidas");
export const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("vote"),
    name: z.string().trim().min(1).max(32),
    votes: z.record(z.string(), z.enum(["yes", "maybe", "no"])),
  }),
  z.object({
    action: z.literal("rsvp"),
    name: z.string().trim().min(1).max(32),
    rsvp: z.enum(["yes", "no"]),
  }),
  z.object({ action: z.literal("close"), slotId: z.string().uuid() }),
]);
export type Mutation = z.infer<typeof mutationSchema>;
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Pure transition, shared by persistence and tests; authorization is enforced again on every CAS retry. */
export function transition(
  event: StoredEvent,
  input: Mutation,
  identity: string,
): StoredEvent {
  const next = structuredClone(event);
  if (input.action === "close") {
    if (identity !== next.ownerHash)
      throw new AppError("Só o organizador pode fechar a data.", 403);
    if (next.officialSlot) throw new AppError("A data já foi definida.", 409);
    if (!next.slots.some((s) => s.id === input.slotId))
      throw new AppError("Data inválida.");
    next.officialSlot = input.slotId;
  } else {
    let person = next.participants.find((p) => p.id === identity);
    if (!person) {
      if (next.participants.length >= 100)
        throw new AppError("Este rolê atingiu 100 participantes.", 409);
      person = { id: identity, name: input.name, votes: {}, rsvp: null };
      next.participants.push(person);
    }
    if (input.action === "vote") {
      if (next.officialSlot)
        throw new AppError("A votação terminou. Confirme sua presença!", 409);
      if (
        Object.keys(input.votes).length !== next.slots.length ||
        !next.slots.every((s) => input.votes[s.id])
      )
        throw new AppError("Responda todas as datas.");
      person.votes = input.votes;
    } else {
      if (!next.officialSlot)
        throw new AppError("Aguarde a definição da data.", 409);
      person.rsvp = input.rsvp;
    }
    person.name = input.name;
  }
  next.revision++;
  return next;
}
export function publicEvent(stored: StoredEvent): Event {
  const { ownerHash: _private, ...event } = stored;
  return event;
}
