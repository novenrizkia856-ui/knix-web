import './styles/base.css';
import './styles/pool.css';
import './styles/modules.css';
import './styles/app.css';

import { mountContractAddress } from './components/contract-address.js';
import { mountPool } from './components/pool.js';
import { CONTRACTS, POOL_PAIR } from './config/contracts.js';
import { activeNetwork, explorerUrl } from './config/network.js';
import { isConfiguredAddress, shortAddress } from './lib/address.js';
import { initMotion, toast } from './lib/motion.js';
import { connectWallet, disconnectWallet, initWallet, subscribeWallet, switchToActiveNetwork } from './lib/wallet.js';

const ROUTES = {
  pool: { title: 'Pool', eyebrow: 'Core' },
  swap: { title: 'Swap', eyebrow: 'Module' },
  stake: { title: 'Stake', eyebrow: 'Module' },
  vote: { title: 'Vote', eyebrow: 'Module' },
  agents: { title: 'Agents', eyebrow: 'Module' },
  markets: { title: 'Markets', eyebrow: 'Module' },
  analytics: { title: 'Analytics', eyebrow: 'Insight' },
  profile: { title: 'Profile', eyebrow: 'Account' },
};

function route(focus) {
  const name = location.hash.slice(1);
  const current = ROUTES[name] ? name : 'pool';
  document.querySelectorAll('[data-view]').forEach((v) => (v.hidden = v.dataset.view !== current));
  document.querySelectorAll('[data-route]').forEach((a) =>
    a.setAttribute('aria-current', a.dataset.route === current ? 'page' : 'false'),
  );
  const title = document.querySelector('[data-view-title]');
  title.textContent = ROUTES[current].title;
  document.querySelector('[data-view-eyebrow]').textContent = ROUTES[current].eyebrow;
  document.title = `Knix App | ${ROUTES[current].title}`;
  const view = document.querySelector(`[data-view="${current}"]`);
  view.classList.remove('is-entering');
  void view.offsetWidth;
  view.classList.add('is-entering');
  if (focus) title.focus({ preventScroll: true });
}

function renderReadiness() {
  const list = document.querySelector('[data-readiness]');
  const rows = [
    ['Pool', CONTRACTS.POOL_ADDRESS],
    [`${POOL_PAIR.assetA.symbol} token`, POOL_PAIR.assetA.address],
    [`${POOL_PAIR.assetB.symbol} token`, POOL_PAIR.assetB.address],
    ['Router', CONTRACTS.ROUTER_ADDRESS],
  ];
  const set = rows.filter(([, a]) => isConfiguredAddress(a)).length;
  list.innerHTML = rows
    .map(([label, address]) => {
      const ok = isConfiguredAddress(address);
      return `<li><span class="dot ${ok ? 'dot--glacier' : ''}"></span>${label}<b>${ok ? `<a href="${explorerUrl('address', address)}" target="_blank" rel="noopener">${shortAddress(address)}</a>` : 'Pending'}</b></li>`;
    })
    .join('');
  document.querySelector('[data-ready-count]').textContent = `${set} of ${rows.length}`;
}

function renderRegistry() {
  const list = document.querySelector('[data-registry]');
  const rows = Object.entries(CONTRACTS);
  let set = 0;
  list.innerHTML = rows
    .map(([key, address]) => {
      const ok = isConfiguredAddress(address);
      if (ok) set += 1;
      const label = key.replace(/_ADDRESS$/, '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
      return `<li><span class="dot ${ok ? 'dot--glacier' : ''}"></span>${label}<b>${ok ? shortAddress(address) : 'Pending'}</b></li>`;
    })
    .join('');
  document.querySelector('[data-registry-count]').textContent = `${set} of ${rows.length}`;
}

function initWalletUi() {
  const buttons = document.querySelectorAll('[data-wallet]');
  const netLabel = document.querySelector('[data-net-label]');
  const netDot = document.querySelector('[data-net-dot]');
  let state;

  subscribeWallet((w) => {
    state = w;
    let label = 'Connect wallet';
    if (w.connecting) label = 'Waiting for wallet';
    else if (w.connected && !w.onActiveChain) label = 'Switch network';
    else if (w.connected) label = shortAddress(w.account);
    buttons.forEach((b) => {
      b.textContent = label;
      b.classList.toggle('btn--ghost', w.connected && w.onActiveChain);
      b.classList.toggle('btn--primary', !(w.connected && w.onActiveChain));
    });

    netLabel.textContent = w.connected && !w.onActiveChain ? 'Wrong network' : activeNetwork.name;
    netDot.className = `dot ${w.connected && w.onActiveChain ? 'dot--glacier' : w.connected ? '' : 'dot--iris'}`;

    const profile = (k, v) => (document.querySelector(`[data-profile="${k}"]`).textContent = v);
    profile('address', w.connected ? shortAddress(w.account, 10, 8) : 'Not connected');
    profile('network', !w.connected ? 'Not connected' : w.onActiveChain ? activeNetwork.name : `Chain ${w.chainId}`);
    profile('position', isConfiguredAddress(CONTRACTS.POOL_ADDRESS) ? 'See Pool' : 'Pool pending');
  });

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      if (!state?.available) return toast('No wallet detected', { anchor: b });
      if (!state.connected) return connectWallet();
      if (!state.onActiveChain) return switchToActiveNetwork();
      disconnectWallet();
      toast('Disconnected');
    }),
  );
}

document.querySelectorAll('[data-pending]').forEach((b) =>
  b.addEventListener('click', () => toast(b.dataset.pending, { anchor: b })),
);

window.addEventListener('hashchange', () => route(true));
route(false);
mountContractAddress();
mountPool();
renderReadiness();
renderRegistry();
initWalletUi();
initWallet();
initMotion();
