/**
 * Knix Pool interface.
 * Wallet state is real. Contract reads activate automatically once addresses
 * are configured. Writes route through lib/pool-adapter.js and never simulate.
 */
import { CONTRACTS, POOL_PAIR } from '../config/contracts.js';
import { activeNetwork, explorerUrl } from '../config/network.js';
import { isConfiguredAddress, shortAddress } from '../lib/address.js';
import { toast } from '../lib/motion.js';
import {
  deposit,
  poolReadiness,
  readPosition,
  readReserves,
  readTokenBalance,
  withdraw,
} from '../lib/pool-adapter.js';
import {
  connectWallet,
  formatUnits,
  getNativeBalance,
  initWallet,
  subscribeWallet,
  switchToActiveNetwork,
} from '../lib/wallet.js';

const { assetA: A, assetB: B } = POOL_PAIR;
const native = activeNetwork.nativeCurrency.symbol;
const ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';

const coin = (asset, cls = '') =>
  `<span class="coin coin--${asset === A ? 'a' : 'b'} ${cls}" aria-hidden="true"><span>${asset.symbol.charAt(0)}</span></span>`;

const field = (key, asset) => `
  <div class="field" data-field="${key}">
    <div class="field__top">
      <label for="pool-amount-${key}">Add ${asset.symbol}</label>
      <span class="field__bal">Balance <b data-bal="${key}">Not connected</b></span>
    </div>
    <div class="field__row">
      <input id="pool-amount-${key}" class="field__input" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0" data-amount="${key}" />
      <button type="button" class="field__max" data-max="${key}">Max</button>
      <span class="token-chip">${coin(asset, 'coin--sm')}${asset.symbol}</span>
    </div>
  </div>`;

function template() {
  const poolLink = isConfiguredAddress(CONTRACTS.POOL_ADDRESS) ? explorerUrl('address', CONTRACTS.POOL_ADDRESS) : '';
  return `
  <article class="pool" aria-label="${A.symbol} ${B.symbol} pool">
    <header class="pool__head">
      <div class="pair">
        <span class="pair__coins">${coin(A)}${coin(B)}</span>
        <div>
          <h3 class="pair__name">${A.symbol}<i>/</i>${B.symbol}</h3>
          <p class="pair__meta">${activeNetwork.name}</p>
        </div>
      </div>
      <span class="pill" data-pool-status><span class="dot"></span><span>Contract pending</span></span>
    </header>

    <div class="pool__tabs" role="tablist" aria-label="Pool action">
      <button type="button" role="tab" id="pool-tab-deposit" aria-controls="pool-pane-deposit" aria-selected="true" data-tab="deposit">Deposit</button>
      <button type="button" role="tab" id="pool-tab-withdraw" aria-controls="pool-pane-withdraw" aria-selected="false" tabindex="-1" data-tab="withdraw">Withdraw</button>
      <span class="pool__ink" aria-hidden="true"></span>
    </div>

    <div class="pool__pane" id="pool-pane-deposit" role="tabpanel" aria-labelledby="pool-tab-deposit" data-pane="deposit">
      ${field('a', A)}
      <span class="pool__join" aria-hidden="true">${ICON_PLUS}</span>
      ${field('b', B)}
    </div>

    <div class="pool__pane" id="pool-pane-withdraw" role="tabpanel" aria-labelledby="pool-tab-withdraw" data-pane="withdraw" hidden>
      <div class="withdraw">
        <div class="withdraw__top">
          <label for="pool-range">Withdraw share</label>
          <span class="field__bal">Position <b data-position>Not connected</b></span>
        </div>
        <div class="withdraw__big"><output for="pool-range" data-pct>50</output><span>%</span></div>
        <input id="pool-range" class="range" type="range" min="0" max="100" step="1" value="50" data-range />
        <div class="presets">
          ${[25, 50, 75, 100].map((v) => `<button type="button" data-preset="${v}">${v === 100 ? 'Max' : `${v}%`}</button>`).join('')}
        </div>
        <div class="receive">
          <div>${coin(A, 'coin--sm')}<span>${A.symbol}</span><b data-receive="a">Pending</b></div>
          <div>${coin(B, 'coin--sm')}<span>${B.symbol}</span><b data-receive="b">Pending</b></div>
        </div>
      </div>
    </div>

    <dl class="pool__facts">
      <div><dt>Your share</dt><dd data-share>Connect wallet</dd></div>
      <div><dt>Fee model</dt><dd>Fees accrue to LPs</dd></div>
      <div><dt>Pool</dt><dd>${poolLink ? `<a href="${poolLink}" target="_blank" rel="noopener">${shortAddress(CONTRACTS.POOL_ADDRESS)}</a>` : 'Pending'}</dd></div>
    </dl>

    <ol class="steps" data-steps aria-label="Transaction progress"></ol>

    <button type="button" class="btn btn--primary btn--block pool__cta" data-cta>
      <span data-cta-label>Connect wallet</span>${ICON_ARROW}
    </button>
    <p class="pool__note" data-note role="status" aria-live="polite"></p>
  </article>`;
}

function compositionTemplate() {
  return `
  <div class="comp" data-comp-state="pending">
    <div class="comp__stage" aria-hidden="true">
      <div class="comp__scene">
        <span class="solid solid--graphite comp__plinth"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="solid solid--iris comp__prism comp__prism--a"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="solid solid--pearl comp__prism comp__prism--b"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      </div>
    </div>
    <div class="comp__center">
      <span class="comp__label">Composition</span>
      <span class="comp__value" data-comp-value>Awaiting pool</span>
    </div>
    <ul class="comp__legend">
      <li><span class="swatch swatch--a"></span>${A.symbol}<b data-reserve="a">Pending</b></li>
      <li><span class="swatch swatch--b"></span>${B.symbol}<b data-reserve="b">Pending</b></li>
    </ul>
  </div>`;
}

const sanitize = (value) => {
  const clean = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = clean.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 18)}` : whole;
};

export function mountPool(root = document) {
  const host = root.querySelector('[data-pool]');
  const compHost = root.querySelector('[data-pool-composition]');
  if (compHost) compHost.innerHTML = compositionTemplate();
  if (!host) return;
  host.innerHTML = template();

  const $ = (sel) => host.querySelector(sel);
  const $$ = (sel) => [...host.querySelectorAll(sel)];
  const readiness = poolReadiness();

  const state = {
    tab: 'deposit',
    pct: 50,
    wallet: null,
    balances: { a: null, b: null },
    position: null,
    reserves: null,
    busy: false,
    steps: null,
  };

  /* status pill */
  const status = $('[data-pool-status]');
  if (readiness.ready) {
    status.querySelector('.dot').classList.add('dot--glacier');
    status.lastElementChild.textContent = 'Contracts set';
  } else {
    status.querySelector('.dot').classList.add('dot--iris', 'dot--pulse');
  }

  /* tabs */
  const tabs = $$('[data-tab]');
  const ink = $('.pool__ink');
  function setTab(name, focus = false) {
    state.tab = name;
    tabs.forEach((t, i) => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        ink.style.setProperty('--x', `${i * 100}%`);
        if (focus) t.focus();
      }
    });
    $$('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
    state.steps = null;
    update();
  }
  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
  host.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    setTab(state.tab === 'deposit' ? 'withdraw' : 'deposit', true);
  });

  /* amounts */
  const amount = (key) => Number($(`[data-amount="${key}"]`).value) || 0;
  $$('[data-amount]').forEach((input) =>
    input.addEventListener('input', () => {
      const next = sanitize(input.value);
      if (next !== input.value) input.value = next;
      state.steps = null;
      update();
    }),
  );
  $$('[data-max]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.max;
      const bal = state.balances[key];
      if (typeof bal !== 'bigint') {
        toast(state.wallet?.connected ? 'Balance unavailable' : 'Connect a wallet first', { anchor: btn });
        return;
      }
      $(`[data-amount="${key}"]`).value = formatUnits(bal, (key === 'a' ? A : B).decimals, 6);
      update();
    }),
  );

  /* withdraw range */
  const range = $('[data-range]');
  const setPct = (v, silent = false) => {
    state.pct = Math.max(0, Math.min(100, Number(v)));
    range.value = state.pct;
    range.style.setProperty('--fill', `${state.pct}%`);
    $('[data-pct]').textContent = state.pct;
    if (!silent) update();
  };
  range.addEventListener('input', () => setPct(range.value));
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => setPct(b.dataset.preset)));
  setPct(50, true);

  /* CTA */
  const cta = $('[data-cta]');
  const note = $('[data-note]');

  function ctaState() {
    const w = state.wallet;
    if (!w) return { label: 'Connect wallet', action: 'connect' };
    if (!w.available) return { label: 'Connect wallet', action: 'nowallet' };
    if (!w.connected) return { label: w.connecting ? 'Waiting for wallet' : 'Connect wallet', action: 'connect', busy: w.connecting };
    if (!w.onActiveChain) return { label: `Switch to ${activeNetwork.shortName}`, action: 'switch' };
    if (!readiness.ready) return { label: 'Pool contract pending', action: 'pending', soft: true };
    if (state.busy) return { label: 'Confirm in wallet', busy: true };
    if (state.tab === 'deposit' && !(amount('a') > 0 || amount('b') > 0)) return { label: 'Enter an amount', soft: true, action: 'amount' };
    if (state.tab === 'withdraw' && !(state.position?.balance > 0n)) return { label: 'No position yet', soft: true, action: 'noposition' };
    return { label: state.tab === 'deposit' ? 'Supply liquidity' : 'Withdraw liquidity', action: 'submit' };
  }

  function stepList() {
    return state.tab === 'deposit'
      ? [`Approve ${A.symbol}`, `Approve ${B.symbol}`, 'Supply', 'Confirmed']
      : ['Sign', 'Withdraw', 'Confirmed'];
  }

  function renderSteps() {
    const list = stepList();
    const s = state.steps; // { index, status }
    $('[data-steps]').innerHTML = list
      .map((label, i) => {
        let st = 'idle';
        if (s) st = i < s.index ? 'done' : i === s.index ? s.status : 'idle';
        return `<li data-step="${st}"><span class="steps__dot"></span><span>${label}</span></li>`;
      })
      .join('');
  }

  cta.addEventListener('click', async () => {
    const { action } = ctaState();
    if (action === 'nowallet') return toast('No wallet detected', { anchor: cta });
    if (action === 'connect') return connectWallet();
    if (action === 'switch') return switchToActiveNetwork();
    if (action === 'pending') return toast('Pool contract not deployed yet', { anchor: cta });
    if (action === 'amount') return $('[data-amount="a"]').focus();
    if (action === 'noposition') return toast('No liquidity to withdraw', { anchor: cta });
    if (action !== 'submit') return;

    state.busy = true;
    state.steps = { index: 0, status: 'active' };
    update();
    try {
      if (state.tab === 'deposit') await deposit({ amountA: amount('a'), amountB: amount('b'), account: state.wallet.account });
      else await withdraw({ shareBps: state.pct * 100, account: state.wallet.account });
      state.steps = { index: stepList().length, status: 'done' };
    } catch (err) {
      state.steps = { index: state.steps.index, status: 'error' };
      note.textContent = err?.message || 'Transaction failed';
    } finally {
      state.busy = false;
      update();
    }
  });

  /* data reads */
  async function refreshBalances() {
    const w = state.wallet;
    if (!w?.connected || !w.onActiveChain) {
      state.balances = { a: null, b: null };
      return;
    }
    const read = async (asset) => {
      if (!isConfiguredAddress(asset.address)) return asset.symbol === native ? getNativeBalance(w.account) : 'pending';
      return readTokenBalance(asset.address, w.account);
    };
    const [a, b] = await Promise.all([read(A), read(B)]);
    state.balances = { a, b };
  }

  async function refreshPool() {
    if (!readiness.pool) return;
    const [position, reserves] = await Promise.all([readPosition(state.wallet?.account), readReserves()]);
    state.position = position;
    state.reserves = reserves;
  }

  function balLabel(key) {
    const w = state.wallet;
    const v = state.balances[key];
    if (!w?.connected) return 'Not connected';
    if (!w.onActiveChain) return 'Wrong network';
    if (v === 'pending') return 'Token pending';
    if (typeof v !== 'bigint') return 'Unavailable';
    return formatUnits(v, (key === 'a' ? A : B).decimals);
  }

  function update() {
    const w = state.wallet;
    $('[data-bal="a"]').textContent = balLabel('a');
    $('[data-bal="b"]').textContent = balLabel('b');

    const { position, reserves } = state;
    let share = 'Connect wallet';
    if (w?.connected) share = !readiness.pool ? 'Pool pending' : position?.supply > 0n ? `${(Number((position.balance * 1000000n) / position.supply) / 10000).toFixed(2)}%` : 'No position';
    $('[data-share]').textContent = share;
    $('[data-position]').textContent = !w?.connected ? 'Not connected' : !readiness.pool ? 'Pool pending' : position?.balance > 0n ? formatUnits(position.balance, 18) : 'None';

    ['a', 'b'].forEach((key) => {
      const reserve = reserves?.[key];
      let text = 'Pending';
      if (reserve != null && position?.supply > 0n && position.balance > 0n) {
        const out = (reserve * position.balance * BigInt(state.pct)) / (position.supply * 100n);
        text = formatUnits(out, (key === 'a' ? A : B).decimals);
      }
      $(`[data-receive="${key}"]`).textContent = text;
    });

    const c = ctaState();
    $('[data-cta-label]').textContent = c.label;
    cta.setAttribute('aria-disabled', String(Boolean(c.soft || c.busy)));
    cta.classList.toggle('is-soft', Boolean(c.soft));
    cta.classList.toggle('is-busy', Boolean(c.busy));
    if (!state.steps) note.textContent = w?.error || '';
    renderSteps();
    updateComposition();
  }

  function updateComposition() {
    if (!compHost) return;
    const comp = compHost.querySelector('.comp');
    const r = state.reserves;
    if (!r) return;
    comp.dataset.compState = 'live';
    compHost.querySelector('[data-reserve="a"]').textContent = formatUnits(r.a, A.decimals, 2);
    compHost.querySelector('[data-reserve="b"]').textContent = formatUnits(r.b, B.decimals, 2);
    compHost.querySelector('[data-comp-value]').textContent = 'Live reserves';
  }

  let lastKey = '';
  subscribeWallet(async (w) => {
    state.wallet = w;
    update();
    const key = `${w.account}:${w.chainId}`;
    if (key === lastKey) return;
    lastKey = key;
    await Promise.all([refreshBalances(), refreshPool()]);
    update();
  });
  initWallet();
}
