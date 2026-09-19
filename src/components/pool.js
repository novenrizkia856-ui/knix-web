/**
 * Knix Pool interface, wired to the live contract.
 *
 * Lock an ERC20 position with a chosen cooldown. A withdrawal requested while the
 * US market is open settles instantly; outside market hours it queues and unlocks
 * at the cooldown or the next open, whichever comes first. The owner can cancel
 * before it unlocks; afterwards anyone can finalize and collect the tip.
 *
 * Reads come from the public RPC, writes from the connected wallet.
 */
import { COOLDOWN_OPTIONS, CONTRACTS } from '../config/contracts.js';
import { activeNetwork, explorerUrl } from '../config/network.js';
import { shortAddress } from '../lib/address.js';
import * as knix from '../lib/knix.js';
import { toast } from '../lib/motion.js';
import { connectWallet, initWallet, preloadWallet, subscribeWallet, switchToActiveNetwork } from '../lib/wallet.js';

const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
const STATUS_LABEL = ['Locked', 'Queued', 'Closed'];

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
  const coreLink = live ? explorerUrl('address', CONTRACTS.KNIX_CORE_ADDRESS) : '';
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
          <span class="field__bal" data-token-state>Paste a token address</span>
        </div>
        <div class="field__row">
          <input id="pool-token" class="field__input field__input--address" type="text" spellcheck="false" autocomplete="off" placeholder="0x..." data-token-input />
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
      <div><dt>Contract</dt><dd>${coreLink ? `<a href="${coreLink}" target="_blank" rel="noopener">${shortAddress(CONTRACTS.KNIX_CORE_ADDRESS)}</a>` : 'Pending'}</dd></div>
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
  const live = knix.knixDeployed();

  const state = {
    tab: 'lock',
    wallet: null,
    token: null,
    balance: null,
    allowance: null,
    cooldown: COOLDOWN_OPTIONS[1].seconds,
    bounds: null,
    market: null,
    positions: [],
    busy: false,
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

  const amountWei = () => {
    if (!state.token) return 0n;
    const value = amountInput.value.trim();
    if (!value || Number(value) <= 0) return 0n;
    try {
      return knix.parseUnits(value, state.token.decimals);
    } catch {
      return 0n;
    }
  };
  const tipWei = () => {
    const value = tipInput.value.trim();
    if (!value || Number(value) <= 0) return 0n;
    try {
      return knix.parseUnits(value, 18);
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
    state.allowance = null;
    const chip = $('[data-token-chip]');
    const label = $('[data-token-state]');
    if (!address) {
      chip.hidden = true;
      label.textContent = 'Paste a token address';
      return update();
    }
    if (!knix.isAddress(address)) {
      chip.hidden = true;
      label.textContent = 'Not a valid address';
      return update();
    }
    label.textContent = 'Reading token';
    update();
    const token = tokenCache.get(address.toLowerCase()) || (await knix.readToken(address));
    if (run !== tokenRun) return;
    if (!token) {
      chip.hidden = true;
      label.textContent = 'No ERC20 found at that address';
      return update();
    }
    tokenCache.set(address.toLowerCase(), token);
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
    if (!live) return { label: 'Contract not deployed', soft: true, action: 'pending' };
    if (!w?.available) return { label: 'Connect wallet', action: 'nowallet' };
    if (!w.connected) return { label: w.connecting ? 'Waiting for wallet' : 'Connect wallet', action: 'connect', busy: w.connecting };
    if (!w.onActiveChain) return { label: `Switch to ${activeNetwork.shortName}`, action: 'switch' };
    if (state.busy) return { label: 'Confirm in wallet', busy: true };
    if (state.tab === 'positions') return { label: 'Lock another position', action: 'golock' };
    if (!state.token) return { label: 'Enter a token address', soft: true, action: 'focustoken' };
    const amount = amountWei();
    if (amount <= 0n) return { label: 'Enter an amount', soft: true, action: 'focusamount' };
    if (typeof state.balance === 'bigint' && amount > state.balance) return { label: 'Amount above balance', soft: true };
    if (typeof state.allowance === 'bigint' && state.allowance < amount) {
      return { label: `Approve ${state.token.symbol}`, action: 'approve' };
    }
    return { label: 'Lock position', action: 'lock' };
  }

  function setSteps(list, index, status) {
    state.steps = { list, index, status };
    update();
  }

  async function runTx(label, send) {
    state.busy = true;
    note.textContent = '';
    update();
    try {
      const hash = await send();
      note.textContent = `${label} sent, waiting for confirmation`;
      await knix.waitForTx(hash);
      return true;
    } catch (error) {
      note.textContent = knix.describeError(error);
      if (state.steps) state.steps.status = 'error';
      return false;
    } finally {
      state.busy = false;
      update();
    }
  }

  cta.addEventListener('click', async () => {
    const { action } = ctaState();
    if (action === 'pending') return toast('Knix is not deployed on this network', { anchor: cta });
    if (action === 'nowallet') return toast('No wallet detected', { anchor: cta });
    if (action === 'connect') return connectWallet();
    if (action === 'switch') return switchToActiveNetwork();
    if (action === 'golock') return setTab('lock');
    if (action === 'focustoken') return tokenInput.focus();
    if (action === 'focusamount') return amountInput.focus();

    const steps = ['Approve', 'Lock', 'Confirmed'];
    if (action === 'approve') {
      setSteps(steps, 0, 'active');
      if (await runTx('Approval', () => knix.approve(state.token.address))) {
        await refreshTokenState();
        setSteps(steps, 1, 'idle');
      }
      return;
    }
    if (action !== 'lock') return;

    setSteps(steps, 1, 'active');
    const ok = await runTx('Lock', () =>
      knix.deposit({ token: state.token.address, amount: amountWei(), cooldown: state.cooldown, tip: tipWei() }),
    );
    if (!ok) return;
    setSteps(steps, 3, 'done');
    note.textContent = 'Position locked';
    amountInput.value = '';
    tipInput.value = '';
    await Promise.all([refreshTokenState(), refreshPositions()]);
    setTab('positions');
  });

  /* ───────── positions ───────── */
  async function positionAction(id, action) {
    const map = {
      request: ['Withdrawal request', () => knix.requestWithdrawal(id)],
      cancel: ['Cancellation', () => knix.cancelWithdrawal(id)],
      finalize: ['Finalize', () => knix.finalizeWithdrawal(id)],
    };
    const [label, send] = map[action];
    if (await runTx(label, send)) {
      note.textContent = `${label} confirmed`;
      await Promise.all([refreshPositions(), refreshTokenState()]);
    }
  }

  $('[data-positions]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    positionAction(BigInt(button.dataset.id), button.dataset.action);
  });

  function renderPositions() {
    const host_ = $('[data-positions]');
    const w = state.wallet;
    if (!live) {
      host_.innerHTML = '<p class="positions__empty">Knix is not deployed on this network.</p>';
      return;
    }
    if (!w?.connected) {
      host_.innerHTML = '<p class="positions__empty">Connect a wallet to see your positions.</p>';
      return;
    }
    const open = state.positions.filter((p) => p.status !== knix.STATUS.CLOSED);
    if (!open.length) {
      host_.innerHTML = '<p class="positions__empty">No open positions yet. Lock one to get started.</p>';
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    host_.innerHTML = open
      .map((p) => {
        const token = tokenCache.get(p.token.toLowerCase());
        const symbol = token?.symbol || shortAddress(p.token, 6, 4);
        const amount = knix.formatUnits(p.amount, token?.decimals ?? 18, 4);
        const pending = p.status === knix.STATUS.PENDING;
        const unlocked = pending && now >= p.unlockTime;
        let meta;
        if (!pending) meta = `Cooldown ${cooldownLabel(p.cooldown)}`;
        else if (unlocked) meta = 'Ready to finalize';
        else meta = `Unlocks in ${clock(p.unlockTime - now)}`;
        const actions = pending
          ? unlocked
            ? `<button type="button" class="btn btn--sm btn--primary" data-action="finalize" data-id="${p.id}">Finalize</button>`
            : `<button type="button" class="btn btn--sm btn--ghost" data-action="cancel" data-id="${p.id}">Cancel</button>`
          : `<button type="button" class="btn btn--sm btn--primary" data-action="request" data-id="${p.id}">Withdraw</button>`;
        return `
        <div class="position" data-status="${p.status}">
          <div class="position__main">
            <span class="coin coin--sm" aria-hidden="true"><span>${symbol.charAt(0)}</span></span>
            <div>
              <b>${amount} ${symbol}</b>
              <span class="position__meta" data-unlock="${pending ? p.unlockTime : 0}">${meta}</span>
            </div>
          </div>
          <span class="position__status">${STATUS_LABEL[p.status]}</span>
          ${actions}
        </div>`;
      })
      .join('');
  }

  /* ───────── reads ───────── */
  async function refreshTokenState() {
    const w = state.wallet;
    if (!state.token || !w?.connected || !w.onActiveChain) {
      state.balance = null;
      state.allowance = null;
      return;
    }
    const [balance, allowance] = await Promise.all([
      knix.readTokenBalance(state.token.address, w.account),
      knix.readAllowance(state.token.address, w.account),
    ]);
    state.balance = balance;
    state.allowance = allowance;
  }

  async function refreshPositions() {
    const w = state.wallet;
    if (!live || !w?.connected) {
      state.positions = [];
      return;
    }
    state.positions = await knix.readPositions(w.account);
    await Promise.all(
      [...new Set(state.positions.map((p) => p.token.toLowerCase()))]
        .filter((address) => !tokenCache.has(address))
        .map(async (address) => {
          const token = await knix.readToken(address);
          if (token) tokenCache.set(address, token);
        }),
    );
  }

  async function refreshMarket() {
    state.market = await knix.readMarket();
  }

  /* ───────── render ───────── */
  function update() {
    const w = state.wallet;

    const marketPill = $('[data-market]');
    const dot = marketPill.querySelector('.dot');
    const text = marketPill.lastElementChild;
    if (!state.market) {
      text.textContent = live ? 'Reading market' : 'Not deployed';
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
      : !w.onActiveChain
        ? 'Wrong network'
        : !state.token
          ? 'Pick a token'
          : typeof state.balance === 'bigint'
            ? knix.formatUnits(state.balance, state.token.decimals, 4)
            : 'Unavailable';

    $('[data-bounds]').textContent = state.bounds
      ? `${clock(state.bounds.min)} to ${clock(state.bounds.max)}`
      : '';
    const openCount = state.positions.filter((p) => p.status !== knix.STATUS.CLOSED).length;
    $('[data-count]').textContent = openCount ? String(openCount) : '';

    const c = ctaState();
    $('[data-cta-label]').textContent = c.label;
    cta.setAttribute('aria-disabled', String(Boolean(c.soft || c.busy)));
    cta.classList.toggle('is-soft', Boolean(c.soft));
    cta.classList.toggle('is-busy', Boolean(c.busy));

    const steps = state.steps;
    $('[data-steps]').innerHTML = (steps?.list || ['Approve', 'Lock', 'Confirmed'])
      .map((label, i) => {
        let status = 'idle';
        if (steps) status = i < steps.index ? 'done' : i === steps.index ? steps.status : 'idle';
        return `<li data-step="${status}"><span class="steps__dot"></span><span>${label}</span></li>`;
      })
      .join('');

    renderPositions();
    updateComposition(openCount);
  }

  function updateComposition(openCount) {
    if (!compHost) return;
    const comp = compHost.querySelector('.comp');
    const value = compHost.querySelector('[data-comp-value]');
    if (state.market) {
      comp.dataset.compState = 'live';
      value.textContent = state.market.open ? 'Open' : 'Closed';
    }
    compHost.querySelector('[data-comp-locked]').textContent = String(
      state.positions.filter((p) => p.status === knix.STATUS.ACTIVE).length,
    );
    compHost.querySelector('[data-comp-queued]').textContent = String(
      state.positions.filter((p) => p.status === knix.STATUS.PENDING).length,
    );
    if (!openCount) return;
  }

  /* ───────── wiring ───────── */
  let lastKey = '';
  let lastError = '';
  subscribeWallet(async (wallet) => {
    state.wallet = wallet;
    if (wallet.error && wallet.error !== lastError) note.textContent = wallet.error;
    lastError = wallet.error;
    update();
    const key = `${wallet.account}:${wallet.chainId}`;
    if (key === lastKey) return;
    lastKey = key;
    await Promise.all([refreshTokenState(), refreshPositions()]);
    update();
  });

  if (live) {
    knix.readCooldownBounds().then((bounds) => {
      state.bounds = bounds;
      update();
    });
    refreshMarket().then(update);
    // countdowns tick every second; chain reads are far less frequent
    setInterval(update, 1000);
    setInterval(() => {
      refreshMarket().then(update);
      if (state.wallet?.connected && !state.busy) refreshPositions().then(update);
    }, 30_000);
  }

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
