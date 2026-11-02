# Validação da entrega

Data: 2 de novembro de 2026.

## Verificações executadas

- Compilação otimizada de produção (`npm run build`), incluindo TypeScript e geração de páginas: aprovada.
- Verificação TypeScript (`npm run typecheck`): aprovada.
- Suíte com 8 testes, incluindo integração HTTP em servidor Next local: 8 aprovados, 0 falhas, 0 ignorados na execução completa.
- API: criação e leitura pública; ausência do segredo administrativo nas respostas públicas; cinco votos simultâneos preservados; acesso de convidado ao fechamento negado; fechamento do organizador aceito; voto após fechamento recusado; RSVP aceito; IDs, datas passadas e corpos excessivos rejeitados.
- Regras: ranking, desempate, edição sem duplicar participante, nomes iguais com identidades diferentes, datas inválidas/repetidas, RSVP antes do fechamento e imutabilidade da data oficial.
- Página inicial servida por HTTP com status 200.
- Auditoria estática de motion: durações de interação 180–280 ms, transformação/opacidade, spring discreto, stagger limitado, redução de movimento, confetes por carregamento sob demanda. Alterações de cor são diretas, sem interpolação de propriedades de layout.

## Limites da verificação

- A prévia no navegador integrado falhou por erro de sessão. A alternativa via Firefox foi bloqueada pela ferramenta de controle por falta de suporte à política de URLs. O controle de interface foi encerrado nesse ponto.
- Portanto, **não houve inspeção visual concluída, teste manual de teclado/leitor de tela, medição de FPS, Lighthouse nem teste em celular real**. A responsividade e acessibilidade foram verificadas por leitura do código, não por interação visual.
- A integração foi testada com persistência em memória, explicitamente limitada ao desenvolvimento. Não havia credenciais de um Redis do usuário; o caminho REST/Lua está implementado, mas precisa do teste de implantação com o banco real descrito no README.
- Não foi realizado deploy na Vercel nem criado serviço pago. A entrega é o código-fonte configurado para esse destino.
- As seis skills de animação nomeadas no pedido não estavam instaladas; foram aplicadas diretamente as diretrizes fornecidas pelo usuário, sem alegação de invocação dessas skills.

Antes de disponibilizar amplamente, execute o roteiro final do README em dois dispositivos e confira contraste, foco, teclado, calendário, modais e heatmap nas larguras desejadas.
