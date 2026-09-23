import './styles/base.css';
import './styles/pool.css';
import './styles/modules.css';
import './styles/app.css';

import { mountContractAddress } from './components/contract-address.js';
import { mountPool } from './components/pool.js';
import { ACCOUNTS, activeNetwork, explorerUrl } from './config/solana.js';
import { isConfiguredAddress, shortAddress, writeClipboard } from './lib/address.js';
import { formatUnits, readToken, readTokenBalance } from './lib/knix.js';
import { initMotion, toast } from './lib/motion.js';
import { readSolBalance } from './lib/rpc.js';
import { connectWallet, disconnectWallet, initWallet, subscribeWallet } from './lib/wallet.js';

const ACCOUNT_ROWS = [
  ['Knix program', ACCOUNTS.PROGRAM_ID],
  ['$KNIX mint', ACCOUNTS.TOKEN_MINT],
  ['Treasury', ACCOUNTS.TREASURY_ADDRESS],
];

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
  const rows = ACCOUNT_ROWS;
  const set = rows.filter(([, a]) => isConfiguredAddress(a)).length;
  list.innerHTML = rows
    .map(([label, address]) => {
      const ok = isConfiguredAddress(address);
      return `<li><span class="dot ${ok ? 'dot--warm' : ''}"></span>${label}<b>${ok ? `<a href="${explorerUrl('address', address)}" target="_blank" rel="noopener">${shortAddress(address)}</a>` : 'Pending'}</b></li>`;
    })
    .join('');
  document.querySelector('[data-ready-count]').textContent = `${set} of ${rows.length}`;
}

function renderRegistry() {
  const list = document.querySelector('[data-registry]');
  const rows = ACCOUNT_ROWS;
  let set = 0;
  list.innerHTML = rows
    .map(([label, address]) => {
      const ok = isConfiguredAddress(address);
      if (ok) set += 1;
      return `<li><span class="dot ${ok ? 'dot--warm' : ''}"></span>${label}<b>${ok ? shortAddress(address) : 'Pending'}</b></li>`;
    })
    .join('');
  document.querySelector('[data-registry-count]').textContent = `${set} of ${rows.length}`;
}

function initWalletUi() {
  const buttons = document.querySelectorAll('[data-wallet]');
  const netLabel = document.querySelector('[data-net-label]');
  const netDot = document.querySelector('[data-net-dot]');
  const copyKey = document.querySelector('[data-copy-key]');
  const tokenRow = document.querySelector('[data-profile-token]');
  const mintLive = isConfiguredAddress(ACCOUNTS.TOKEN_MINT);
  if (!mintLive) tokenRow?.remove();
  const mint = mintLive ? readToken(ACCOUNTS.TOKEN_MINT) : null;
  let state;

  const profile = (k, v) => {
    const el = document.querySelector(`[data-profile="${k}"]`);
    if (el) el.textContent = v;
  };

  /* Read only balances for the connected key */
  let balanceRun = 0;
  async function refreshBalances(account) {
    const run = ++balanceRun;
    if (!account) {
      profile('balance', 'Not connected');
      profile('token', 'Not connected');
      return;
    }
    profile('balance', 'Reading');
    if (mintLive) profile('token', 'Reading');
    const [lamports, token, raw] = await Promise.all([
      readSolBalance(account),
      mint,
      mintLive ? readTokenBalance(ACCOUNTS.TOKEN_MINT, account) : null,
    ]);
    if (run !== balanceRun) return;
    profile('balance', lamports == null ? 'Unavailable' : `${formatUnits(lamports, activeNetwork.nativeCurrency.decimals, 4)} SOL`);
    if (mintLive) profile('token', raw == null || !token ? 'Unavailable' : `${formatUnits(raw, token.decimals, 4)} KNIX`);
  }

  let lastError = '';
  let lastAccount = null;
  subscribeWallet((w) => {
    state = w;
    if (w.error && w.error !== lastError) toast(w.error);
    lastError = w.error;
    let label = 'Connect wallet';
    if (w.connecting) label = 'Waiting for wallet';
    else if (w.connected) label = shortAddress(w.account);
    buttons.forEach((b) => {
      b.textContent = label;
      b.classList.toggle('btn--ghost', w.connected);
      b.classList.toggle('btn--primary', !w.connected);
    });

    netLabel.textContent = activeNetwork.name;
    netDot.className = `dot ${w.connected ? 'dot--warm' : 'dot--accent'}`;

    profile('address', w.connected ? shortAddress(w.account, 10, 8) : 'Not connected');
    if (copyKey) copyKey.title = w.connected ? 'Copy public key' : '';
    profile('network', !w.connected ? 'Not connected' : `${activeNetwork.name} ${activeNetwork.clusterLabel}`);
    profile('position', isConfiguredAddress(ACCOUNTS.PROGRAM_ID) ? 'See Pool' : 'Knix pending');

    if (w.account !== lastAccount) {
      lastAccount = w.account;
      refreshBalances(w.account);
    }
  });

  copyKey?.addEventListener('click', async () => {
    if (!state?.connected) return;
    const ok = await writeClipboard(state.account);
    toast(ok ? 'Public key copied' : 'Copy failed', { anchor: copyKey, tone: ok ? 'success' : undefined });
  });

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      if (!state?.available) return toast('No Solana wallet detected', { anchor: b });
      if (!state.connected) return connectWallet();
      disconnectWallet();
      toast('Disconnected');
    }),
  );
}

/* Photographic section renders share one WebGL overlay */
function loadViews() {
  if (!document.querySelector('[data-gl]')) return;
  const go = () => import('./three/views.js').then(({ initViews }) => initViews()).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 600);
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
loadViews();
