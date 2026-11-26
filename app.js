(() => {
'use strict';
const D = window.CIENTISTAS_DATA, C = D.cientistas;
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const SEM = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const ROT = {nasc:'Nascimento', falec:'Falecimento', premio:'Premiação', desc:'Descoberta'};
const ORD = Object.keys(ROT);
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- Cálculo do calendário (gregoriano proléptico, qualquer ano de 1 a 9999) ---------- */
const bis = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const diasNoMes = (y, m) => m === 2 ? (bis(y) ? 29 : 28) : [4,6,9,11].includes(m) ? 30 : 31;
const diaSemana = (y, m, d) => { // Sakamoto: 0 = domingo
  const t = [0,3,2,5,0,3,5,1,4,6,2,4]; if (m < 3) y--;
  return (y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) + t[m-1] + d) % 7;
};
const extenso = (d, m, a) => `${d === 1 ? '1º' : d} de ${MESES[m-1]} de ${a}`;

/* ---------- Índices de eventos ---------- */
const pd = s => { const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return r ? {a:+r[1], m:+r[2], d:+r[3]} : null; };
const pa = s => { const r = /^(\d{4})/.exec(s || ''); return r ? +r[1] : null; };
const porDia = {}, porAno = {};
const add = (mapa, k, e) => (mapa[k] ||= []).push(e);
C.forEach((c, i) => {
  const n = pd(c.data_nascimento), f = pd(c.data_falecimento);
  if (n) add(porDia, n.m+'-'+n.d, {t:'nasc', i, ano:n.a, m:n.m, d:n.d});
  if (f) add(porDia, f.m+'-'+f.d, {t:'falec', i, ano:f.a, m:f.m, d:f.d});
  const marco = (t, x, txt) => {
    const full = pd(x.data), ano = full ? full.a : pa(x.data);
    if (!ano) return;
    const e = {t, i, ano, txt, raw:x.data};
    full ? add(porDia, full.m+'-'+full.d, {...e, m:full.m, d:full.d}) : add(porAno, ano, e); // dia exato, se um dia o JSON trouxer
  };
  c.principais_descobertas.forEach(x => marco('desc', x, x.descricao));
  c.premios_cientificos.forEach(x => marco('premio', x, x.nome));
});

/* ---------- Estado e filtros ---------- */
const F = {tipos:new Set(ORD), br:false};
const passa = e => F.tipos.has(e.t) && (!F.br || /brasileira/i.test(C[e.i].nacionalidade));
const cmp = (a, b) => ORD.indexOf(a.t) - ORD.indexOf(b.t) || C[a.i].nome.localeCompare(C[b.i].nome, 'pt');
const evDia = (Y, m, d) => {
  let l = porDia[m+'-'+d] || [];
  if (m === 2 && d === 28 && !bis(Y)) l = l.concat((porDia['2-29'] || []).map(e => ({...e, nota29:true})));
  return l.filter(e => Y >= e.ano && passa(e)).sort(cmp);
};
const evAno = Y => (porAno[Y] || []).filter(passa).sort(cmp);

const H = new Date(), HOJE = {a:H.getFullYear(), m:H.getMonth()+1, d:H.getDate()};
const est = {a:HOJE.a, m:HOJE.m};
let reg = [];
const ref = (e, Y) => reg.push({e, Y}) - 1;

/* ---------- Textos ---------- */
const anos = n => `${n} ano${n > 1 ? 's' : ''}`;
const rotuloCurto = (e, Y) => { const n = Y - e.ano;
  if (e.t === 'nasc') return n ? `nascimento · ${anos(n)}` : 'nasceu neste ano';
  if (e.t === 'falec') return n ? `falecimento · ${anos(n)}` : 'faleceu neste ano';
  return `${ROT[e.t].toLowerCase()} · ${e.ano}`; };
const chip = (e, Y) => `<button class="chip t-${e.t}" data-r="${ref(e, Y)}" title="${esc(C[e.i].nome)} — ${esc(ROT[e.t])}"><b>${esc(C[e.i].nome)}</b><small>${esc(rotuloCurto(e, Y))}</small></button>`;

function textoEvento(e, Y) {
  const c = C[e.i], n = Y - e.ano;
  const marco = n === 0 ? 'Isso aconteceu neste mesmo ano.' : `Em ${Y}, completam-se <b>${anos(n)}</b> desse acontecimento.`;
  if (e.t === 'nasc') return {h:`Nascimento de ${c.nome}`, p:`${esc(c.nome)} nasceu em ${extenso(e.d, e.m, e.ano)}.${e.nota29 ? ' Como nasceu em 29 de fevereiro, a data é lembrada em 28/02 nos anos não bissextos.' : ''} ${marco}`};
  if (e.t === 'falec') return {h:`Falecimento de ${c.nome}`, p:`${esc(c.nome)} faleceu em ${extenso(e.d, e.m, e.ano)}.${e.nota29 ? ' A data original é 29 de fevereiro.' : ''} ${marco}`};
  if (e.t === 'premio') return {h:e.txt, p:`${esc(c.nome)} recebeu esse reconhecimento (${esc(e.raw)}). ${marco}`};
  return {h:'Descoberta ou contribuição', p:`${esc(e.txt)}${e.raw ? ` <span class="text-secondary">(${esc(e.raw)})</span>` : ''}. ${marco}`};
}
function perfil(c) {
  const n = pd(c.data_nascimento), f = pd(c.data_falecimento);
  let idade = '';
  if (n && f) idade = ` (viveu ${f.a - n.a - ((f.m < n.m || (f.m === n.m && f.d < n.d)) ? 1 : 0)} anos)`;
  const li = (a, k) => a.length ? `<ul>${a.map(x => `<li>${esc(x[k])}${x.data ? ` <span>(${esc(x.data)})</span>` : ''}</li>`).join('')}</ul>` : '';
  //const foto = /^https:\/\/upload\.wikimedia\.org\//.test(c.foto || '')
  const foto = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(c.foto || '')
    ? `<img class="foto" src="${esc(c.foto)}" alt="Foto de ${esc(c.nome)}" width="96" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  return `<div class="perfil">${foto}<dl>
    <dt>Área</dt><dd>${esc(c.area_cientifica)}</dd>
    <dt>Nacionalidade</dt><dd>${esc(c.nacionalidade)}</dd>
    ${n ? `<dt>Nascimento</dt><dd>${extenso(n.d, n.m, n.a)}</dd>` : ''}
    ${f ? `<dt>Falecimento</dt><dd>${extenso(f.d, f.m, f.a)}${idade}</dd>` : ''}
  </dl>
  ${c.outras_informacoes ? `<p>${esc(c.outras_informacoes)}</p>` : ''}
  ${c.principais_descobertas.length ? `<h4>Principais descobertas</h4>${li(c.principais_descobertas, 'descricao')}` : ''}
  ${c.premios_cientificos.length ? `<h4>Prêmios e reconhecimentos</h4>${li(c.premios_cientificos, 'nome')}` : ''}
  ${c.wikipedia ? `<p><a href="${esc(c.wikipedia)}" target="_blank" rel="noopener">Saiba mais na Wikipédia</a></p>` : ''}</div>`;
}
const secao = ({e, Y}) => { const x = textoEvento(e, Y);
  return `<div class="ev t-${e.t}"><p class="tipo">${ROT[e.t]}</p><h3>${esc(x.h)}</h3><p class="mb-0">${x.p}</p></div>${perfil(C[e.i])}`; };

/* ---------- Modal ---------- */
const modal = new bootstrap.Modal($('#modal'));
function abrir(itens, titulo, aberto = 0) {
  $('#mTitulo').textContent = titulo;
  $('#mCorpo').innerHTML = itens.length === 1 ? secao(itens[0]) :
    `<div class="accordion" id="acc">${itens.map((it, k) => `<div class="accordion-item t-${it.e.t}">
      <h3 class="accordion-header"><button class="accordion-button${k === aberto ? '' : ' collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#a${k}" aria-expanded="${k === aberto}">${esc(C[it.e.i].nome)} — ${ROT[it.e.t].toLowerCase()}</button></h3>
      <div id="a${k}" class="accordion-collapse collapse${k === aberto ? ' show' : ''}" data-bs-parent="#acc"><div class="accordion-body">${secao(it)}</div></div></div>`).join('')}</div>`;
  modal.show();
}

/* ---------- Renderização ---------- */
function render() {
  reg = [];
  const {a:Y, m:M} = est;
  $('#titulo').textContent = `${MESES[M-1]} de ${Y}`;
  $('#selMes').value = M; $('#inpAno').value = Y;
  const off = diaSemana(Y, M, 1);
  let h = '<div class="cel vazia"></div>'.repeat(off);
  for (let d = 1; d <= diasNoMes(Y, M); d++) {
    const ev = evDia(Y, M, d), eh = Y === HOJE.a && M === HOJE.m && d === HOJE.d;
    h += `<div class="cel${ev.length ? ' tem' : ''}${eh ? ' hoje-d' : ''}" data-d="${d}"${eh ? ' aria-current="date"' : ''}>
      <span class="num">${d}</span>${ev.slice(0, 2).map(e => chip(e, Y)).join('')}${ev.length > 2 ? `<button class="mais" data-d="${d}">+${ev.length - 2} mais</button>` : ''}</div>`;
  }
  const resto = (7 - (off + diasNoMes(Y, M)) % 7) % 7;
  $('#grade').innerHTML = h + '<div class="cel vazia"></div>'.repeat(resto);

  const ms = evAno(Y);
  $('#marcos').innerHTML = `<h2>Marcos de ${Y}</h2>
    <p>Prêmios e descobertas cujo registro traz apenas o ano, sem dia e mês. Por isso aparecem aqui, e não em uma data do calendário.</p>
    ${ms.length ? `<div class="lista">${ms.map(e => chip(e, Y)).join('')}</div>` : `<p class="mb-0">Nenhum marco registrado em ${Y}. Experimente outro ano, como 1903 ou 2015.</p>`}`;

  const eh = evDia(HOJE.a, HOJE.m, HOJE.d);
  $('#hoje').innerHTML = `<h2>Hoje, ${extenso(HOJE.d, HOJE.m, HOJE.a)}</h2>` +
    (eh.length ? `<div class="lista">${eh.map(e => chip(e, HOJE.a)).join('')}</div>` : '<p class="mb-0 text-secondary">Nenhum aniversário de nascimento ou falecimento hoje com os filtros atuais.</p>');
  history.replaceState(null, '', `#${Y}-${pad(M)}`);
}

/* ---------- Interações ---------- */
document.addEventListener('click', ev => {
  const ch = ev.target.closest('[data-r]');
  if (ch) { const it = reg[+ch.dataset.r]; return abrir([it], C[it.e.i].nome); }
  const cel = ev.target.closest('.cel[data-d]');
  if (!cel) return;
  const d = +cel.dataset.d, itens = evDia(est.a, est.m, d).map(e => ({e, Y:est.a}));
  if (!itens.length) return;
  abrir(itens, itens.length === 1 ? C[itens[0].e.i].nome : `${SEM[diaSemana(est.a, est.m, d)]}, ${extenso(d, est.m, est.a)}`);
});
const ir = (a, m) => { while (m < 1) { m += 12; a--; } while (m > 12) { m -= 12; a++; }
  est.a = Math.min(9999, Math.max(1, a)); est.m = m; render(); };
$('#ant').onclick = () => ir(est.a, est.m - 1);
$('#prox').onclick = () => ir(est.a, est.m + 1);
$('#btnHoje').onclick = () => ir(HOJE.a, HOJE.m);
$('#selMes').onchange = e => ir(est.a, +e.target.value);
$('#inpAno').onchange = e => ir(parseInt(e.target.value, 10) || est.a, est.m);

$('#selMes').innerHTML = MESES.map((n, i) => `<option value="${i+1}">${n}</option>`).join('');
$('.semana').innerHTML = SEM.map(s => `<div>${s.slice(0, 3)}</div>`).join('');
$('#filtros').innerHTML = ORD.map(t => `<button class="filtro t-${t}" data-t="${t}" aria-pressed="true">${ROT[t]}</button>`).join('') +
  '<button class="filtro" data-br="1" aria-pressed="false">Só brasileiras</button>';
$('#filtros').addEventListener('click', ev => {
  const b = ev.target.closest('.filtro'); if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', on);
  if (b.dataset.t) on ? F.tipos.add(b.dataset.t) : F.tipos.delete(b.dataset.t); else F.br = on;
  render();
});
$('#rodape').innerHTML = `<p>${D.total_cientistas} cientistas · dados organizados em ${D.data_organizacao.split('-').reverse().join('/')}. ${esc(D.observacoes[0])} ${esc(D.observacoes[2])}</p>
  <p>Fontes: ${D.fontes_de_referencia.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.instituicao)}</a>`).join('; ')}.</p>`;

const hs = /^#(\d{1,4})-(\d{1,2})$/.exec(location.hash);
if (hs && +hs[2] >= 1 && +hs[2] <= 12 && +hs[1] >= 1) { est.a = +hs[1]; est.m = +hs[2]; }
render();
})();
