"use client";

import { useState, type PointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowLeft, ArrowUpRight, CalendarDays, RotateCw } from "lucide-react";
import { slotLabel } from "@/lib/model";
import { AnimatedCount, tactileSpring } from "./interactions";
import { Reveal } from "./experience";

type InvitePreviewProps = {
  emoji: string;
  title: string;
  description: string;
  organizer: string;
  slots: string[];
};

export function InvitePreview({ emoji, title, description, organizer, slots }: InvitePreviewProps) {
  const [back, setBack] = useState(false);
  const reduced = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 180, damping: 24 });
  const rotateY = useSpring(tiltY, { stiffness: 180, damping: 24 });

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    tiltX.set((.5 - (event.clientY - bounds.top) / bounds.height) * 6);
    tiltY.set(((event.clientX - bounds.left) / bounds.width - .5) * 6);
  }

  return <aside className="preview-column" id="invite-preview" tabIndex={-1} aria-label="Prévia do seu convite">
    <Reveal>
      <div className="preview-caption"><span>SEU CONVITE, GANHANDO FORMA</span><span aria-hidden="true">↘</span></div>
      <div className="ticket-stage" onPointerMove={tilt} onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}>
        <motion.div className="invite-card" data-vibe={emoji}
          style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, transformPerspective: 900 }}>
          <div className="ticket-top"><span>CONVITE ABERTO</span><span className="ticket-edition">Nº 001</span></div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={back ? "back" : "front"} className="ticket-face"
              initial={{ opacity: 0, rotateY: reduced ? 0 : -12, x: reduced ? 0 : 10 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={{ opacity: 0, rotateY: reduced ? 0 : 12, x: reduced ? 0 : -10 }}
              transition={{ duration: .2 }}>
              {back ? <div className="ticket-body ticket-back">
                <span className="ticket-overline">ANTES DE MANDAR NO GRUPO</span>
                <h2>Confere aí.</h2>
                <p><b>{title || "Seu encontro"}</b><br />{organizer ? `Quem chama: ${organizer}` : "Falta dizer quem tá chamando."}</p>
                <div className="ticket-dates">
                  {slots.length ? slots.map(at => <div key={at}>
                    <CalendarDays size={15} /><span>{slotLabel(at)}<b>{at.slice(11)}</b></span>
                  </div>) : <p>Escolha os dias na próxima etapa. Eles aparecem aqui.</p>}
                </div>
                <p className="ticket-draft-note">Isso ainda é uma prévia. Depois de criar, é só copiar o link.</p>
              </div> : <div className="ticket-body">
                <div className="ticket-art" aria-hidden="true">
                  <span className="ticket-scrawl">você vem?</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={emoji} className="ticket-emoji"
                      initial={{ opacity: 0, scale: reduced ? 1 : .5, rotate: reduced ? 0 : -22 }}
                      animate={{ opacity: 1, scale: 1, rotate: reduced ? 0 : -7 }}
                      exit={{ opacity: 0, scale: reduced ? 1 : .7, rotate: reduced ? 0 : 15 }}
                      transition={tactileSpring}>{emoji}</motion.span>
                  </AnimatePresence>
                  <span className="ticket-stamp">BORA<br />NESSA</span>
                </div>
                <h2>{title || "Um rolê pra chamar de nosso."}</h2>
                <p>{description || "O lugar, o horário e o resto da história a gente combina."}</p>
                <div className="ticket-info"><CalendarDays size={16} />
                  <span>{slots.length ? <><AnimatedCount value={slots.length} /> {slots.length === 1 ? "data na roda" : "datas na roda"}</> : "Data: vamos decidir juntos"}</span>
                </div>
              </div>}
            </motion.div>
          </AnimatePresence>
          <div className="ticket-bottom"><span>{organizer ? `${organizer} tá chamando` : "De: você · Para: sua galera"}</span><span className="ticket-brand">bora!</span></div>
          <button className="ticket-turn" aria-pressed={back} onClick={() => setBack(!back)}>
            {back ? <ArrowLeft size={16} /> : <RotateCw size={16} />}
            {back ? "Voltar ao convite" : "Virar e conferir"}<ArrowUpRight size={16} />
          </button>
        </motion.div>
      </div>
    </Reveal>
    <Reveal className="invite-postscript">
      <span aria-hidden="true">↳</span><p>O convite acompanha o que você preenche.<br /><b>Vire para conferir as datas antes de enviar.</b></p>
    </Reveal>
  </aside>;
}
