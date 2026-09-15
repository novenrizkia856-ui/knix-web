import './styles/base.css';
import './styles/pool.css';
import './styles/modules.css';
import './styles/landing.css';

import { mountContractAddress } from './components/contract-address.js';
import { initNav } from './components/nav.js';
import { mountPool } from './components/pool.js';
import { CONTRACTS } from './config/contracts.js';
import { activeNetwork, explorerUrl } from './config/network.js';
import { isConfiguredAddress, shortAddress } from './lib/address.js';
import { initMotion, reducedMotion, toast } from './lib/motion.js';
import { latestBlock } from './lib/rpc.js';
import { initWallet, subscribeWallet, switchToActiveNetwork } from './lib/wallet.js';

/* Network facts, always from config */
function renderNetworkFacts() {
  const host = (() => {
    try {
      return new URL(activeNetwork.rpcUrl).host;
    } catch {
      return 'Not set';
    }
  })();
  const facts = {
    name: activeNetwork.name,
    chainId: String(activeNetwork.chainId),
    gas: activeNetwork.nativeCurrency.symbol,
    rpcHost: host,
  };
  document.querySelectorAll('[data-net]').forEach((el) => (el.textContent = facts[el.dataset.net] ?? ''));
  document.querySelectorAll('[data-net-explorer]').forEach((a) => {
    if (activeNetwork.blockExplorerUrl) a.href = activeNetwork.blockExplorerUrl;
    else a.hidden = true;
  });
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
}

/* Contract registry mirrors config; nothing is invented */
function renderRegistry() {
  const list = document.querySelector('[data-registry]');
  if (!list) return;
  const rows = [
    ['Token', CONTRACTS.KNIX_TOKEN_ADDRESS],
    ['Pool', CONTRACTS.POOL_ADDRESS],
    ['Router', CONTRACTS.ROUTER_ADDRESS],
    ['Vault', CONTRACTS.VAULT_ADDRESS],
    ['Staking', CONTRACTS.STAKING_ADDRESS],
    ['Governor', CONTRACTS.GOVERNOR_ADDRESS],
  ];
  let live = 0;
  list.innerHTML = rows
    .map(([label, address]) => {
      const ok = isConfiguredAddress(address);
      if (ok) live += 1;
      const value = ok
        ? `<a href="${explorerUrl('address', address)}" target="_blank" rel="noopener" class="mono">${shortAddress(address)}</a>`
        : '<span class="registry__pending">Pending</span>';
      return `<li><span class="dot ${ok ? 'dot--warm' : ''}"></span><span>${label}</span>${value}</li>`;
    })
    .join('');
  const count = document.querySelector('[data-registry-count]');
  if (count) count.textContent = `${live} of ${rows.length} set`;
}

/* Real read from the public RPC, degrades quietly */
function watchBlock() {
  const out = document.querySelector('[data-block]');
  const dot = document.querySelector('[data-block-dot]');
  const section = document.querySelector('#chain');
  if (!out || !section) return;
  let timer = 0;
  const tick = async () => {
    const block = await latestBlock();
    if (block == null) {
      out.textContent = 'Unavailable';
      dot.className = 'dot';
    } else {
      out.textContent = block.toLocaleString('en-US');
      dot.className = 'dot dot--warm';
    }
  };
  new IntersectionObserver(([entry]) => {
    clearInterval(timer);
    if (!entry.isIntersecting) return;
    tick();
    timer = setInterval(tick, 12000);
  }).observe(section);
}

/* Expanding deck, adapted from the reference card deck motion */
function initDeck() {
  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  const cards = [...deck.querySelectorAll('[data-deck-card]')];
  const wide = window.matchMedia('(min-width: 1100px)');
  const activate = (index) => {
    cards.forEach((card, i) => {
      const on = i === index;
      card.classList.toggle('is-active', on);
      card.querySelector('.deck__trigger').setAttribute('aria-expanded', String(on || !wide.matches));
    });
    deck.style.setProperty('--cols', cards.map((_, i) => (i === index ? '3.4fr' : '1fr')).join(' '));
  };
  cards.forEach((card, i) => {
    card.addEventListener('pointerenter', () => wide.matches && activate(i));
    card.querySelector('.deck__trigger').addEventListener('click', () => activate(i));
    card.addEventListener('focusin', () => wide.matches && activate(i));
  });
  wide.addEventListener('change', () => activate(cards.findIndex((c) => c.classList.contains('is-active'))));
  activate(0);
}

function initChainActions() {
  const btn = document.querySelector('[data-add-network]');
  if (!btn) return;
  let wallet;
  subscribeWallet((w) => (wallet = w));
  btn.addEventListener('click', () => {
    if (!wallet?.available) return toast('No wallet detected', { anchor: btn });
    switchToActiveNetwork();
  });
}

/* Hero liquid surface loads after first paint */
function loadHeroSurface() {
  const stage = document.querySelector('[data-scene="hero"]');
  if (!stage) return;
  const go = () =>
    import('./three/liquid-scene.js')
      .then(({ mountLiquidScene }) => mountLiquidScene(stage, { reduced: reducedMotion() }))
      .catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 });
  else setTimeout(go, 300);
}

/* Photographic section renders share one WebGL overlay */
function loadViews() {
  if (!document.querySelector('[data-gl]')) return;
  const go = () => import('./three/views.js').then(({ initViews }) => initViews()).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 600);
}

/* CTA silk loads when the section nears the viewport */
function loadCtaSilk() {
  const stage = document.querySelector('[data-silk]');
  if (!stage || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    import('./three/silk-scene.js')
      .then(({ mountSilk }) => mountSilk(stage, { reduced: reducedMotion() }))
      .catch(() => {});
  }, { rootMargin: '600px 0px' });
  io.observe(stage);
}

renderNetworkFacts();
renderRegistry();
initNav();
mountContractAddress();
mountPool();
initDeck();
initMotion();
initWallet();
initChainActions();
watchBlock();
loadHeroSurface();
loadViews();
loadCtaSilk();
