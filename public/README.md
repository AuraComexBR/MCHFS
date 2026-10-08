# MCHFS — site institucional (rascunho para rodar localmente)

Site estático puro: HTML + CSS + um JS mínimo (menu mobile). Sem build, sem npm install, sem framework — abre direto no navegador. Essa escolha foi proposital: carrega rápido em internet ruim, o público-alvo real do site.

## Como rodar localmente

**Opção mais simples:** dê duplo clique em `index.html` e abra no navegador. Funciona, mas os links entre páginas funcionam melhor com um servidor local (abaixo).

**Com servidor local (recomendado), usando Node (você já tem):**

```bash
npx serve .
```

Ou, se preferir Python:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:3000` (npx serve) ou `http://localhost:8080` (python).

## Estrutura

Agora o site é bilíngue: inglês britânico e português de Portugal, em pastas separadas.

- `index.html` — seletor de idioma (raiz)
- `en/` — versão em inglês britânico (en-GB): "programme", "labour", "centre" etc.
- `pt/` — versão em português de Portugal (pt-PT): "contacto", "equipa", "bebé" etc.
  - `index.html` — Sobre / About
  - `mentors.html` — Meet Mentors / Conhecer as Mentoras
  - `program.html` — Mentoring Programme / Programa de Mentoria (com o formulário "Book Your Place")
  - `resources.html` — Resources / Recursos (vídeos)
  - `contact.html` — Contact / Contacto (formulário)
- `styles.css` — CSS compartilhado pelas duas línguas, um arquivo só
- `nav.js` — menu mobile (hambúrguer), compartilhado
- `assets/logo-light.jpg` e `assets/logo-dark.jpg` — logo oficial (mãos + pés de bebê), pré-composta em JPEG sobre o fundo claro do cabeçalho e sobre o fundo índigo do seletor de idioma. ~3KB cada, bem mais leve que o PNG original com transparência

Cada página tem um seletor "EN · PT" no topo, que leva para a mesma página no outro idioma.

## Decisões pensando em internet ruim e celular

- **Sem framework, sem build step**: zero JavaScript pesado para baixar e processar
- **Sem webfonts**: usa as fontes do sistema operacional (não baixa nada extra)
- **Sem imagens pesadas**: ícones são SVG inline (poucos bytes), fotos reais entram depois, otimizadas
- **CSS único e pequeno**: ~2KB comprimido
- **Cada página HTML**: entre 1,7KB e 2,5KB comprimida
- **Mobile-first**: o layout parte do celular e "cresce" para telas maiores, não o contrário
- **Vídeos no YouTube**: não pesam no site, o carregamento fica a cargo do YouTube (que já otimiza para conexões ruins)

## O que falta (conteúdo, não código)

- Bio da Vanessa Barroso
- Bios dos "Invited Lecturers"
- Texto de "Our Story" e "Our Mascot"
- Links reais dos vídeos de Resources
- Confirmar e-mails reais (usei `contact@mchfs.org` e `rds@mchfs.org` como placeholder, alinhados ao domínio novo)

## Próximos passos técnicos (fora do escopo desta entrega)

- Conectar os formulários (hoje são só visuais) a algum destino real — e-mail, planilha ou banco
- Adicionar página em português de Portugal (estrutura pronta para duplicar)
- Depois disso: login, módulos, questionário — a parte de plataforma
