# Teste Técnico – Desenvolvedor Front-end

**Next.js + React + Arquitetura Front-end**

## 🎯 Objetivo

Criar uma aplicação Next.js que consuma a PokeAPI e exiba uma experiência completa de listagem, busca, filtros e detalhes de Pokémons, com foco em arquitetura, performance, qualidade de código, experiência do usuário e tomada de decisão técnica.

O objetivo não é apenas entregar uma tela funcional, mas demonstrar maturidade na construção de uma aplicação front-end escalável, bem organizada e preparada para manutenção.

## 🔗 API a ser utilizada

- **Listagem de Pokémons:**
  `GET https://pokeapi.co/api/v2/pokemon?limit=100&offset=0`
- **Detalhes de um Pokémon:**
  `GET https://pokeapi.co/api/v2/pokemon/{name}`
- **Tipos de Pokémon:**
  `GET https://pokeapi.co/api/v2/type`

## ✅ Requisitos obrigatórios

### 1. Listagem de Pokémons

- Exibir os 100 primeiros Pokémons
- Paginar a listagem de 20 em 20
- Exibir cards contendo: Nome, Imagem, Tipos, Número/ID do Pokémon
- Implementar estados de Loading, Erro e Lista vazia

### 2. Busca e filtros

- Permitir busca por nome
- Permitir filtro por tipo de Pokémon
- Busca deve funcionar junto com filtros
- Paginação deve se adaptar aos filtros
- Tratar cenários sem resultado

### 3. Página de detalhes

- Rota: `/pokemon/[name]`
- Exibir:
  - Nome
  - Imagem
  - Tipos
  - Habilidades
  - Até 5 movimentos principais

### 4. Arquitetura e organização

- Componentes reutilizáveis
- Camada de serviços HTTP
- TypeScript obrigatório
- Separação entre UI e lógica
- Estrutura clara de pastas
- Tratamento consistente de erros

### 5. Performance e UX

- Uso adequado de recursos do Next.js
- SEO básico com Head
- Evitar chamadas desnecessárias
- Responsividade
- Feedback visual de carregamento e erro
- Navegação fluida

### 6. Testes

- Cobrir listagem, busca, paginação, detalhes e cenários de erro

## ⚙️ Tecnologias obrigatórias

- Next.js v12+
- React v17+
- TypeScript
- CSS Modules, Tailwind ou Styled-components
- Axios, fetch ou equivalente
- Ferramenta de testes automatizados

## ✅ Diferenciais

- Deploy na Vercel
- SSR, SSG ou ISR com justificativa
- Cache de dados
- Testes end-to-end
- Storybook
- Acessibilidade
- README técnico
- ESLint, Prettier, Husky
- Pipeline CI

---

Boa sorte e divirta-se! 🧢⚡
