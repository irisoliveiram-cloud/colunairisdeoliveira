/**
 * cookies.js
 *
 * Banner de consentimento de cookies + Google Consent Mode v2
 *
 * Como funciona:
 *  - Na primeira visita, exibe banner no rodape com botoes Aceitar / Recusar / Saber mais.
 *  - A escolha do usuario e salva em localStorage por 365 dias.
 *  - Aceita -> anuncios personalizados (consent: granted)
 *  - Recusa -> anuncios nao personalizados (consent: denied)
 *  - Em visitas futuras, o banner nao aparece (a menos que a escolha expire).
 *
 * Importante:
 *  Este arquivo deve ser carregado em TODAS as paginas do site, ANTES do script do AdSense.
 *  O Consent Mode v2 do Google e o padrao recomendado para conformidade com LGPD/GDPR.
 */

(function () {
  'use strict';

  // ============ GOOGLE CONSENT MODE v2 ============
  // Define o estado inicial: tudo negado por padrao, ate o usuario decidir.
  // Isso e o que o Google chama de "consent default" e e obrigatorio
  // para que o AdSense interprete corretamente o consentimento.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });

  // ============ CONFIGURACAO ============
  var STORAGE_KEY = 'cookieConsent_v1';
  var EXPIRY_DAYS = 365;

  // ============ STORAGE ============
  function lerConsentimento() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var dado = JSON.parse(raw);
      if (!dado || !dado.escolha || !dado.expira) return null;
      if (Date.now() > dado.expira) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return dado.escolha;
    } catch (e) {
      return null;
    }
  }

  function gravarConsentimento(escolha) {
    try {
      var expira = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ escolha: escolha, expira: expira }));
    } catch (e) {
      // Se o localStorage estiver bloqueado, apenas aplica para a sessao atual.
    }
  }

  // ============ APLICAR ESCOLHA ============
  function aplicar(escolha) {
    if (escolha === 'aceitar') {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      });
    } else {
      // Recusar: AdSense funciona, mas em modo de anuncios nao personalizados
      gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      });
    }
  }

  // ============ BANNER ============
  function injetarEstilo() {
    if (document.getElementById('cookie-banner-style')) return;
    var s = document.createElement('style');
    s.id = 'cookie-banner-style';
    s.textContent = [
      '#cookie-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#121212;color:#f0ede8;font-family:"Libre Franklin",-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 -2px 24px rgba(0,0,0,.18);transform:translateY(100%);transition:transform .35s cubic-bezier(.2,.7,.3,1)}',
      '#cookie-banner.visivel{transform:translateY(0)}',
      '#cookie-banner .cb-wrap{max-width:1240px;margin:0 auto;padding:1.1rem 1.5rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap}',
      '#cookie-banner .cb-text{flex:1;min-width:260px;font-size:.86rem;line-height:1.55;color:#e8e5df}',
      '#cookie-banner .cb-text strong{font-family:"Playfair Display",Georgia,serif;font-weight:700;color:#fff;display:block;margin-bottom:.15rem;font-size:.95rem}',
      '#cookie-banner .cb-text a{color:#d65656;text-decoration:underline;text-underline-offset:2px}',
      '#cookie-banner .cb-text a:hover{color:#fff}',
      '#cookie-banner .cb-actions{display:flex;gap:.55rem;flex-wrap:wrap}',
      '#cookie-banner .cb-btn{font-family:inherit;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.65rem 1.15rem;border-radius:0;cursor:pointer;border:.5px solid transparent;transition:all .15s;white-space:nowrap}',
      '#cookie-banner .cb-accept{background:#f0ede8;color:#121212;border-color:#f0ede8}',
      '#cookie-banner .cb-accept:hover{background:#fff;color:#000}',
      '#cookie-banner .cb-reject{background:transparent;color:#e8e5df;border-color:rgba(255,255,255,.3)}',
      '#cookie-banner .cb-reject:hover{border-color:#fff;color:#fff}',
      '@media(max-width:620px){#cookie-banner .cb-wrap{padding:1rem 1.1rem;gap:1rem}#cookie-banner .cb-text{font-size:.82rem;min-width:100%}#cookie-banner .cb-actions{width:100%}#cookie-banner .cb-btn{flex:1;text-align:center}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function montarBanner() {
    if (document.getElementById('cookie-banner')) return;
    injetarEstilo();
    var b = document.createElement('div');
    b.id = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Aviso de cookies');
    b.innerHTML =
      '<div class="cb-wrap">' +
      '<div class="cb-text">' +
      '<strong>Cookies neste site</strong>' +
      'Usamos cookies essenciais para o funcionamento do site e cookies de terceiros (Google AdSense) para personalizar anúncios e medir audiência. Você pode aceitar ou recusar a qualquer momento. Detalhes na <a href="/privacidade.html">Política de Privacidade</a>.' +
      '</div>' +
      '<div class="cb-actions">' +
      '<button class="cb-btn cb-reject" type="button" id="cb-btn-reject">Recusar</button>' +
      '<button class="cb-btn cb-accept" type="button" id="cb-btn-accept">Aceitar</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(b);

    document.getElementById('cb-btn-accept').addEventListener('click', function () {
      gravarConsentimento('aceitar');
      aplicar('aceitar');
      esconderBanner();
    });
    document.getElementById('cb-btn-reject').addEventListener('click', function () {
      gravarConsentimento('recusar');
      aplicar('recusar');
      esconderBanner();
    });

    // Pequeno delay para animacao de entrada ser visivel
    setTimeout(function () { b.classList.add('visivel'); }, 50);
  }

  function esconderBanner() {
    var b = document.getElementById('cookie-banner');
    if (!b) return;
    b.classList.remove('visivel');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
  }

  // ============ FUNCAO PUBLICA PARA REABRIR O BANNER ============
  // Pode ser chamada de um link "Alterar preferencias de cookies" no rodape:
  //   <a href="#" onclick="reabrirCookies();return false;">Preferencias de cookies</a>
  window.reabrirCookies = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    if (!document.getElementById('cookie-banner')) montarBanner();
  };

  // ============ INICIALIZACAO ============
  function init() {
    var escolha = lerConsentimento();
    if (escolha) {
      aplicar(escolha);
      return; // Ja tem decisao salva, nao mostra banner
    }
    // Sem decisao: aguardar DOM e exibir banner
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', montarBanner);
    } else {
      montarBanner();
    }
  }

  init();
})();
