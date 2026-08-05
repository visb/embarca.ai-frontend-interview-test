# Plan: SEO e metadata

## Context

Requisito 5 do README fala em "SEO básico com Head". **Nesta versão do Next não se usa `<Head>`**:
o App Router expõe `export const metadata` e `generateMetadata`, e `metadata` só é suportado em
Server Components (`node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`).
Ler antes de codar. O `<Head>` do Pages Router aqui seria erro, não "básico".

Decisões travadas:
- Story separada das telas para o SEO ser tratado como camada consistente (title template,
  canonical, OG) em vez de metadata solta e divergente por página.
- Página de detalhe usa `generateMetadata` com dados reais do pokémon (título com nome e ID,
  descrição com tipos) — é o que gera valor de SEO de verdade.
- Listagem filtrada (`?q=`/`?type=`) **não** gera título dinâmico nem é indexável como página
  própria: metadata estática na home evita duplicação de conteúdo indexado.
- `metadataBase` vem de env (`NEXT_PUBLIC_SITE_URL`) com fallback local, para as URLs absolutas de
  OG funcionarem no deploy (story 12).

## Desenho

- `app/layout.tsx` — `metadata` raiz: `metadataBase`, `title: { default, template: '%s | Pokédex' }`,
  `description`, `openGraph`, `twitter`, `lang="pt-BR"` no `<html>` (o scaffold vem `en`).
- `app/page.tsx` — `metadata` estática da listagem.
- `app/pokemon/[name]/page.tsx` — `generateMetadata({ params })` async: `await params`, busca o
  pokémon (mesma função cacheada da página, sem request extra), monta title/description/OG image
  com a arte oficial; nome inexistente devolve metadata neutra em vez de estourar.
- `app/icon`/`favicon` — manter o existente; sem gerar OG image dinâmica.
- `public/robots.txt` ou `app/robots.ts` + `app/sitemap.ts` listando `/` e as 100 rotas de detalhe
  a partir do catálogo.

## Validação

Comandos:
- `pnpm lint`, `pnpm typecheck`, `pnpm build` — limpos.
- `pnpm test:e2e` — asserções de `<head>`.

Casos a cobrir:
- E2E (`e2e/seo.spec.ts`): `/` tem `<title>` e `<meta name="description">` não vazios;
  `/pokemon/pikachu` tem title contendo "Pikachu" e og:image absoluta (começa com `http`);
  `<html lang="pt-BR">`; `/sitemap.xml` responde 200 e contém `/pokemon/pikachu`;
  `/robots.txt` responde 200.
- `generateMetadata` com nome inexistente não derruba a rota (a página ainda responde 404 limpo).

Verificação manual:
- `pnpm build && pnpm start`, ver o `view-source` de `/pokemon/pikachu`: as tags de metadata estão
  no HTML servido, não injetadas só no cliente.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- OG image dinâmica via `ImageResponse`.
- JSON-LD / dados estruturados.
- i18n / hreflang.
- Analytics.
