"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Clock3, Plus } from "lucide-react";
import { emojis, slotLabel, statusInfo, type Vote } from "@/lib/model";

export const tactileSpring = { type: "spring" as const, stiffness: 360, damping: 25 };

export function AnimatedCount({ value }: { value: number }) {
  const reduced = useReducedMotion();
  return <span className="animated-count" aria-label={String(value)}>
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={value} aria-hidden="true"
        initial={{ y: reduced ? 0 : 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: reduced ? 0 : -12, opacity: 0 }} transition={{ duration: .18 }}>
        {value}
      </motion.span>
    </AnimatePresence>
  </span>;
}

const vibes: Record<string, string> = {
  "🍻": "Barzinho", "🍕": "Pizza", "🔥": "Churrasco",
  "🎬": "Cinema", "🎂": "Aniversário", "🏖️": "Praia",
};

export function VibePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const reduced = useReducedMotion();
  return <fieldset className="emoji-picker">
    <legend>Qual é a boa? <span className="vibe-label">{vibes[value]}</span></legend>
    {emojis.map((emoji) => <motion.button key={emoji} type="button"
      className={value === emoji ? "active" : ""}
      aria-label={`Tema ${emoji}: ${vibes[emoji]}`} aria-pressed={value === emoji}
      onClick={() => onChange(emoji)} whileTap={reduced ? undefined : { scale: .88 }}>
      {value === emoji && <motion.span className="vibe-selection" layoutId="vibe-selection" transition={tactileSpring} />}
      <motion.span className="vibe-icon" key={`${emoji}-${value === emoji}`}
        animate={value === emoji && !reduced ? { rotate: [0, -14, 10, 0], y: [0, -5, 0] } : { rotate: 0, y: 0 }}
        transition={{ duration: .38 }}>{emoji}</motion.span>
    </motion.button>)}
  </fieldset>;
}

const ideas = [
  { title: "Pizza lá em casa", emoji: "🍕", description: "A gente divide a pizza. A conversa fica por conta da casa." },
  { title: "Bora pegar um cinema?", emoji: "🎬", description: "O filme a gente escolhe junto. Pipoca é obrigatória." },
  { title: "Churrasco de domingo", emoji: "🔥", description: "Cada um traz alguma coisa. Quem tem a caixa de som?" },
];
export type RoleIdea = typeof ideas[number];

export function IdeaStarter({ onChoose }: { onChoose: (idea: RoleIdea) => void }) {
  const reduced = useReducedMotion();
  return <div className="idea-starter">
    <p>Tá sem ideia? Puxa uma.</p>
    {ideas.map((idea, index) => <motion.button type="button" key={idea.title}
      aria-label={`Usar ideia: ${idea.title}`} onClick={() => onChoose(idea)}
      initial={{ opacity: 0, x: reduced ? 0 : 12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: .3, delay: reduced ? 0 : index * .07 }}
      whileTap={reduced ? undefined : { scale: .97 }}>
      <span aria-hidden="true">{idea.emoji}</span><span>{idea.title}</span><ArrowUpRight size={17} />
    </motion.button>)}
  </div>;
}

export function VoteChoice({ at, index, value, onChange }: {
  at: string; index: number; value?: Vote; onChange: () => void;
}) {
  const reduced = useReducedMotion();
  return <motion.button className={`slot-choice ${value || "unanswered"}`} onClick={onChange}
    aria-label={`${slotLabel(at, true)} às ${at.slice(11)}: ${value ? statusInfo[value].label : "Sem resposta"}. Clique para alternar.`}
    whileTap={reduced ? undefined : { scale: .98 }}
    initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: .22, delay: Math.min(index * .025, .1) }}>
    <span className="slot-number">{String(index + 1).padStart(2, "0")}</span>
    <span><strong>{slotLabel(at)}</strong><small><Clock3 size={12} />{at.slice(11)}</small></span>
    <span className="vote-answer">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span className="vote-answer-content" key={value || "empty"}
          initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : .9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }}
          transition={{ duration: .12 }}>
          {value === "yes" ? <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <motion.path d="M3 10l4.5 4.5L17 5" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }} transition={{ duration: .22 }} />
          </svg> : value ? <b>{statusInfo[value].symbol}</b> : <Plus size={16} />}
          {value ? statusInfo[value].short : "Escolher"}
        </motion.span>
      </AnimatePresence>
    </span>
  </motion.button>;
}
