"use client";

import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import { Reveal } from "./experience";

type InvitePreviewProps = {
  emoji: string;
  title: string;
  description: string;
  organizer: string;
  optionCount: number;
};

export function InvitePreview({ emoji, title, description, organizer, optionCount }: InvitePreviewProps) {
  return (
              <aside className="preview-column" id="invite-preview" tabIndex={-1} aria-label="Prévia do seu convite">
                <Reveal>
                <div className="preview-caption">
                  <span className="tiny-dot" /> UMA PRÉVIA DO QUE VEM AÍ{" "}
                  <span>↘</span>
                </div>
                <div className="invite-card">
                  <div className="ticket-top">
                    <span>VOCÊ TEM UM ROLÊ.</span>
                    <ArrowUpRight size={20} />
                  </div>
                  <div className="ticket-body">
                    <div className="ticket-emoji">
                      {emoji}
                      <span className="spark-one">✳</span>
                      <span className="spark-two">✦</span>
                    </div>
                    <h2>{title || "O próximo encontro da sua galera."}</h2>
                    <p>
                      {description ||
                        "Tem coisa que uma chamada de vídeo não resolve."}
                    </p>
                    <div className="ticket-info">
                      <CalendarDays size={16} />
                      <span>
                        {optionCount
                          ? `${optionCount} ${optionCount === 1 ? "opção" : "opções"} pra combinar`
                          : "O melhor dia, a gente decide junto"}
                      </span>
                    </div>
                  </div>
                  <div className="ticket-bottom">
                    <div className="mini-avatar">
                      {(organizer || "V").slice(0, 1).toUpperCase()}
                    </div>
                    <span>
                      {organizer
                        ? `${organizer} tá chamando`
                        : "Você + sua galera"}
                    </span>
                    <span className="ticket-brand">bora!</span>
                  </div>
                </div>
                </Reveal>
                <Reveal className="recipe">
                  <h3>Do grupo pro mundo real.</h3>
                  <div>
                    <span>01</span>
                    <p>
                      <b>Joga as datas na roda.</b>
                      <br />
                      Dá umas opções pra galera.
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>
                      <b>Manda o link no grupo.</b>
                      <br />
                      Cada um diz quando pode.
                    </p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>
                      <b>Bateu a agenda? Bora!</b>
                      <br />
                      Feche a data e faça acontecer.
                    </p>
                  </div>
                </Reveal>
                <div className="aside-note">
                  <Sparkles size={16} />
                  <p>
                    O rolê perfeito é o que sai
                    <br />
                    do “qualquer dia desses”.
                  </p>
                </div>
              </aside>
  );
}
