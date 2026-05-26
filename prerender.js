/**
 * prerender.js
 *
 * Script de pre-renderizacao do site colunairisdeoliveira.com.br
 *
 * O que faz:
 *  1. Busca todos os artigos do Supabase (tabela 'artigos')
 *  2. Gera um arquivo HTML estatico por artigo em /artigo/{id}.html
 *  3. Reescreve o index.html injetando a lista dos artigos no HTML cru
 *  4. Gera um sitemap.xml para o Google Search Console
 *
 * Por que existe:
 *  O crawler do Google AdSense (e em parte o do Google Search) nao executa
 *  JavaScript de forma confiavel. Sem este script, o site parece vazio para
 *  esses robos, e a monetizacao via AdSense fica bloqueada.
 *
 * Quando roda:
 *  - A cada push no repositorio (configurado em .github/workflows/build.yml)
 *  - Diariamente as 06:00 UTC, para pegar artigos publicados via Supabase Studio
 *  - Manualmente pelo botao "Run workflow" no GitHub Actions
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURACAO ============
const SUPABASE_URL = 'https://bnrewcmjuvpnowdaxjpt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NgWXnZWJNbCRcd7uKugCkw_-dv55FjZ';
const SITE_URL = 'https://colunairisdeoliveira.com.br';
const SITE_NAME = 'Iris de Oliveira';

// ============ UTILITARIOS ============
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Remove tags HTML para gerar a meta description (precisa ser texto puro)
function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Trunca texto preservando palavras inteiras
function truncate(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  return s.substring(0, n).replace(/\s+\S*$/, '') + '...';
}

// ============ BUSCA NO SUPABASE ============
async function fetchArtigos() {
  console.log('Buscando artigos do Supabase...');
  const url = `${SUPABASE_URL}/rest/v1/artigos?select=id,tag,title,excerpt,body,date,created_at,imagem_url&order=created_at.desc`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) {
    throw new Error(`Falha ao buscar artigos: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  console.log(`Encontrados ${data.length} artigos.`);
  return data;
}

// ============ TEMPLATE: PAGINA DE ARTIGO INDIVIDUAL ============
function renderArtigoPage(a) {
  const titulo = esc(a.title || 'Sem titulo');
  const descricao = esc(truncate(stripHtml(a.excerpt || a.body || ''), 160));
  const tag = esc(a.tag || '');
  const data = esc(a.date || '');
  const corpo = a.body || '<p>Texto nao disponivel.</p>';
  const lead = esc(a.excerpt || '');
  const imagem = a.imagem_url ? esc(a.imagem_url) : '';
  const urlCanonica = `${SITE_URL}/artigo/${a.id}.html`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo} | ${SITE_NAME}</title>
<meta name="description" content="${descricao}">
<link rel="canonical" href="${urlCanonica}">

<!-- Open Graph para compartilhamento em redes sociais -->
<meta property="og:type" content="article">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descricao}">
<meta property="og:url" content="${urlCanonica}">
${imagem ? `<meta property="og:image" content="${imagem}">` : ''}
<meta property="og:site_name" content="${SITE_NAME}">

<!-- Twitter Card -->
<meta name="twitter:card" content="${imagem ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${titulo}">
<meta name="twitter:description" content="${descricao}">
${imagem ? `<meta name="twitter:image" content="${imagem}">` : ''}

<!-- Dados estruturados (Schema.org) para o Google entender o conteudo -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": ${JSON.stringify(a.title || '')},
  "description": ${JSON.stringify(stripHtml(a.excerpt || ''))},
  "author": {
    "@type": "Person",
    "name": "Iris de Oliveira",
    "url": "${SITE_URL}/sobre.html"
  },
  "publisher": {
    "@type": "Organization",
    "name": "${SITE_NAME}",
    "logo": {
      "@type": "ImageObject",
      "url": "${SITE_URL}/IMG_4578.PNG"
    }
  },
  ${imagem ? `"image": ${JSON.stringify(imagem)},` : ''}
  "datePublished": ${JSON.stringify(a.created_at || '')},
  "articleSection": ${JSON.stringify(a.tag || '')},
  "mainEntityOfPage": "${urlCanonica}"
}
</script>

<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1406809777609408" crossorigin="anonymous"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300&family=Libre+Franklin:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#ffffff;--sf:#fafaf7;--tp:#121212;--ts:#5a5855;--tt:#8e8b85;--bm:#d8d6d0;--bl:#ebe9e3;--ac:#a4221e;--ink:#000}
@media(prefers-color-scheme:dark){:root{--bg:#0f0f0e;--sf:#1a1a18;--tp:#f0ede8;--ts:#a8a5a0;--tt:#6a6865;--bm:#2e2d2a;--bl:#222120;--ac:#d65656;--ink:#f0ede8}}
html{font-size:16px;scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'Libre Franklin',sans-serif;background:var(--bg);color:var(--tp);min-height:100vh;line-height:1.55}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.W{max-width:1240px;margin:0 auto;padding:0 1.5rem}
.N{max-width:720px;margin:0 auto;padding:0 1.5rem}
.topbar{border-bottom:.5px solid var(--bm);background:var(--bg)}
.tbi{display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;font-size:.72rem;color:var(--ts);letter-spacing:.02em}
.tbe{font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ts);cursor:pointer;background:none;border:none;font-family:inherit;padding:0;transition:color .15s;text-decoration:none}
.tbe:hover{color:var(--ac)}
.tdate{text-transform:capitalize}
.mast{padding:1rem 0 .6rem;text-align:center;border-bottom:.5px solid var(--bm)}
.ab{display:inline-flex;align-items:center;gap:6px;font-family:'Libre Franklin',sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ts);cursor:pointer;border:none;background:none;padding:0;margin-bottom:2rem;transition:color .15s;text-decoration:none}
.ab:hover{color:var(--ac)}
.ahdr{margin-bottom:2.5rem;padding-bottom:1.75rem;border-bottom:.5px solid var(--bm)}
.aatg{font-family:'Libre Franklin',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--ac);display:block;margin-bottom:1rem}
.attl{font-family:'Playfair Display',serif;font-size:clamp(1.9rem,4.5vw,2.9rem);font-weight:700;line-height:1.1;margin-bottom:1.1rem;letter-spacing:-.015em}
.alead{font-family:'Source Serif 4',serif;font-size:1.15rem;font-weight:300;line-height:1.65;color:var(--ts);margin-bottom:1.25rem;font-style:italic}
.amet{font-family:'Libre Franklin',sans-serif;font-size:.72rem;color:var(--tt);letter-spacing:.04em}
.amet strong{color:var(--tp);font-weight:600}
.aimg{margin:0 0 2rem;aspect-ratio:16/9;background:var(--bl);overflow:hidden}
.aimg img{width:100%;height:100%;object-fit:cover}
.abody{font-family:'Inter',sans-serif;font-size:1rem;font-weight:400;line-height:1.85;color:var(--tp)}
.abody p{margin-bottom:1.5rem}
.abody>p:first-child::first-letter{font-family:'Playfair Display',serif;font-size:3.8rem;font-weight:700;float:left;line-height:1;padding:0 .45rem 0 0;margin-top:.1rem;color:var(--ink)}
.aft{margin-top:3rem;padding-top:1.5rem;border-top:.5px solid var(--bm);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
.aftsig{font-family:'Source Serif 4',serif;font-size:.88rem;color:var(--ts);font-style:italic}
.aftsig strong{color:var(--tp);font-weight:600;font-style:normal}
.aftb{font-family:'Libre Franklin',sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ts);cursor:pointer;border:.5px solid var(--bm);background:none;padding:.55rem 1rem;transition:all .15s;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.aftb:hover{background:var(--ink);color:var(--bg);border-color:var(--ink)}
footer{background:var(--ink);color:var(--bg);margin-top:4rem;padding:2.5rem 0 1.5rem}
footer .W{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}
.fcol h5{font-family:'Libre Franklin',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin-bottom:.9rem;opacity:.7}
.fcol p,.fcol a{font-family:'Source Serif 4',serif;font-size:.85rem;color:rgba(255,255,255,.78);line-height:1.7;text-decoration:none;display:block}
.fcol a:hover{color:#fff}
.flogo{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:800;color:#fff;margin-bottom:.5rem;letter-spacing:-.01em}
.fbot{border-top:1px solid rgba(255,255,255,.15);margin-top:2rem;padding-top:1.2rem;text-align:center;font-size:.7rem;color:rgba(255,255,255,.55);letter-spacing:.06em}
@media(max-width:980px){footer .W{grid-template-columns:1fr 1fr}}
@media(max-width:620px){footer .W{grid-template-columns:1fr;gap:1.5rem}.abody>p:first-child::first-letter{font-size:3.4rem}}
</style>
</head>
<body>

<div class="topbar">
  <div class="W tbi">
    <span class="tdate">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
    <a href="/" class="tbe">&larr; Inicio</a>
  </div>
</div>

<header class="mast">
  <div class="W">
    <a href="/"><img src="/IMG_4578.PNG" alt="${SITE_NAME}" style="height:160px;display:block;margin:0 auto"></a>
  </div>
</header>

<article class="N" style="padding-top:2.5rem">
  <a href="/" class="ab">&larr; Voltar aos artigos</a>
  <header class="ahdr">
    ${tag ? `<span class="aatg">${tag}</span>` : ''}
    <h1 class="attl">${titulo}</h1>
    ${lead ? `<p class="alead">${lead}</p>` : ''}
    <span class="amet"><strong>Iris de Oliveira</strong>${data ? ` &middot; ${data}` : ''}</span>
  </header>
  ${imagem ? `<div class="aimg"><img src="${imagem}" alt="${titulo}"></div>` : ''}
  <div class="abody">${corpo}</div>
  <footer class="aft">
    <p class="aftsig"><strong>Iris de Oliveira</strong> &mdash; Analista de politicas publicas e colunista</p>
    <a href="/" class="aftb">&larr; Voltar</a>
  </footer>
  <div style="height:4rem"></div>
</article>

<footer>
  <div class="W">
    <div class="fcol">
      <p class="flogo">Iris de Oliveira</p>
      <p style="font-style:italic;opacity:.7">Analise e opiniao independente sobre politica, economia e sociedade brasileira.</p>
    </div>
    <div class="fcol">
      <h5>Editorias</h5>
      <a href="/#politica">Politica</a>
      <a href="/#economia">Economia</a>
      <a href="/#seguranca">Seguranca</a>
      <a href="/#sociedade">Sociedade</a>
      <a href="/#saude">Saude</a>
    </div>
    <div class="fcol">
      <h5>Sobre</h5>
      <a href="/sobre.html">O autor</a>
      <a href="/contato.html">Contato</a>
      <a href="/privacidade.html">Privacidade</a>
      <a href="/termos.html">Termos</a>
    </div>
    <div class="fcol">
      <h5>Siga</h5>
      <a href="https://www.tiktok.com/@colunairisdeoliveira" target="_blank" rel="noopener">@colunairisdeoliveira</a>
    </div>
  </div>
  <div class="fbot W">&copy; ${new Date().getFullYear()} Iris de Oliveira &middot; Todos os direitos reservados</div>
</footer>

</body>
</html>`;
}

// ============ TEMPLATE: SITEMAP.XML ============
function renderSitemap(artigos) {
  const hoje = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE_URL}/sobre.html`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${SITE_URL}/contato.html`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${SITE_URL}/privacidade.html`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${SITE_URL}/termos.html`, priority: '0.3', changefreq: 'yearly' },
  ];
  artigos.forEach((a) => {
    const dataArt = a.created_at ? a.created_at.split('T')[0] : hoje;
    urls.push({
      loc: `${SITE_URL}/artigo/${a.id}.html`,
      lastmod: dataArt,
      priority: '0.8',
      changefreq: 'monthly',
    });
  });
  const items = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod || hoje}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

// ============ INJECAO NO INDEX.HTML ============
/**
 * Pega o index.html existente e injeta a lista de artigos diretamente
 * no HTML cru, dentro de uma section marcada com id="prerendered".
 * Essa section fica VISIVEL para o crawler (e para usuarios sem JS),
 * e e ESCONDIDA via JS para usuarios com JS (que veem a versao interativa).
 */
function injectArtigosIntoIndex(indexHtml, artigos) {
  const itensHtml = artigos
    .map((a) => {
      const titulo = esc(a.title || 'Sem titulo');
      const tag = esc(a.tag || '');
      const data = esc(a.date || '');
      const lead = esc(stripHtml(a.excerpt || ''));
      return `      <article class="pr-card">
        <a href="/artigo/${a.id}.html">
          ${tag ? `<span class="pr-tag">${tag}</span>` : ''}
          <h2 class="pr-title">${titulo}</h2>
          ${lead ? `<p class="pr-lead">${lead}</p>` : ''}
          ${data ? `<span class="pr-date">${data}</span>` : ''}
        </a>
      </article>`;
    })
    .join('\n');

  const prerenderedSection = `
<!-- ============================================================
     CONTEUDO PRE-RENDERIZADO PARA CRAWLERS E LEITORES SEM JS
     Esta secao e escondida automaticamente quando o JS roda.
     Gerada por prerender.js em ${new Date().toISOString()}
     ============================================================ -->
<noscript>
  <style>#prerendered{display:block !important}#VI,#VA{display:none !important}</style>
</noscript>
<section id="prerendered" style="display:none">
  <style>
    #prerendered{font-family:'Libre Franklin',sans-serif;max-width:1240px;margin:0 auto;padding:2rem 1.5rem}
    #prerendered h1{font-family:'Playfair Display',serif;font-size:2rem;margin-bottom:.5rem;text-align:center}
    #prerendered .pr-sub{text-align:center;color:#5a5855;font-style:italic;margin-bottom:2.5rem;font-family:'Source Serif 4',serif}
    .pr-card{border-bottom:.5px solid #d8d6d0;padding:1.5rem 0}
    .pr-card a{text-decoration:none;color:inherit;display:block}
    .pr-tag{font-size:.66rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#a4221e;display:block;margin-bottom:.4rem}
    .pr-title{font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:600;line-height:1.2;margin-bottom:.5rem;color:#121212}
    .pr-lead{font-family:'Source Serif 4',serif;font-size:.95rem;line-height:1.6;color:#5a5855;margin-bottom:.5rem}
    .pr-date{font-size:.7rem;color:#8e8b85;text-transform:uppercase;letter-spacing:.04em}
    .pr-card a:hover .pr-title{color:#a4221e}
  </style>
  <h1>Iris de Oliveira</h1>
  <p class="pr-sub">Analise e opiniao independente sobre politica, economia e sociedade brasileira</p>
${itensHtml}
</section>
`;

  // Procura o marcador de comentario e substitui, ou insere logo apos abrir body
  const marker = '<!-- PRERENDER_INJECTION -->';
  if (indexHtml.includes(marker)) {
    return indexHtml.replace(marker, prerenderedSection);
  }
  // Se nao tem marcador, insere logo depois de <body>
  return indexHtml.replace(/<body>/, `<body>\n${prerenderedSection}`);
}

// ============ MAIN ============
async function main() {
  try {
    const artigos = await fetchArtigos();
    if (!artigos.length) {
      console.warn('Nenhum artigo encontrado. Abortando build.');
      process.exit(1);
    }

    // 1. Gerar paginas individuais de artigo
    const artigoDir = path.join(__dirname, 'artigo');
    if (!fs.existsSync(artigoDir)) fs.mkdirSync(artigoDir, { recursive: true });

    let geradas = 0;
    artigos.forEach((a) => {
      const html = renderArtigoPage(a);
      fs.writeFileSync(path.join(artigoDir, `${a.id}.html`), html, 'utf8');
      geradas++;
    });
    console.log(`Geradas ${geradas} paginas de artigo em /artigo/`);

    // 2. Atualizar index.html injetando a lista
    const indexPath = path.join(__dirname, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const indexUpdated = injectArtigosIntoIndex(indexHtml, artigos);
    fs.writeFileSync(indexPath, indexUpdated, 'utf8');
    console.log('index.html atualizado com lista pre-renderizada.');

    // 3. Gerar sitemap.xml
    const sitemap = renderSitemap(artigos);
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
    console.log('sitemap.xml gerado.');

    // 4. Gerar robots.txt (se nao existir)
    const robotsPath = path.join(__dirname, 'robots.txt');
    if (!fs.existsSync(robotsPath)) {
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
      fs.writeFileSync(robotsPath, robots, 'utf8');
      console.log('robots.txt criado.');
    }

    console.log('\nBuild concluido com sucesso.');
  } catch (err) {
    console.error('ERRO durante o build:', err.message);
    process.exit(1);
  }
}

main();
