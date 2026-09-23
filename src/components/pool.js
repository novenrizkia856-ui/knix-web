/**
 * Knix Pool interface on Solana.
 *
 * Lock an SPL tokenized stock with a chosen cooldown. A withdrawal requested while
 * the US market is open settles instantly; outside market hours it queues and
 * unlocks at the cooldown or the next open, whichever comes first.
 *
 * Wallet connection and reads are live (SPL mint data and balances from the
 * Solana RPC). Execution is not: there is no Knix program on Solana yet, so the
 * lock action validates the input, shows what it would do and stops there.
 * Nothing is signed or sent.
 */
import { ACCOUNTS, COOLDOWN_OPTIONS, activeNetwork, explorerUrl } from '../config/solana.js';
import { shortAddress } from '../lib/address.js';
import * as knix from '../lib/knix.js';
import { toast } from '../lib/motion.js';
import { connectWallet, initWallet, preloadWallet, subscribeWallet } from '../lib/wallet.js';

const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
const STEPS = ['Review', 'Sign', 'Confirmed'];
const NOT_LIVE = 'Solana execution will be enabled later. Nothing was signed or sent.';

const tokenCache = new Map();

const clock = (seconds) => {
  if (seconds <= 0) return 'now';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
};

const cooldownLabel = (seconds) => COOLDOWN_OPTIONS.find((o) => o.seconds === seconds)?.label || clock(seconds);

const sanitizeAmount = (value) => {
  const clean = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = clean.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 18)}` : whole;
};

function template() {
  const live = knix.knixDeployed();
  const programLink = live ? explorerUrl('address', ACCOUNTS.PROGRAM_ID) : '';
  return `
  <article class="pool" aria-label="Knix position">
    <header class="pool__head">
      <div class="pair">
        <span class="pair__coins"><span class="coin" aria-hidden="true"><svg class="coin__glyph" viewBox="0 0 1000 897.7" aria-hidden="true" focusable="false"><path d="M0 0 255.4 0 255.4 205.3 0 452.8Z"/><path d="M645.2 0 1000 0 372.7 636.6 1000 637.3 1000 897.7 0 897.7 0 649.5Z"/></svg></span></span>
        <div>
          <h3 class="pair__name">Lock a position</h3>
          <p class="pair__meta">${activeNetwork.name}</p>
        </div>
      </div>
      <span class="pill" data-market><span class="dot dot--accent dot--pulse"></span><span>Reading market</span></span>
    </header>

    <div class="pool__tabs" role="tablist" aria-label="Pool action">
      <button type="button" role="tab" id="pool-tab-lock" aria-controls="pool-pane-lock" aria-selected="true" data-tab="lock">Lock</button>
      <button type="button" role="tab" id="pool-tab-positions" aria-controls="pool-pane-positions" aria-selected="false" tabindex="-1" data-tab="positions">Positions <b data-count></b></button>
      <span class="pool__ink" aria-hidden="true"></span>
    </div>

    <div class="pool__pane" id="pool-pane-lock" role="tabpanel" aria-labelledby="pool-tab-lock" data-pane="lock">
      <div class="field">
        <div class="field__top">
          <label for="pool-token">Tokenized stock</label>
          <span class="field__bal" data-token-state>Paste a token mint</span>
        </div>
        <div class="field__row">
          <input id="pool-token" class="field__input field__input--address" type="text" spellcheck="false" autocomplete="off" placeholder="Mint address" data-token-input />
          <span class="token-chip" data-token-chip hidden><span class="coin coin--sm" aria-hidden="true"><span>?</span></span><b></b></span>
        </div>
      </div>

      <div class="field">
        <div class="field__top">
          <label for="pool-amount">Amount to lock</label>
          <span class="field__bal">Balance <b data-balance>Not connected</b></span>
        </div>
        <div class="field__row">
          <input id="pool-amount" class="field__input" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0" data-amount />
          <button type="button" class="field__max" data-max>Max</button>
        </div>
      </div>

      <div class="field">
        <div class="field__top">
          <span id="pool-cooldown-label">Cooldown outside market hours</span>
          <span class="field__bal" data-bounds></span>
        </div>
        <div class="chips" role="group" aria-labelledby="pool-cooldown-label">
          ${COOLDOWN_OPTIONS.map(
            (o, i) =>
              `<button type="button" class="chip${i === 1 ? ' is-on' : ''}" data-cooldown="${o.seconds}" aria-pressed="${i === 1}">${o.label}</button>`,
          ).join('')}
        </div>
        <div class="field__row field__row--tip">
          <label class="tip" for="pool-tip">Finalizer tip <span>optional</span></label>
          <input id="pool-tip" class="field__input field__input--tip" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0" data-tip />
          <span class="token-chip">${activeNetwork.nativeCurrency.symbol}</span>
        </div>
      </div>
    </div>

    <div class="pool__pane" id="pool-pane-positions" role="tabpanel" aria-labelledby="pool-tab-positions" data-pane="positions" hidden>
      <div class="positions" data-positions></div>
    </div>

    <dl class="pool__facts">
      <div><dt>Instant when</dt><dd>Market open</dd></div>
      <div><dt>Delay when</dt><dd>Market closed</dd></div>
      <div><dt>Program</dt><dd>${programLink ? `<a href="${programLink}" target="_blank" rel="noopener">${shortAddress(ACCOUNTS.PROGRAM_ID)}</a>` : 'Pending'}</dd></div>
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
    <div class="comp__stage" aria-hidden="true" data-gl="composition">
      <div class="comp__scene">
        <span class="solid solid--graphite comp__plinth"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="solid solid--accent comp__prism comp__prism--a"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="solid solid--pearl comp__prism comp__prism--b"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      </div>
    </div>
    <div class="comp__center">
      <span class="comp__label">Market</span>
      <span class="comp__value" data-comp-value>Reading</span>
    </div>
    <ul class="comp__legend">
      <li><span class="swatch swatch--a"></span>Locked<b data-comp-locked>0</b></li>
      <li><span class="swatch swatch--b"></span>Queued<b data-comp-queued>0</b></li>
    </ul>
  </div>`;
}

export function mountPool(root = document) {
  const host = root.querySelector('[data-pool]');
  const compHost = root.querySelector('[data-pool-composition]');
  if (compHost) compHost.innerHTML = compositionTemplate();
  if (!host) return;
  host.innerHTML = template();

  const $ = (sel) => host.querySelector(sel);
  const $$ = (sel) => [...host.querySelectorAll(sel)];

  const state = {
    tab: 'lock',
    wallet: null,
    token: null,
    balance: null,
    cooldown: COOLDOWN_OPTIONS[1].seconds,
    market: knix.readMarket(),
    steps: null,
  };

  /* ───────── tabs ───────── */
  const tabs = $$('[data-tab]');
  const ink = $('.pool__ink');
  function setTab(name, focus = false) {
    state.tab = name;
    tabs.forEach((tab, i) => {
      const on = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        ink.style.setProperty('--x', `${i * 100}%`);
        if (focus) tab.focus();
      }
    });
    $$('[data-pane]').forEach((pane) => (pane.hidden = pane.dataset.pane !== name));
    state.steps = null;
    update();
  }
  tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
  host.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    setTab(state.tab === 'lock' ? 'positions' : 'lock', true);
  });

  /* ───────── inputs ───────── */
  const tokenInput = $('[data-token-input]');
  const amountInput = $('[data-amount]');
  const tipInput = $('[data-tip]');

  const amountRaw = () => {
    if (!state.token) return 0n;
    const value = amountInput.value.trim();
    if (!value || Number(value) <= 0) return 0n;
    try {
      return knix.parseUnits(value, state.token.decimals);
    } catch {
      return 0n;
    }
  };

  let tokenRun = 0;
  async function resolveToken() {
    const address = tokenInput.value.trim();
    const run = ++tokenRun;
    state.token = null;
    state.balance = null;
    state.steps = null;
    const chip = $('[data-token-chip]');
    const label = $('[data-token-state]');
    if (!address) {
      chip.hidden = true;
      label.textContent = 'Paste a token mint';
      return update();
    }
    if (!knix.isPublicKey(address)) {
      chip.hidden = true;
      label.textContent = 'Not a valid Solana address';
      return update();
    }
    label.textContent = 'Reading mint';
    update();
    const token = tokenCache.get(address) || (await knix.readToken(address));
    if (run !== tokenRun) return;
    if (!token) {
      chip.hidden = true;
      label.textContent = 'No SPL mint found at that address';
      return update();
    }
    tokenCache.set(address, token);
    state.token = token;
    chip.hidden = false;
    chip.querySelector('.coin span').textContent = token.symbol.charAt(0);
    chip.querySelector('b').textContent = token.symbol;
    label.textContent = `${token.symbol}, ${token.decimals} decimals`;
    await refreshTokenState();
    update();
  }

  tokenInput.addEventListener('change', resolveToken);
  tokenInput.addEventListener('blur', resolveToken);
  amountInput.addEventListener('input', () => {
    const next = sanitizeAmount(amountInput.value);
    if (next !== amountInput.value) amountInput.value = next;
    state.steps = null;
    update();
  });
  tipInput.addEventListener('input', () => {
    const next = sanitizeAmount(tipInput.value);
    if (next !== tipInput.value) tipInput.value = next;
    update();
  });
  $('[data-max]').addEventListener('click', () => {
    if (typeof state.balance !== 'bigint' || !state.token) {
      toast(state.wallet?.connected ? 'No balance to lock' : 'Connect a wallet first', { anchor: $('[data-max]') });
      return;
    }
    amountInput.value = knix.formatUnits(state.balance, state.token.decimals);
    update();
  });
  $$('[data-cooldown]').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.cooldown = Number(chip.dataset.cooldown);
      $$('[data-cooldown]').forEach((other) => {
        const on = other === chip;
        other.classList.toggle('is-on', on);
        other.setAttribute('aria-pressed', String(on));
      });
      update();
    }),
  );

  /* ───────── CTA ───────── */
  const cta = $('[data-cta]');
  const note = $('[data-note]');

  function ctaState() {
    const w = state.wallet;
    if (!w?.available) return { label: 'Connect wallet', action: 'nowallet' };
    if (!w.connected) return { label: w.connecting ? 'Waiting for wallet' : 'Connect wallet', action: 'connect', busy: w.connecting };
    if (state.tab === 'positions') return { label: 'Lock a position', action: 'golock' };
    if (!state.token) return { label: 'Enter a token mint', soft: true, action: 'focustoken' };
    const amount = amountRaw();
    if (amount <= 0n) return { label: 'Enter an amount', soft: true, action: 'focusamount' };
    if (typeof state.balance === 'bigint' && amount > state.balance) return { label: 'Amount above balance', soft: true };
    return { label: 'Lock position', action: 'lock' };
  }

  function setSteps(list, index, status) {
    state.steps = { list, index, status };
    update();
  }

  cta.addEventListener('click', () => {
    const { action } = ctaState();
    if (action === 'nowallet') return toast('No Solana wallet detected', { anchor: cta });
    if (action === 'connect') return connectWallet();
    if (action === 'golock') return setTab('lock');
    if (action === 'focustoken') return tokenInput.focus();
    if (action === 'focusamount') return amountInput.focus();
    if (action !== 'lock') return;

    // Input is valid: show what would be locked, then stop. No transaction is built.
    const tip = tipInput.value.trim();
    const tipText = tip && Number(tip) > 0 ? `, ${tip} ${activeNetwork.nativeCurrency.symbol} tip` : '';
    setSteps(STEPS, 1, 'idle');
    note.textContent = `Lock ${amountInput.value.trim()} ${state.token.symbol}, ${cooldownLabel(state.cooldown)} cooldown${tipText}. ${NOT_LIVE}`;
    toast('Live execution is currently disabled', { anchor: cta });
  });

  /* ───────── positions ───────── */
  function renderPositions() {
    $('[data-positions]').innerHTML = state.wallet?.connected
      ? '<p class="positions__empty">Positions appear here once Solana execution is live.</p>'
      : '<p class="positions__empty">Connect a wallet to see your positions.</p>';
  }

  /* ───────── reads ───────── */
  async function refreshTokenState() {
    const w = state.wallet;
    if (!state.token || !w?.connected) {
      state.balance = null;
      return;
    }
    const token = state.token;
    const balance = await knix.readTokenBalance(token.address, w.account);
    if (state.token === token) state.balance = balance;
  }

  /* ───────── render ───────── */
  function update() {
    const w = state.wallet;

    const marketPill = $('[data-market]');
    const dot = marketPill.querySelector('.dot');
    const text = marketPill.lastElementChild;
    if (!state.market) {
      text.textContent = 'Reading market';
    } else if (state.market.open) {
      dot.className = 'dot dot--warm';
      text.textContent = 'Market open, instant';
    } else {
      dot.className = 'dot dot--accent dot--pulse';
      const wait = state.market.nextOpen - Math.floor(Date.now() / 1000);
      text.textContent = `Market closed, opens in ${clock(wait)}`;
    }

    $('[data-balance]').textContent = !w?.connected
      ? 'Not connected'
      : !state.token
        ? 'Pick a token'
        : typeof state.balance === 'bigint'
          ? knix.formatUnits(state.balance, state.token.decimals, 4)
          : 'Unavailable';

    const c = ctaState();
    $('[data-cta-label]').textContent = c.label;
    cta.setAttribute('aria-disabled', String(Boolean(c.soft || c.busy)));
    cta.classList.toggle('is-soft', Boolean(c.soft));
    cta.classList.toggle('is-busy', Boolean(c.busy));

    const steps = state.steps;
    if (!steps && note.textContent.endsWith(NOT_LIVE)) note.textContent = '';
    $('[data-steps]').innerHTML = (steps?.list || STEPS)
      .map((label, i) => {
        let status = 'idle';
        if (steps) status = i < steps.index ? 'done' : i === steps.index ? steps.status : 'idle';
        return `<li data-step="${status}"><span class="steps__dot"></span><span>${label}</span></li>`;
      })
      .join('');

    renderPositions();
    updateComposition();
  }

  function updateComposition() {
    if (!compHost || !state.market) return;
    compHost.querySelector('.comp').dataset.compState = 'live';
    compHost.querySelector('[data-comp-value]').textContent = state.market.open ? 'Open' : 'Closed';
  }

  /* ───────── wiring ───────── */
  let lastKey = '';
  let lastError = '';
  subscribeWallet(async (wallet) => {
    state.wallet = wallet;
    if (wallet.error && wallet.error !== lastError) note.textContent = wallet.error;
    lastError = wallet.error;
    update();
    if (wallet.account === lastKey) return;
    lastKey = wallet.account;
    await refreshTokenState();
    update();
  });

  // The market clock and countdowns tick every second; balances refresh far less often.
  setInterval(() => {
    state.market = knix.readMarket();
    update();
  }, 1000);
  setInterval(() => {
    if (state.wallet?.connected && state.token) refreshTokenState().then(update);
  }, 30_000);

  // The app page restores sessions eagerly; on the landing the wallet loads once the pool is near.
  initWallet({ eager: false });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      preloadWallet();
    }, { rootMargin: '400px 0px' });
    io.observe(host);
  } else {
    preloadWallet();
  }
  update();
}
