/**
 * Knix client for Solana. Read only.
 *
 * Reads go to the configured Solana RPC (no wallet needed): SPL mint data and
 * token balances. There is no Knix program on Solana yet, so this module has no
 * write path at all: nothing here builds, signs or sends a transaction.
 *
 * The market clock (US equity regular session) is computed locally from the
 * exchange calendar below. Once the Knix program ships, its clock is the source
 * of truth.
 */
import { ACCOUNTS } from '../config/solana.js';
import { isConfiguredAddress, isPublicKey } from './address.js';
import { rpcCall } from './rpc.js';

export { isPublicKey };

const TOKEN_PROGRAMS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // SPL Token 2022
]);

/* ───────── units ───────── */

export function parseUnits(value, decimals = 9) {
  const [whole = '0', fraction = ''] = String(value).trim().split('.');
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

export function formatUnits(value, decimals = 9, precision = 6) {
  if (value == null) return '';
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/* ───────── accounts ───────── */

export const PROGRAM_ID = ACCOUNTS.PROGRAM_ID;

/** True once a Knix program id is configured for the active cluster. */
export const knixDeployed = () => isConfiguredAddress(PROGRAM_ID);

/* ───────── reads (public RPC) ───────── */

/**
 * Decimals and symbol for an SPL mint, or null when the address is not a mint.
 * The symbol comes from Token 2022 metadata when the mint carries it.
 */
export async function readToken(mint) {
  if (!isPublicKey(mint)) return null;
  const result = await rpcCall('getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
  const account = result?.value;
  const parsed = account?.data?.parsed;
  if (!account || !TOKEN_PROGRAMS.has(account.owner) || parsed?.type !== 'mint') return null;
  const metadata = parsed.info?.extensions?.find((e) => e.extension === 'tokenMetadata')?.state;
  return {
    address: mint,
    symbol: (metadata?.symbol || '').trim() || 'SPL',
    decimals: Number(parsed.info.decimals) || 0,
  };
}

/** Raw balance of `mint` held by `owner` across its token accounts, or null on failure. */
export async function readTokenBalance(mint, owner) {
  if (!isPublicKey(mint) || !isPublicKey(owner)) return null;
  const result = await rpcCall('getTokenAccountsByOwner', [
    owner,
    { mint },
    { encoding: 'jsonParsed', commitment: 'confirmed' },
  ]);
  if (!result?.value) return null;
  return result.value.reduce((sum, { account }) => {
    const amount = account?.data?.parsed?.info?.tokenAmount?.amount;
    return amount ? sum + BigInt(amount) : sum;
  }, 0n);
}

/* ───────── market clock ───────── */

const ZONE = 'America/New_York';
const OPEN = 9 * 60 + 30;
const CLOSE = 16 * 60;
const EARLY_CLOSE = 13 * 60;

// NYSE full closures and early closes (13:00 ET). Outside these years only weekends apply.
const HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19',
  '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18',
  '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);
const EARLY_CLOSES = new Set(['2026-11-27', '2026-12-24', '2027-11-26']);

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});

function zoned(ms) {
  const p = Object.fromEntries(partsFormat.formatToParts(ms).map(({ type, value }) => [type, value]));
  return { y: +p.year, m: +p.month, d: +p.day, minutes: +p.hour * 60 + +p.minute };
}

/** Epoch ms for a wall clock time in New York. */
function fromZoned(y, m, d, minutes) {
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const at = zoned(guess);
  const offset = Date.UTC(at.y, at.m - 1, at.d, 0, at.minutes) - guess;
  return guess - offset;
}

function session(y, m, d) {
  const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (weekday === 0 || weekday === 6 || HOLIDAYS.has(key)) return null;
  return {
    open: fromZoned(y, m, d, OPEN),
    close: fromZoned(y, m, d, EARLY_CLOSES.has(key) ? EARLY_CLOSE : CLOSE),
  };
}

/** US equity regular session: { open, nextOpen } with nextOpen in unix seconds. */
export function readMarket(now = Date.now()) {
  const today = zoned(now);
  for (let i = 0; i < 14; i += 1) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const s = session(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
    if (!s) continue;
    if (now >= s.open && now < s.close) return { open: true, nextOpen: Math.floor(now / 1000) };
    if (now < s.open) return { open: false, nextOpen: Math.floor(s.open / 1000) };
  }
  return null;
}
