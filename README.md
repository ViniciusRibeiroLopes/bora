# Bora! — Agendador de rolês sem frescura

SPA em português, sem cadastro, com Next.js App Router, React, TypeScript, Motion, Lucide e canvas-confetti. Layout escuro, acento lima, prévia do convite, calendário de múltipla seleção, disponibilidade em três estados, heatmap, melhor data, fechamento e RSVP.

## Rodar agora

Requer Node.js 22 ou superior e npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No PowerShell, a cópia equivalente é `Copy-Item .env.example .env.local`. Se sua política local bloquear `npm.ps1`, use `npm.cmd` no lugar de `npm`.

Abra http://localhost:3000. O botão **Ver demonstração** mostra um exemplo interativo com participantes fictícios. Ele não usa o banco. **Novo rolê** abre a criação real.

O `.env.example` ativa memória temporária **somente em desenvolvimento local**. Permite testar criação, votação, compartilhamento entre abas e fechamento. Os dados desaparecem quando o processo é reiniciado. Esse modo é rejeitado em produção e na Vercel.

## Hospedar na Vercel

1. Extraia esta pasta e envie seu conteúdo para um repositório GitHub, GitLab ou Bitbucket. Não envie `node_modules`, `.next` nem `.env.local`.
2. Crie um banco **Upstash Redis** no painel da Upstash ou pela integração do Marketplace da Vercel. Copie a URL REST e o token REST.
3. Na Vercel, importe o repositório. Framework: **Next.js**. Se colocou o projeto em uma subpasta, selecione essa pasta em **Root Directory**. Não configure saída estática: há uma API necessária para os votos compartilhados.
4. Em **Environment Variables**, configure para os ambientes desejados:

   | Variável                   | Conteúdo            |
   | -------------------------- | ------------------- |
   | `UPSTASH_REDIS_REST_URL`   | URL REST do banco   |
   | `UPSTASH_REDIS_REST_TOKEN` | Token REST do banco |

5. Não configure `BORA_DEV_MEMORY` na Vercel. As credenciais Redis são do servidor; nunca use prefixo `NEXT_PUBLIC_`.
6. Clique em **Deploy**. Next.js é detectado automaticamente, sem `vercel.json` ou migrações. Alterações posteriores nas variáveis exigem novo deploy.
7. Faça um teste final: crie um rolê, abra o **link público em outro navegador/dispositivo**, vote, espere até 15 segundos para atualizar o painel, feche a data pelo organizador e confirme presença pelo convidado.

Sem Redis configurado, a demonstração funciona, mas criar/carregar rolês reais retorna um erro explícito. Não há falsa sincronização por localStorage. Custos e limites dependem dos planos Vercel/Upstash escolhidos; não há contratação automática neste projeto.

## Poucos arquivos, responsabilidades claras

```text
app/
  page.tsx              SPA: criação, votação, resultados, compartilhamento
  components.tsx        Calendário, modal com foco contido, toast
  globals.css           Design responsivo e contrato de animação
  layout.tsx            Metadados, idioma e fonte local
  api/event/route.ts    GET / POST / PATCH, validação e limites de requisição
lib/
  model.ts              Tipos, schemas Zod, ranking e transições de estado
  store.ts              Redis REST, memória local explícita e atualização atômica
tests/
  model.test.ts         Regras de votação, fechamento, identidade e validação
  api.test.ts           Integração HTTP, votos simultâneos e acesso do organizador
```

CSS próprio substitui Tailwind para reduzir configuração. Motion implementa transições e indicadores; os ícones são importados individualmente. Manrope é servida pelo próprio app, sem requisição a Google Fonts. Confetes só são carregados quando uma data é fechada.

## Links e identificação sem conta

- Público: `https://seu-site.vercel.app/?r=UUID`. Quem tem esse link vê o nome do rolê, organizador, nomes e respostas dos participantes.
- Organizador: o mesmo link com `#admin=SEGREDO`. O fragmento é lido pelo cliente, salvo localmente e removido da barra. O segredo só é enviado para a API quando necessário, no cabeçalho `Authorization`.
- O botão **Gerar link do rolê** tenta copiar o convite. Se o navegador bloquear a cópia assíncrona, abre o modal com botão direto e campo selecionável.
- Cada navegador recebe uma chave aleatória de 256 bits. O servidor guarda o hash, não a chave. Reenviar uma resposta no mesmo navegador atualiza a existente.
- Um nome repetido não concede acesso à resposta de outra pessoa. Sem login, não é possível provar a identidade nem impedir que alguém use vários navegadores para votar novamente. Isto é um agendador para amigos, não uma votação autenticada.
- Sem o link privado e sem os dados do navegador do criador, não há recuperação administrativa. Guarde o link privado; não compartilhe com convidados.
- Apagar os dados do navegador ou mudar de dispositivo cria uma nova identidade de participante. Armazenamento privado/bloqueado pode impedir a continuidade da identidade.

## Regras do rolê

- Até **12 opções de data/horário** e **100 participantes** por rolê. Um dia pode ter vários horários.
- Datas são horários locais no fuso IANA do criador. O fuso aparece em todas as telas; não há conversão silenciosa para o fuso do convidado. Datas passadas, inválidas e duplicadas são rejeitadas.
- Votos alternam: **Posso → Talvez → Não posso → Posso**. Todas as opções precisam de resposta antes de salvar.
- A melhor data tem mais votos **Posso**; empate usa mais **Talvez**, depois a data mais próxima. Zero participantes não produz favorita. Com votos negativos em todas as opções, o ranking ainda mostra a ordem com zero positivos; o organizador decide.
- O organizador pode fechar qualquer opção, inclusive antes de receber respostas. A confirmação é explícita e definitiva; depois disso, votos não mudam, apenas RSVP **Vou/Não vou**. Participantes novos também podem confirmar presença.
- Os dados expiram **180 dias após a criação**. Atualizações preservam esse prazo.
- Resultados atualizam a cada **15 segundos**, apenas com a página visível. Não são WebSockets. Falhas de sincronização são indicadas, e o formulário em edição não é sobrescrito.

## Persistência e proteção

A API valida conteúdo e tamanho do corpo (10 KB), limita requisições e não retorna o segredo/hash do organizador. O fechamento é autorizado no servidor, inclusive a cada tentativa de atualização. Votos simultâneos usam comparação e troca atômica via Lua (`EVAL`) com repetição limitada, preservando respostas concorrentes. Erros retornam mensagens tratadas, sem credenciais ou detalhes internos.

Cabeçalhos incluem `no-store` na API, `nosniff`, proibição de iframe, política de referenciador e restrição de recursos desnecessários. A CSP fornecida é uma base; não usa nonce para scripts do Next. Para exposições amplas, ajuste limites, observabilidade, firewall e CSP ao tráfego real. A limitação por IP usa `x-real-ip`, preenchido pelo proxy da Vercel; em outra hospedagem, adapte `ipFrom` ao proxy confiável. Não coloque chaves Redis no frontend.

## Motion e acessibilidade

As skills `emil-design-eng`, `animate`, `animate-expo`, `review-animations`, `animation-performance` e `animation-vocabulary` não estavam disponíveis no ambiente de criação. Não foram invocadas. As diretrizes fornecidas no pedido foram implementadas diretamente:

| Diretriz             | Implementação                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Interações premium   | Press scale, hover discreto, toast, confirmação contextual e hierarquia visual                                          |
| Animações web        | Motion + CSS; transições entre abas e modal spring de 280 ms com bounce 0,12                                            |
| Tempos naturais      | UI entre 180 e 280 ms; easing `cubic-bezier(.22,1,.36,1)`                                                               |
| Performance          | Movimento em transform/opacity; sem animar width/height/top/left/blur/sombra                                            |
| Vocabulário          | Stagger de 25 ms limitado a 100 ms; indicador compartilhado entre abas; micro-bounce de seleção; skeleton por opacidade |
| Redução de movimento | `MotionConfig`, `useReducedMotion`, CSS `prefers-reduced-motion` e confetes desabilitados                               |

Cores de estado mudam diretamente; não há animação pesada de background. O skeleton (1,2 s) e o spinner (800 ms) são loops de espera, não transições de interação. Animações compositor-friendly reduzem trabalho de layout, mas **60 FPS não é uma garantia universal**: depende do aparelho, navegador e carga. O canvas de confetes é uma celebração pontual de 85 partículas.

Foco visível, link de pular conteúdo, modal com contenção/restauração de foco, Escape, abas navegáveis por setas, labels e botões acessíveis, estados descritos além da cor, tabela semântica, overflow horizontal contido no heatmap e inputs móveis de 16 px. Os ajustes responsivos cobrem larguras de 620, 800 e 1050 px.

## Verificar

```sh
npm run typecheck
npm test
npm run build
```

Os testes de integração são opt-in. Com `npm run dev` em outro terminal e memória local ativada:

```sh
# Linux / macOS
BORA_TEST_URL=http://localhost:3000 npm test
```

```powershell
# PowerShell
$env:BORA_TEST_URL='http://localhost:3000'
npm.cmd test
```

Não aponte a suíte de integração para produção. Ela cria dados temporários de teste. O arquivo `VALIDACAO.md` registra o que foi efetivamente conferido na entrega e os limites da verificação.

Referências usadas: [Next.js App Router](https://nextjs.org/docs/app), [Redis com Next.js](https://upstash.com/docs/redis/tutorials/nextjs_with_redis), [REST API do Redis](https://upstash.com/docs/redis/features/restapi).
