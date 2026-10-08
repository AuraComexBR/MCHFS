# MCHFS — Área de Cursos (protótipo)

Protótipo da área de login e cursos do MCHFS (Maternal & Child Health Friendly
Standards), construído com Node.js + Express + SQLite (`node:sqlite`, módulo
nativo do Node — sem dependências de compilação).

## Como correr localmente

```bash
npm install
npm run seed      # cria a base de dados e as contas de teste (só corre se estiver vazia)
npm start         # inicia o servidor em http://localhost:3000
```

Durante o desenvolvimento, `npm run dev` reinicia o servidor automaticamente
a cada alteração.

## Contas de teste (protótipo — mudar antes de produção)

| Papel      | Email                  | Password   |
|------------|-------------------------|------------|
| Administradora (Regina) | regina@mchfs.org | mudar123 |
| Mentoranda (exemplo)    | mentee@mchfs.org | mudar123 |

As palavras-passe são guardadas com hash (bcrypt) — nunca em texto simples.

## Estrutura

```
mchfs-app/
  server.js           # rotas Express (login, cursos, painel admin)
  db/
    schema.sql         # esquema da base de dados
    index.js           # ligação SQLite (node:sqlite)
    seed.js             # dados iniciais de teste
    mchfs.sqlite        # ficheiro da base de dados (gerado automaticamente)
  views/                # templates EJS (bilingues: en/pt)
  public/                # site institucional (HTML estático) + CSS partilhado
  uploads/               # PDFs enviados pela administradora
  middleware/auth.js     # controlo de acesso (login / admin)
  i18n.js                # dicionário de strings en/pt
```

## O que já funciona (testado)

- Login / logout com sessão (cookie, 8 horas de validade).
- Acesso restrito: só utilizadoras autenticadas veem `/courses`; só a
  administradora acede a `/admin`.
- Lista de módulos (`/courses`) e página de cada módulo (`/courses/:id`),
  com vídeo do YouTube incorporado (aceita links `youtube.com/watch?v=` e
  `youtu.be/`) e PDF de apoio para download, quando existir.
- Painel da administradora (`/admin`): criar, editar, eliminar módulos;
  upload de PDF (substituído automaticamente ao editar); publicar/despublicar
  um módulo sem o eliminar.
- Conteúdo bilingue por módulo (título, descrição, conteúdo em EN e PT em
  separado) — a mentoranda escolhe o idioma no menu, tal como no site
  institucional.
- Sem imagens nesta fase do protótipo, conforme combinado — o foco é validar
  a estrutura de login + cursos antes de decidir sobre imagens.

## Importante antes de colocar em produção

- **Persistência da base de dados em hospedagem serverless (ex: Vercel):**
  o ficheiro `mchfs.sqlite` fica no disco do servidor. Em plataformas
  serverless (como a Vercel), o sistema de ficheiros é temporário e os dados
  podem perder-se entre execuções. Antes de publicar, será preciso mudar
  para uma solução com disco persistente (ex: Turso/libSQL, Render, Railway,
  ou um servidor tradicional) — ou manter o site institucional na Vercel e
  hospedar só esta parte (login/cursos) num serviço com disco persistente.
- Mudar `SESSION_SECRET` (variável de ambiente) e as palavras-passe de teste
  antes de qualquer utilização real.
- `node:sqlite` é ainda uma funcionalidade experimental do Node.js — estável
  o suficiente para um protótipo, mas vale a pena reavaliar antes da versão
  final.
