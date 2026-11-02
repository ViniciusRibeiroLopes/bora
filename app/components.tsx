"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { localDay } from "@/lib/model";

export function Calendar({
  days,
  onChange,
}: {
  days: string[];
  onChange: (days: string[]) => void;
}) {
  const reduced = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const today = localDay(new Date());
  const leading = (month.getDay() + 6) % 7;
  const length = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  function move(offset: number) {
    setDirection(offset);
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }
  function arrow(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const root = event.currentTarget.closest(".calendar");
    root
      ?.querySelector<HTMLButtonElement>(
        `[data-day="${index + offsets[event.key]}"]`,
      )
      ?.focus();
  }
  return (
    <div className="calendar">
      <div className="calendar-head">
        <button
          type="button"
          className="icon-button"
          aria-label="Mês anterior"
          disabled={
            month <=
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong aria-live="polite">
          {month.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Próximo mês"
          disabled={
            month.getFullYear() >= new Date().getFullYear() + 2 &&
            month.getMonth() === 11
          }
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
      <motion.div className="calendar-grid" key={month.toISOString()}
        initial={{ opacity: 0, x: reduced ? 0 : direction * 15 }}
        animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
        transition={{ duration: .16 }}>
        {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const day = localDay(
            new Date(month.getFullYear(), month.getMonth(), i + 1),
          );
          const selected = days.includes(day);
          return (
            <button
              type="button"
              key={day}
              data-day={i}
              className={`day ${selected ? "selected" : ""} ${day === today ? "today" : ""}`}
              disabled={day < today || (!selected && days.length >= 12)}
              aria-pressed={selected}
              aria-label={`${i + 1} de ${month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
              onKeyDown={(e) => arrow(e, i)}
              onClick={() =>
                onChange(
                  selected
                    ? days.filter((d) => d !== day)
                    : [...days, day].sort(),
                )
              }
            >
              <AnimatePresence initial={false}>
                {selected && <motion.span className="day-fill" aria-hidden="true"
                  initial={{ scale: reduced ? 1 : .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: reduced ? 1 : .65, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }} />}
              </AnimatePresence>
              <span className="day-label">{i + 1}</span>
            </button>
          );
        })}
      </motion.div>
      </AnimatePresence>
      <div className="calendar-foot">
        <span>
          <i className="tiny-dot" /> Escolha quantos dias quiser
        </span>
        <span>{days.length}/12</span>
      </div>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, a[href], select, textarea, [tabindex="0"]',
        ) || [],
      ).filter((node) => node.getClientRects().length > 0);
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      const target = previous?.isConnected ? previous : document.getElementById("main");
      target?.focus({ preventScroll: true });
    };
  }, [onClose]);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
        drag={reduce ? false : "y"}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 && matchMedia("(max-width: 899px)").matches) onClose();
        }}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", duration: 0.28, bounce: 0.12 }}
      >
        <button
          className="sheet-handle"
          aria-label="Fechar painel; você também pode arrastar para baixo"
          onPointerDown={(event) => { if (!reduce) dragControls.start(event); }}
          onClick={onClose}
        ><span /></button>
        <button
          className="icon-button modal-x"
          aria-label="Fechar janela"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      <AnimatePresence>
        {text && (
          <motion.div
            className="toast"
            key={text}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
