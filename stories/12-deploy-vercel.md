# Plan: Deploy na Vercel

## Context

"Deploy na Vercel" é o primeiro diferencial listado no README e o único que dá ao avaliador uma URL
para abrir sem clonar nada. Última story: só faz sentido publicar com CI verde (story 10) e README
pronto (story 11).

Decisões travadas:
- Deploy pelo **Git integration da Vercel** (import do repo), não por `vercel --prod` na mão:
  garante preview por PR e um build reproduzível igual ao do CI.
- `NEXT_PUBLIC_SITE_URL` configurada em produção — é dela que o `metadataBase` da
  [08-seo-e-metadata](./08-seo-e-metadata.md) monta as URLs absolutas de OG. Sem isso o OG quebra
  silenciosamente (não falha build, só gera link feio no compartilhamento).

Ponto de atenção: o build da Vercel executa `getPokemonCatalog()` (1 + 100 requisições à PokeAPI)
para prerenderizar as 100 rotas de detalhe. Se estourar tempo ou tomar rate limit, a saída é
`cacheLife` mais longo e/ou reduzir o `generateStaticParams` para as rotas mais acessadas, deixando
o resto sob demanda — **não** desligar o prerender inteiro.

## Desenho

- Importar o repositório na Vercel; framework detectado como Next.js; package manager `pnpm`
  (respeitar `packageManager: pnpm@11.3.0` do `package.json`).
- Env vars: `NEXT_PUBLIC_SITE_URL` = URL de produção (e a de preview no ambiente Preview).
- Conferir a versão de Node do projeto na Vercel contra a usada no CI — divergência de major é a
  causa clássica de "passa no CI, quebra no deploy".
- Confirmar que `images.remotePatterns` (story 02) cobre o host dos sprites: em produção o
  otimizador de imagem do Next é mais rígido que em dev, e host faltando vira imagem quebrada.
- Preencher no README a URL de produção e o badge de deploy (slot deixado pela story 11).

## Validação

Comandos:
- `pnpm build` local limpo **antes** de publicar — o build da Vercel não pode ser o primeiro build
  de produção que alguém vê.
- `pnpm test` e `pnpm test:e2e` verdes.
- `pnpm test:e2e` apontando para a URL publicada
  (`PLAYWRIGHT_TEST_BASE_URL=<url> pnpm test:e2e`) — smoke em produção com a suíte que já existe.

Casos a cobrir (na URL de produção, não em localhost):
- `/` lista os cards com as **imagens carregando** (falha aqui = `remotePatterns`).
- `/?q=pika&type=electric` renderiza o estado filtrado direto pela URL.
- `/pokemon/pikachu` responde 200 e vem prerenderizada (HTML já com o conteúdo no view-source).
- `/pokemon/nao-existe` responde 404 com a página not-found.
- `<meta property="og:image">` é URL **absoluta** apontando para o domínio publicado.
- `/sitemap.xml` e `/robots.txt` respondem 200.

Verificação manual:
- Abrir a URL no celular (responsividade real, não só devtools).
- Conferir no log de build da Vercel que as 100 rotas de detalhe foram geradas e que não houve
  erro/timeout de rede com a PokeAPI.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste; sendo story de infraestrutura, o gate equivalente é a suíte e2e
> rodando contra a URL publicada, item a item acima. `pnpm lint` e `pnpm build` limpos.

## Fora de escopo

- Domínio próprio, analytics, monitoramento/alertas.
- Deploy em outra plataforma ou self-hosting.
- Promover preview a produção automaticamente pelo CI (a Vercel já cuida do fluxo por branch).
