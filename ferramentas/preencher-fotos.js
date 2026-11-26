#!/usr/bin/env node
/*
 * Preenche o campo "foto" de cada cientista em cientistas.js com o LINK da
 * miniatura do artigo na Wikipédia (nada é baixado; só a URL é gravada).
 *
 * Uso (Node 18+), a partir da pasta do site:
 *   node ferramentas/preencher-fotos.js
 *
 * - Só atualiza quem tem "wikipedia" e ainda está com foto null.
 * - Se o artigo não tiver imagem, "foto" continua null.
 * - Pode ser executado de novo sem problema.
 */
const fs = require('fs');
const path = require('path');
const ARQ = path.join(__dirname, '..', 'cientistas.js');
const TAM = 160; // largura da miniatura, em px

global.window = {};
eval(fs.readFileSync(ARQ, 'utf8'));
const D = window.CIENTISTAS_DATA;

const titulo = url => decodeURIComponent(url.split('/wiki/')[1] || '').replace(/_/g, ' ');

(async () => {
  const pend = D.cientistas.filter(c => c.wikipedia && !c.foto);
  const porTitulo = new Map();
  pend.forEach(c => porTitulo.set(titulo(c.wikipedia), c));
  const titulos = [...porTitulo.keys()];
  let achou = 0;

  for (let i = 0; i < titulos.length; i += 40) {
    const lote = titulos.slice(i, i + 40);
    const u = new URL('https://pt.wikipedia.org/w/api.php');
    u.search = new URLSearchParams({
      action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: TAM,
      redirects: 1, format: 'json', formatversion: 2, titles: lote.join('|')
    });
    const r = await fetch(u, { headers: { 'User-Agent': 'CalendarioCientistas/1.0 (projeto ADA)' } });
    const j = await r.json();
    // mapeia título pedido -> título final (normalização e redirecionamentos)
    const alias = new Map();
    for (const n of (j.query.normalized || [])) alias.set(n.from, n.to);
    const red = new Map((j.query.redirects || []).map(x => [x.from, x.to]));
    const final = t => { let x = alias.get(t) || t; return red.get(x) || x; };
    const pag = new Map(j.query.pages.map(p => [p.title, p]));
    for (const t of lote) {
      const p = pag.get(final(t));
      if (p && p.thumbnail && p.thumbnail.source) { porTitulo.get(t).foto = p.thumbnail.source; achou++; }
    }
  }

  fs.writeFileSync(ARQ, 'window.CIENTISTAS_DATA = ' + JSON.stringify(D) + ';\n');
  console.log(`${achou} fotos gravadas de ${titulos.length} artigos consultados.`);
})().catch(e => { console.error(e); process.exit(1); });
