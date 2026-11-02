"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  CalendarDays,
  Clock3,
  Copy,
  Plus,
  X,
  Link2,
  Users,
  MapPin,
  Sparkles,
  CheckCheck,
  LockKeyhole,
  BarChart3,
  PartyPopper,
  LoaderCircle,
  Eye,
  CircleHelp,
  Send,
} from "lucide-react";
import { Calendar, Modal, Toast } from "./components";
import { InvitePreview } from "./invite-preview";
import { CreateSteps, LoadingScreen, MobileNav, ThemeToggle } from "./experience";
import {
  counts,
  emojis,
  localDay,
  rankedSlots,
  slotLabel,
  statusInfo,
  type Event,
  type Mutation,
  type Vote,
} from "@/lib/model";

type Tab = "vote" | "results";
type ModalKind = "help" | "share" | "close" | null;
const ease = [0.22, 1, 0.36, 1] as const;
const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.2, ease },
};

function readLocal(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function pulse() {
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    navigator.vibrate?.(8);
}
async function api(id?: string, data?: unknown, credential?: string) {
  const response = await fetch(
    `/api/event${id ? `?id=${encodeURIComponent(id)}` : ""}`,
    {
      method: data ? (id ? "PATCH" : "POST") : "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(12000),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "Não foi possível salvar. Tente novamente.",
    );
  return result as { event: Event; ownerToken?: string; local?: boolean };
}
function makeDemo(): Event {
  const base = new Date();
  base.setDate(base.getDate() + 4);
  const slots = [0, 1, 2].map((n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return { id: `demo-${n}`, at: `${localDay(d)}T19:00` };
  });
  return {
    id: "demo",
    title: "Pizza, papo & nada de pressa",
    organizer: "Bia",
    emoji: "🍕",
    description: "Na casa da Bia. Cada um traz sua bebida e uma história boa.",
    timezone: "America/Sao_Paulo",
    slots,
    participants: [
      {
        id: "a",
        name: "Bia",
        votes: { "demo-0": "yes", "demo-1": "yes", "demo-2": "maybe" },
        rsvp: null,
      },
      {
        id: "b",
        name: "Gui",
        votes: { "demo-0": "maybe", "demo-1": "yes", "demo-2": "no" },
        rsvp: null,
      },
      {
        id: "c",
        name: "Lari",
        votes: { "demo-0": "no", "demo-1": "yes", "demo-2": "yes" },
        rsvp: null,
      },
      {
        id: "d",
        name: "Rafa",
        votes: { "demo-0": "yes", "demo-1": "maybe", "demo-2": "yes" },
        rsvp: null,
      },
    ],
    officialSlot: null,
    createdAt: Date.now(),
    revision: 0,
  };
}

export default function Page() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [owner, setOwner] = useState("");
  const [visitor, setVisitor] = useState("");
  const [myId, setMyId] = useState("");
  const [name, setName] = useState("");
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [tab, setTab] = useState<Tab>("vote");
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);
  const [closeSlot, setCloseSlot] = useState("");
  const [syncError, setSyncError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string>("🍻");
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<Record<string, string[]>>({});
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const closeModal = useCallback(() => setModal(null), []);
  const notify = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => {
      setToast("");
      setCopied(false);
    }, 4200);
  }, []);
  const demo = event?.id === "demo";
  const ranking = useMemo(() => event ? rankedSlots(event) : [], [event]);
  const best = ranking[0];
  const official = event?.slots.find((s) => s.id === event.officialSlot);
  const mine = event?.participants.find((p) => p.id === myId);
  const selectedSlots = days.flatMap((day) =>
    (times[day] || ["19:00"]).map((time) => `${day}T${time}`),
  );
  const timeLabel = (event?.timezone || timezone).replaceAll("_", " ");

  useEffect(() => {
    let active = true;
    async function init() {
      setTimezone(
        Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
      );
      const credential = readLocal("bora:visitor") || token();
      writeLocal("bora:visitor", credential);
      setVisitor(credential);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(credential),
      );
      const identity = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      if (!active) return;
      setMyId(identity);
      setName(readLocal("bora:name") || "");
      const url = new URL(location.href);
      const id = url.searchParams.get("r");
      if (!id) {
        setLoading(false);
        return;
      }
      const fragment = new URLSearchParams(url.hash.slice(1)).get("admin");
      const admin =
        fragment && /^[a-f0-9]{64}$/.test(fragment)
          ? fragment
          : readLocal(`bora:owner:${id}`) || "";
      if (admin) {
        setOwner(admin);
        writeLocal(`bora:owner:${id}`, admin);
      }
      if (url.hash) {
        url.hash = "";
        history.replaceState({}, "", url);
      }
      try {
        const result = await api(id);
        if (!active) return;
        setEvent(result.event);
        setLocalMode(!!result.local);
        const person = result.event.participants.find((p) => p.id === identity);
        if (person) {
          setName(person.name);
          setVotes(person.votes);
          setSaved(true);
        }
        if (result.event.officialSlot) setTab("results");
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível abrir o rolê.",
          );
          setLinkError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    init().catch(() => {
      if (active) {
        setLoading(false);
        setError("Use um navegador atualizado com HTTPS para abrir o Bora.");
        setLinkError(true);
      }
    });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!event || demo) return;
    let alive = true,
      fetching = false;
    const id = event.id;
    async function refresh() {
      if (document.visibilityState !== "visible" || fetching) return;
      fetching = true;
      try {
        const result = await api(id);
        if (alive) {
          setEvent((current) =>
            current?.id === id && result.event.revision >= current.revision
              ? result.event
              : current,
          );
          setSyncError(false);
        }
      } catch {
        if (alive) setSyncError(true);
      } finally {
        fetching = false;
      }
    }
    const interval = setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [event?.id, demo]); // Poll only while visible; never overwrite the visitor's unsaved form.

  function home() {
    if (busy) return;
    history.replaceState({}, "", "/");
    setEvent(null);
    setCreateStep(0);
    setError("");
    setLinkError(false);
    setOwner("");
    setLocalMode(false);
    setVotes({});
    setSaved(false);
    setModal(null);
    setTab("vote");
    setSyncError(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function showDemo() {
    setEvent(makeDemo());
    setTab("results");
    setOwner("demo");
    setVotes({});
    setSaved(false);
    setError("");
    setLocalMode(false);
    history.replaceState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function publicUrl() {
    return `${location.origin}/?r=${event?.id}`;
  }
  async function copy(text: string, privateLink = false) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      pulse();
      notify(
        privateLink
          ? "Link privado copiado. Guarde só para você."
          : "Link copiado! Agora é só mandar no grupo.",
      );
    } catch {
      notify("Não foi possível copiar. Selecione o link e copie manualmente.");
      setModal("share");
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    if (createStep === 0) {
      if (title.trim().length < 2 || !organizer.trim()) {
        setError("Preencha o nome do rolê e quem está chamando.");
        return;
      }
      setCreateStep(1);
      setError("");
      return;
    }
    if (!selectedSlots.length || selectedSlots.length > 12) {
      setError("Escolha de 1 a 12 opções de data e horário.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api(undefined, {
        title,
        organizer,
        description,
        emoji,
        timezone,
        slots: selectedSlots,
      });
      setEvent(result.event);
      setOwner(result.ownerToken || "");
      setLocalMode(!!result.local);
      setTab("vote");
      setVotes({});
      setSaved(false);
      const persisted = writeLocal(
        `bora:owner:${result.event.id}`,
        result.ownerToken!,
      );
      history.replaceState({}, "", `/?r=${result.event.id}`);
      setModal("share");
      if (!persisted)
        notify(
          "Guarde o link privado: este navegador não está salvando sua identificação.",
        );
      else notify("Rolê criado! Bora chamar a galera.");
      // Clipboard may reject after a network request; the dialog always offers a direct click fallback.
      try {
        await navigator.clipboard.writeText(
          `${location.origin}/?r=${result.event.id}`,
        );
        setCopied(true);
        notify("Link copiado! Agora é só mandar no grupo.");
      } catch {
        /* Visible share button remains available. */
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar o rolê.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function mutate(input: Mutation) {
    if (!event || inFlight.current) return;
    if (input.action !== "close" && !name.trim()) {
      setTab("vote");
      setError("Conta seu nome ou apelido primeiro.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      let next: Event;
      if (demo) {
        next = structuredClone(event);
        next.revision++;
        if (input.action === "close") next.officialSlot = input.slotId;
        else {
          let person = next.participants.find((p) => p.id === myId);
          if (!person) {
            person = { id: myId, name: name.trim(), votes: {}, rsvp: null };
            next.participants.push(person);
          }
          person.name = name.trim();
          if (input.action === "vote") person.votes = input.votes;
          else person.rsvp = input.rsvp;
        }
      } else
        next = (
          await api(event.id, input, input.action === "close" ? owner : visitor)
        ).event;
      setEvent((current) =>
        current?.id === next.id && current.revision > next.revision
          ? current
          : next,
      );
      pulse();
      if (input.action === "close") {
        setModal(null);
        setTab("results");
        notify("Tá marcado! Esse rolê vai sair.");
        if (!reduced) {
          try {
            const { default: confetti } = await import("canvas-confetti");
            confetti({
              particleCount: 85,
              spread: 75,
              origin: { y: 0.68 },
              colors: ["#c8f36b", "#b9a4ef", "#fff7d9"],
              disableForReducedMotion: true,
              ticks: 150,
            });
          } catch {
            /* Confirmation never depends on the celebration chunk. */
          }
        }
      } else {
        writeLocal("bora:name", name.trim());
        setSaved(true);
        if (input.action === "vote") {
          setTab("results");
          notify("Resposta salva. Sua galera já pode ver!");
        } else
          notify(
            input.rsvp === "yes"
              ? "Presença confirmada. Bora!"
              : "Resposta salva. Fica para o próximo!",
          );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function cycle(id: string) {
    const order: Vote[] = ["yes", "maybe", "no"];
    setVotes((current) => ({
      ...current,
      [id]: current[id] ? order[(order.indexOf(current[id]) + 1) % 3] : "yes",
    }));
    setSaved(false);
    pulse();
  }
  function setDayTime(day: string, index: number, value: string) {
    setTimes((current) => {
      const values = [...(current[day] || ["19:00"])];
      values[index] = value;
      return { ...current, [day]: values };
    });
  }
  function openClose() {
    setCloseSlot(best?.id || event?.slots[0]?.id || "");
    setModal("close");
  }
  function focusSection(id: string) {
    const section = document.getElementById(id);
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  }
  function selectTab(next: Tab) {
    setTab(next);
    setError("");
    focusSection("event-workspace");
  }
  const spring = { type: "spring" as const, duration: 0.26, bounce: 0.12 };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease }}>
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="site-header" inert={!!modal}>
        <div className="header-inner">
          <button
            className="logo"
            aria-label="Bora! Página inicial"
            onClick={home}
          >
            bora<span>!</span>
            <i />
          </button>
          <span className="header-tag">A vida acontece fora do grupo.</span>
          <nav aria-label="Navegação principal">
            <ThemeToggle />
            <button className="text-button" onClick={() => setModal("help")}>
              Como funciona <ArrowUpRight size={15} />
            </button>
            <button className="header-cta" onClick={event ? home : showDemo}>
              {event ? "Novo rolê" : "Ver demonstração"} <Plus size={16} />
            </button>
          </nav>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1} inert={!!modal}>
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={loading ? "loading" : linkError ? "error" : event?.id || "create"} {...fade}
          onAnimationComplete={() => {
            if (!loading && !modal) document.getElementById("main")?.focus({ preventScroll: true });
          }}>
        {loading ? (
          <LoadingScreen />
        ) : linkError ? (
          <section className="error-page">
            <span className="large-emoji">🫠</span>
            <h1>
              Esse link se perdeu
              <br />
              no caminho.
            </h1>
            <p>{error}</p>
            <button className="primary" onClick={() => location.reload()}>
              Tentar novamente
            </button>
            <button className="secondary" onClick={home}>
              Criar outro rolê
            </button>
          </section>
        ) : !event ? (
          <>
            <section className="intro">
              <div>
                <div className="eyebrow">
                  <span className="tiny-dot" /> MENOS MENSAGENS. MAIS MEMÓRIAS.
                </div>
                <h1>
                  Do “vamos marcar”
                  <br />
                  para{" "}
                  <span>
                    “tô chegando”.
                    <svg viewBox="0 0 380 15" aria-hidden="true">
                      <path d="M3 10 Q175 -3 376 8" />
                    </svg>
                  </span>
                </h1>
                <p>
                  O dia que combina com todo mundo, sem 200 mensagens.
                  <br className="desktop-break" /> Crie o rolê. Mande o link.
                  Encontre sua galera.
                </p>
              </div>
              <div className="intro-note">
                <div className="friends-stack" aria-hidden="true"><span>✌️</span><span>🍕</span><span>🪩</span><i><ArrowUpRight size={20} /></i></div>
                <p>A melhor parte do plano?<br /><strong>Estar junto.</strong></p>
              </div>
            </section>
            <div className="create-layout">
              <section className="create-panel" id="create-workspace" tabIndex={-1}>
                <CreateSteps step={createStep} onBack={() => { setCreateStep(0); setError(""); }} />
                <div className="panel-heading">
                  <div className="section-icon">
                    <CalendarDays size={21} />
                  </div>
                  <div>
                    <h2>{createStep === 0 ? "Qual é o próximo rolê?" : "Quando a gente se vê?"}</h2>
                    <p>{createStep === 0 ? "Comece com uma boa ideia. O resto é com a galera." : "Escolha algumas datas. A galera decide junto."}</p>
                  </div>
                  <span className="pill subtle">SEM CADASTRO</span>
                </div>
                <form onSubmit={create} aria-busy={busy}>
                  <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={createStep} {...fade} onAnimationComplete={() => {
                    if (createStep === 1) focusSection("create-workspace");
                    else document.querySelector<HTMLInputElement>('input[name="event-title"]')?.focus({ preventScroll: true });
                  }}>
                  {createStep === 0 ? <>
                  <fieldset className="emoji-picker">
                    <legend>A vibe do encontro</legend>
                    {emojis.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        aria-label={`Tema ${icon}`}
                        aria-pressed={emoji === icon}
                        className={emoji === icon ? "active" : ""}
                        onClick={() => setEmoji(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </fieldset>
                  <div className="form-row">
                    <label>
                      Nome do rolê <span>*</span>
                      <input
                        name="event-title"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Ex.: Churrasco sem hora pra acabar"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label className="organizer-input">
                      Quem tá chamando? <span>*</span>
                      <input
                        required
                        maxLength={32}
                        autoComplete="given-name"
                        placeholder="Seu nome"
                        value={organizer}
                        onChange={(e) => setOrganizer(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Local ou recado <span className="optional">opcional</span>
                    <textarea
                      maxLength={280}
                      rows={2}
                      placeholder="Onde vai ser? O que a galera precisa saber?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>
                  </> : <>
                  <div className="field-heading">
                    <div>
                      <h3 id="date-step-title" tabIndex={-1}>Dias possíveis</h3>
                      <p>Marque os dias e ajuste os horários.</p>
                    </div>
                    <span className="pill lime-soft">
                      {selectedSlots.length}{" "}
                      {selectedSlots.length === 1 ? "opção" : "opções"}
                    </span>
                  </div>
                  <div className="date-layout">
                    <Calendar days={days} onChange={setDays} />
                    <div className="time-list">
                      <div className="mini-label">
                        <Clock3 size={14} /> HORÁRIOS SUGERIDOS
                      </div>
                      {!days.length && (
                        <div className="empty-times">
                          <CalendarDays size={26} strokeWidth={1.3} />
                          <p>
                            Um dia? Vários dias?
                            <br />
                            Toque nas datas do calendário.
                          </p>
                          <span>Deixa a agenda decidir depois.</span>
                        </div>
                      )}
                      {days.map((day) => (
                        <div className="time-day" key={day}>
                          <div>
                            <strong>{slotLabel(`${day}T12:00`)}</strong>
                            <button
                              type="button"
                              className="icon-button small"
                              aria-label={`Remover ${day}`}
                              onClick={() =>
                                setDays(days.filter((d) => d !== day))
                              }
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {(times[day] || ["19:00"]).map((time, i) => (
                            <div className="time-input" key={i}>
                              <Clock3 size={14} />
                              <input
                                type="time"
                                aria-label={`Horário ${i + 1} de ${day}`}
                                value={time}
                                required
                                onChange={(e) =>
                                  setDayTime(day, i, e.target.value)
                                }
                              />
                              {i > 0 && (
                                <button
                                  type="button"
                                  className="icon-button small"
                                  aria-label="Remover horário"
                                  onClick={() =>
                                    setTimes((t) => ({
                                      ...t,
                                      [day]: t[day].filter((_, j) => j !== i),
                                    }))
                                  }
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          {selectedSlots.length < 12 && (
                            <button
                              type="button"
                              className="add-time"
                              onClick={() =>
                                setTimes((t) => ({
                                  ...t,
                                  [day]: [...(t[day] || ["19:00"]), "20:00"],
                                }))
                              }
                            >
                              <Plus size={12} /> Outro horário
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="timezone-note">
                    <Clock3 size={12} /> Horários em {timeLabel}. Até 12 opções.
                  </p>
                  </>}
                  </motion.div>
                  </AnimatePresence>
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="create-actions">
                  {createStep === 1 && <button type="button" className="secondary step-back" onClick={() => { setCreateStep(0); setError(""); }} aria-label="Voltar para os detalhes do encontro"><ArrowLeft size={19} /></button>}
                  <button
                    type="submit"
                    className="primary create-button"
                    disabled={busy}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={19} />
                    ) : (
                      <Link2 size={19} />
                    )}
                    {busy ? "Preparando o rolê…" : createStep === 0 ? "Escolher as datas" : "Criar rolê e convidar"}
                    <ArrowRight size={19} />
                  </button>
                  </div>
                  <div className="form-foot">
                    <LockKeyhole size={12} /> Sem login. Sem baixar app. Só
                    bora.
                  </div>
                </form>
              </section>
              <InvitePreview emoji={emoji} title={title} description={description}
                organizer={organizer} optionCount={selectedSlots.length} />
            </div>
          </>
        ) : (
          <>
            {demo && (
              <div className="demo-banner">
                <Sparkles size={16} />
                <span>
                  Demonstração interativa · respostas fictícias, sem salvar no
                  servidor.
                </span>
                <button onClick={home}>
                  Criar meu rolê <ArrowRight size={14} />
                </button>
              </div>
            )}
            {localMode && (
              <div className="demo-banner">
                <span>
                  Modo local de desenvolvimento · os dados desaparecem ao
                  reiniciar o servidor.
                </span>
              </div>
            )}
            <button className="back-link" onClick={home}>
              <ArrowLeft size={15} /> Todos os bons planos começam aqui
            </button>
            <section className="event-header">
              <div className="event-emoji">{event.emoji}</div>
              <div className="event-heading">
                <span
                  className={`pill ${official ? "lime-soft" : "purple-soft"}`}
                >
                  <span className="tiny-dot" />
                  {official ? "TÁ MARCADO!" : "COMBINANDO COM A GALERA"}
                </span>
                <h1>{event.title}</h1>
                <p>
                  <span className="host-avatar">
                    {event.organizer[0].toUpperCase()}
                  </span>{" "}
                  {event.organizer} tá chamando{" "}
                  <span className="dot-separator">·</span>{" "}
                  {event.participants.length}{" "}
                  {event.participants.length === 1 ? "resposta" : "respostas"}
                </p>
                {event.description && (
                  <p className="event-description">
                    <MapPin size={16} />
                    <span>{event.description}</span>
                  </p>
                )}
              </div>
              <button
                className="secondary share-event"
                onClick={() =>
                  demo
                    ? notify("Crie um rolê de verdade para gerar o link.")
                    : setModal("share")
                }
              >
                <Link2 size={16} /> Convidar galera
              </button>
            </section>
            <div className="event-layout">
              <section className="voting-panel" id="event-workspace" tabIndex={-1}>
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="Visões do rolê"
                >
                  {(["vote", "results"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      role="tab"
                      id={`tab-${t}`}
                      aria-controls={`panel-${t}`}
                      aria-selected={tab === t}
                      tabIndex={tab === t ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                          e.preventDefault();
                          const next = t === "vote" ? "results" : "vote";
                          setTab(next);
                          document.getElementById(`tab-${next}`)?.focus();
                        }
                      }}
                      onClick={() => {
                        setTab(t);
                        setError("");
                      }}
                    >
                      {tab === t && (
                        <motion.span
                          className="tab-active"
                          layoutId="tabIndicator"
                          transition={spring}
                        />
                      )}
                      {t === "vote" ? (
                        <CalendarDays size={17} />
                      ) : (
                        <BarChart3 size={17} />
                      )}
                      <span>
                        {t === "vote"
                          ? "Sua disponibilidade"
                          : "O que a galera disse"}
                      </span>
                    </button>
                  ))}
                </div>
                {syncError && (
                  <p className="sync-warning" role="status">
                    Sem atualizar no momento. Suas respostas continuam aqui;
                    tentaremos novamente.
                  </p>
                )}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={tab}
                    {...fade}
                    role="tabpanel"
                    tabIndex={-1}
                    id={`panel-${tab}`}
                    aria-labelledby={`tab-${tab}`}
                    onAnimationComplete={() => {
                      if (document.activeElement === document.body && !modal)
                        document.getElementById(`panel-${tab}`)?.focus({ preventScroll: true });
                    }}
                  >
                    {tab === "vote" ? (
                      <div className="vote-content">
                        <div className="section-title">
                          <h2>
                            {official
                              ? "Vai colar nesse rolê?"
                              : "E aí, quando você pode?"}
                          </h2>
                          <p>
                            {official
                              ? "A data tá fechada. Só falta você confirmar."
                              : "Seu voto ajuda o encontro a sair do papel."}
                          </p>
                        </div>
                        <label className="name-field">
                          Seu nome ou apelido
                          <input
                            maxLength={32}
                            autoComplete="given-name"
                            placeholder="Como a galera te chama?"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              setSaved(false);
                            }}
                          />
                        </label>
                        {official ? (
                          <motion.div
                            layout="position"
                            transition={spring}
                            className="rsvp-box"
                          >
                            <CalendarDays size={25} />
                            <h3>{slotLabel(official.at, true)}</h3>
                            <p>
                              Às {official.at.slice(11)} · {timeLabel}
                            </p>
                            <div className="rsvp-actions">
                              <button
                                className={`secondary ${mine?.rsvp === "yes" ? "rsvp-selected" : ""}`}
                                disabled={busy}
                                aria-pressed={mine?.rsvp === "yes"}
                                onClick={() =>
                                  mutate({ action: "rsvp", name, rsvp: "yes" })
                                }
                              >
                                {mine?.rsvp === "yes" && (
                                  <motion.span
                                    layoutId="rsvp-selection"
                                    className="rsvp-indicator yes"
                                    transition={spring}
                                  />
                                )}
                                <Check size={18} /> Vou!
                              </button>
                              <button
                                className={`secondary ${mine?.rsvp === "no" ? "rsvp-no" : ""}`}
                                disabled={busy}
                                aria-pressed={mine?.rsvp === "no"}
                                onClick={() =>
                                  mutate({ action: "rsvp", name, rsvp: "no" })
                                }
                              >
                                {mine?.rsvp === "no" && (
                                  <motion.span
                                    layoutId="rsvp-selection"
                                    className="rsvp-indicator no"
                                    transition={spring}
                                  />
                                )}
                                <X size={18} /> Não vou
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <>
                            <div className="legend">
                              {(Object.keys(statusInfo) as Vote[]).map((v) => (
                                <span key={v}>
                                  <i className={`status-dot ${v}`} />
                                  {statusInfo[v].label}
                                </span>
                              ))}
                            </div>
                            <div className="slot-choices">
                              {event.slots.map((slot, i) => (
                                <button
                                  key={slot.id}
                                  className={`slot-choice ${votes[slot.id] || "unanswered"}`}
                                  onClick={() => cycle(slot.id)}
                                  aria-label={`${slotLabel(slot.at, true)} às ${slot.at.slice(11)}: ${votes[slot.id] ? statusInfo[votes[slot.id]].label : "Sem resposta"}. Clique para alternar.`}
                                >
                                  <span className="slot-number">
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                  <span>
                                    <strong>{slotLabel(slot.at)}</strong>
                                    <small>
                                      <Clock3 size={12} />
                                      {slot.at.slice(11)}
                                    </small>
                                  </span>
                                  <span
                                    className="vote-answer"
                                    key={votes[slot.id] || "empty"}
                                  >
                                    {votes[slot.id] ? (
                                      <>
                                        <b>
                                          {statusInfo[votes[slot.id]].symbol}
                                        </b>
                                        {statusInfo[votes[slot.id]].short}
                                      </>
                                    ) : (
                                      <>
                                        <Plus size={16} /> Escolher
                                      </>
                                    )}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <p className="timezone-note">
                              Clique novamente para mudar a resposta. Horários
                              em {timeLabel}.
                            </p>
                            <button
                              className={`primary save-vote ${saved ? "saved" : ""}`}
                              disabled={
                                busy ||
                                !name.trim() ||
                                !event.slots.every((s) => votes[s.id])
                              }
                              onClick={() =>
                                mutate({ action: "vote", name, votes })
                              }
                            >
                              {busy ? (
                                <LoaderCircle size={18} className="spin" />
                              ) : saved ? (
                                <CheckCheck size={18} />
                              ) : (
                                <Check size={18} />
                              )}
                              {busy
                                ? "Salvando…"
                                : saved
                                  ? "Atualizar minha resposta"
                                  : "Salvar minha disponibilidade"}
                              <ArrowRight size={18} />
                            </button>
                            {!event.slots.every((s) => votes[s.id]) && (
                              <p className="form-foot">
                                Responda todas as datas para salvar.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="results-content">
                        <div className="section-title">
                          <h2>
                            {official
                              ? "Agora é só se encontrar."
                              : "Uma olhada nas agendas."}
                          </h2>
                          <p>
                            {event.participants.length
                              ? "Cada resposta deixa o rolê mais perto."
                              : "O primeiro voto já faz a diferença. Mande o link!"}
                          </p>
                        </div>
                        <div className="legend">
                          {(Object.keys(statusInfo) as Vote[]).map((v) => (
                            <span key={v}>
                              <i className={`status-dot ${v}`} />
                              {statusInfo[v].label}
                            </span>
                          ))}
                        </div>
                        <p className="table-hint"><ArrowRight size={14} /> Deslize a tabela para ver todas as datas</p>
                        <div
                          className="heatmap-scroll"
                          tabIndex={0}
                          aria-label="Tabela de disponibilidade, role horizontalmente para ver todas as datas"
                        >
                          <table className="heatmap">
                            <thead>
                              <tr>
                                <th scope="col">
                                  A galera{" "}
                                  <span>{event.participants.length}</span>
                                </th>
                                {event.slots.map((slot) => (
                                  <th
                                    key={slot.id}
                                    scope="col"
                                    className={
                                      best?.id === slot.id ? "best-column" : ""
                                    }
                                  >
                                    <span>{slotLabel(slot.at)}</span>
                                    <small>{slot.at.slice(11)}</small>
                                    {best?.id === slot.id && (
                                      <span className="best-label">
                                        ★ MAIS VOTADA
                                      </span>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {event.participants.map((person, index) => (
                                <tr key={person.id}>
                                  <th scope="row">
                                    <span
                                      className={`avatar tone-${index % 4}`}
                                    >
                                      {person.name.slice(0, 1).toUpperCase()}
                                    </span>
                                    <span>
                                      {person.name}
                                      {person.id === myId && (
                                        <small> (você)</small>
                                      )}
                                    </span>
                                  </th>
                                  {event.slots.map((slot) => (
                                    <td
                                      key={slot.id}
                                      className={
                                        best?.id === slot.id
                                          ? "best-column"
                                          : ""
                                      }
                                    >
                                      <span
                                        className={`heat-cell ${person.votes[slot.id] || "unanswered"}`}
                                        aria-label={
                                          person.votes[slot.id]
                                            ? statusInfo[person.votes[slot.id]]
                                                .label
                                            : "Sem voto"
                                        }
                                      >
                                        {person.votes[slot.id]
                                          ? statusInfo[person.votes[slot.id]]
                                              .symbol
                                          : "—"}
                                      </span>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th scope="row">Quem pode ir</th>
                                {event.slots.map((slot) => (
                                  <td
                                    key={slot.id}
                                    className={
                                      best?.id === slot.id ? "best-column" : ""
                                    }
                                  >
                                    <strong>
                                      {counts(event, slot.id).yes}
                                    </strong>
                                    <span>/{event.participants.length}</span>
                                  </td>
                                ))}
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {!event.participants.length && (
                          <div className="empty-state">
                            <Users size={30} />
                            <p>As respostas vão aparecer aqui.</p>
                            <button
                              className="text-button"
                              onClick={() => setTab("vote")}
                            >
                              Seja o primeiro a responder{" "}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        )}
                        <div className="results-foot">
                          <span>
                            <i className="tiny-dot" />{" "}
                            {demo
                              ? "Exemplo interativo"
                              : "Atualiza automaticamente a cada 15s"}
                          </span>
                          <span>{timeLabel}</span>
                        </div>
                        {official && (
                          <button
                            className="primary"
                            onClick={() => setTab("vote")}
                          >
                            Confirmar minha presença <ArrowRight size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {error && (
                  <p className="error-message panel-error" role="alert">
                    {error}
                  </p>
                )}
              </section>
              <aside className="results-aside">
                <div className={`best-card ${official ? "official" : ""}`}>
                  <div className="mini-label">
                    {official ? (
                      <PartyPopper size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {official ? "ESSE ROLÊ VAI SAIR" : "TÁ COM CARA DE ROLÊ"}
                  </div>
                  <h2>
                    {official
                      ? "Tá marcado!"
                      : best
                        ? "Temos uma favorita."
                        : "A agenda tá aberta."}
                  </h2>
                  <p>
                    {official
                      ? "Reserva esse espaço na agenda."
                      : best
                        ? "A data com mais “posso!” da galera."
                        : "Assim que a galera responder, a melhor data aparece aqui."}
                  </p>
                  {(official || best) && (
                    <>
                      <div className="best-date">
                        <span>{(official || best)!.at.slice(8, 10)}</span>
                        <div>
                          <strong>
                            {new Date(
                              `${(official || best)!.at}:00Z`,
                            ).toLocaleDateString("pt-BR", {
                              month: "long",
                              timeZone: "UTC",
                            })}
                          </strong>
                          <small>
                            {new Date(
                              `${(official || best)!.at}:00Z`,
                            ).toLocaleDateString("pt-BR", {
                              weekday: "long",
                              timeZone: "UTC",
                            })}{" "}
                            · {(official || best)!.at.slice(11)}
                          </small>
                        </div>
                      </div>
                      <div className="best-attendance">
                        <Users size={16} />
                        <strong>
                          {official
                            ? event.participants.filter((p) => p.rsvp === "yes")
                                .length
                            : best?.yes}
                        </strong>
                        {official
                          ? "presenças confirmadas"
                          : `de ${event.participants.length} podem ir`}
                      </div>
                    </>
                  )}
                  {!official && owner && (
                    <button className="dark-button" onClick={openClose}>
                      Fechar data oficial <ArrowUpRight size={17} />
                    </button>
                  )}
                  {!official && !owner && (
                    <div className="organizer-note">
                      <LockKeyhole size={13} /> {event.organizer} vai fechar a
                      data.
                    </div>
                  )}
                </div>
                {!official && best && (
                  <p className="ranking-note">
                    Empatou? Priorizamos mais “talvez”, depois a data mais
                    próxima. O organizador escolhe a data final.
                  </p>
                )}
                <section className="people-panel">
                  <div className="field-heading">
                    <h3>Quem já respondeu</h3>
                    <span className="pill subtle">
                      {event.participants.length}
                    </span>
                  </div>
                  <div className="people-list">
                    {event.participants.length ? (
                      event.participants.map((p, i) => (
                        <motion.div
                          key={p.id}
                          className="person-chip"
                          initial={{ opacity: 0, y: reduced ? 0 : 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.18,
                            delay: Math.min(i * 0.025, 0.1),
                          }}
                        >
                          <span className={`avatar tone-${i % 4}`}>
                            {p.name[0].toUpperCase()}
                          </span>
                          <span>{p.name}</span>
                          {official ? (
                            <small
                              className={p.rsvp === "yes" ? "text-lime" : ""}
                            >
                              {p.rsvp === "yes"
                                ? "Vou!"
                                : p.rsvp === "no"
                                  ? "Não vai"
                                  : "A confirmar"}
                            </small>
                          ) : (
                            <Check size={14} className="text-lime" />
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <p className="muted">Tá faltando sua galera aqui.</p>
                    )}
                  </div>
                </section>
                {owner && !demo && (
                  <div className="owner-tip">
                    <LockKeyhole size={16} />
                    <p>
                      Você é o organizador.
                      <br />
                      <button
                        className="inline-button"
                        onClick={() => setModal("share")}
                      >
                        Guarde seu link privado.
                      </button>
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
        </motion.div>
        </AnimatePresence>
      </main>
      {!loading && !linkError && <MobileNav inert={!!modal} actions={event ? [
        { label: "Responder", icon: CalendarDays, active: tab === "vote", onClick: () => selectTab("vote") },
        { label: "Resultados", icon: BarChart3, active: tab === "results", onClick: () => selectTab("results") },
        { label: "Convidar", icon: Send, onClick: () => demo ? notify("Crie um rolê de verdade para gerar o link.") : setModal("share") },
      ] : [
        { label: "Criar rolê", icon: Plus, onClick: () => focusSection("create-workspace") },
        { label: "Ver convite", icon: Eye, onClick: () => focusSection("invite-preview") },
        { label: "Como funciona", icon: CircleHelp, onClick: () => setModal("help") },
      ]} />}
      <footer className="site-footer" inert={!!modal}>
        <div>
          <span className="footer-logo">bora!</span>
          <span>Menos desencontro. Mais histórias.</span>
        </div>
        <span>
          Feito para juntar gente. <span className="footer-star">✳</span>
        </span>
      </footer>
      <AnimatePresence>
        {modal && (
          <Modal
            title={
              modal === "help"
                ? "Combinar não precisa ser complicado."
                : modal === "share"
                  ? "O próximo passo é no grupo."
                  : "Bora tirar esse rolê do papel?"
            }
            onClose={closeModal}
          >
            {modal === "help" ? (
              <>
                <p className="modal-description">
                  Sem conta, sem senha e sem instalar nada.
                </p>
                <ol className="help-list">
                  <li>
                    <b>Crie um rolê.</b>
                    <span>Nome, um recado e algumas datas possíveis.</span>
                  </li>
                  <li>
                    <b>Mande o link.</b>
                    <span>
                      Os amigos colocam o apelido e dizem quando podem.
                    </span>
                  </li>
                  <li>
                    <b>Feche a data.</b>
                    <span>
                      O organizador escolhe o dia, e todos confirmam presença.
                    </span>
                  </li>
                </ol>
                <p className="small-note">
                  Quem tem o link público pode ver nomes e respostas. Os rolês
                  expiram após 180 dias. Guarde o link privado para organizar em
                  outro dispositivo.
                </p>
                <button className="primary" onClick={closeModal}>
                  Entendi. Bora! <ArrowRight size={18} />
                </button>
              </>
            ) : modal === "share" ? (
              <>
                <p className="modal-description">
                  Joga o convite no grupo. Cada amigo responde com o próprio
                  apelido.
                </p>
                <label>
                  Link para a galera
                  <input
                    readOnly
                    value={typeof location !== "undefined" ? publicUrl() : ""}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button className="primary" onClick={() => copy(publicUrl())}>
                  {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                  {copied ? "Link copiado!" : "Copiar link do rolê"}
                </button>
                {owner && (
                  <div className="private-link">
                    <div>
                      <LockKeyhole size={17} />
                      <strong>Só seu: link do organizador</strong>
                    </div>
                    <p>
                      Guarde este link para fechar a data em outro dispositivo.
                      Não mande no grupo.
                    </p>
                    <input
                      aria-label="Link privado do organizador"
                      readOnly
                      value={`${publicUrl()}#admin=${owner}`}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      className="secondary"
                      onClick={() =>
                        copy(`${publicUrl()}#admin=${owner}`, true)
                      }
                    >
                      <Copy size={15} /> Copiar meu link privado
                    </button>
                  </div>
                )}
                <p className="small-note">
                  As respostas são identificadas por navegador. Sem cadastro,
                  não há verificação de identidade.
                </p>
              </>
            ) : (
              <>
                <p className="modal-description">
                  Escolha a data oficial. Depois de fechar, a votação termina e
                  a galera confirma se vai.
                </p>
                <label>
                  Data oficial
                  <select
                    value={closeSlot}
                    onChange={(e) => setCloseSlot(e.target.value)}
                  >
                    {event?.slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {slotLabel(s.at)} às {s.at.slice(11)}
                        {s.id === best?.id ? " · Mais votada" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="small-note">
                  Essa escolha é definitiva para este rolê.
                </p>
                {error && (
                  <p role="alert" className="error-message">
                    {error}
                  </p>
                )}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => mutate({ action: "close", slotId: closeSlot })}
                >
                  {busy ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <PartyPopper size={18} />
                  )}{" "}
                  {busy ? "Fechando…" : "É esse dia. Bora!"}
                </button>
              </>
            )}
          </Modal>
        )}
      </AnimatePresence>
      <Toast text={toast} />
    </MotionConfig>
  );
}
