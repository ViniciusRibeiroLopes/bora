"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Moon, Sun, type LucideIcon } from "lucide-react";

export const gentleTransition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "dark");
    const preference = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      try { if (localStorage.getItem("bora:theme")) return; } catch { /* Session only. */ }
      const next = preference.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  return (
    <button className="icon-button theme-toggle"
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        setTheme(next);
        try { localStorage.setItem("bora:theme", next); } catch { /* Session only. */ }
      }}>
      <Sun size={19} className="theme-sun" /><Moon size={19} className="theme-moon" />
    </button>
  );
}

/** One observer per section, no scroll listeners or continuously animated layers. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className}
    initial={{ opacity: 0, y: reduced ? 0 : 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={gentleTransition}>{children}</motion.div>;
}

export function CreateSteps({ step, onBack }: { step: number; onBack: () => void }) {
  return <ol className="create-steps" aria-label="Etapas da criação">
    {["O encontro", "Data e hora", "Compartilhar"].map((label, index) => (
      <li key={label} aria-current={step === index ? "step" : undefined}
        className={index < step ? "complete" : ""}>
        {step === index && <motion.i className="step-line" layoutId="creation-step" transition={gentleTransition} aria-hidden="true" />}
        {index === 0 && step > 0 ? (
          <button type="button" onClick={onBack} aria-label="Voltar para O encontro">
            <span><Check size={14} /></span>{label}
          </button>
        ) : <><span>{String(index + 1).padStart(2, "0")}</span>{label}</>}
      </li>
    ))}
  </ol>;
}

export type NavAction = { label: string; icon: LucideIcon; onClick: () => void; active?: boolean };
export function MobileNav({ actions, inert }: { actions: NavAction[]; inert?: boolean }) {
  return <nav className="mobile-nav" aria-label="Atalhos do aplicativo" inert={inert}>
    {actions.map(({ label, icon: Icon, onClick, active }) => (
      <button key={label} onClick={onClick} aria-current={active ? "page" : undefined}>
        {active && <motion.span className="mobile-nav-indicator" layoutId="mobile-nav" transition={gentleTransition} />}
        <Icon size={21} strokeWidth={active ? 2.2 : 1.7} /><span>{label}</span>
      </button>
    ))}
  </nav>;
}

export function LoadingScreen() {
  return <div className="loading" role="status" aria-label="Carregando rolê">
    <div aria-hidden="true">
      <div className="skeleton skeleton-eyebrow" /><div className="skeleton title-skeleton" />
      <div className="loading-grid">
        <div className="skeleton-panel"><div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-input" /><div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-calendar" /><div className="skeleton skeleton-input" />
        </div><div className="skeleton skeleton-ticket" />
      </div>
    </div><p>Preparando os bons planos…</p>
  </div>;
}
