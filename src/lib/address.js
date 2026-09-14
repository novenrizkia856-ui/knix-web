const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO_RE = /^0x0{40}$/;

/** True only for a well formed, non zero EVM address. */
export function isConfiguredAddress(value) {
  return typeof value === 'string' && ADDRESS_RE.test(value.trim()) && !ZERO_RE.test(value.trim());
}

export function shortAddress(value, head = 6, tail = 4) {
  if (!value) return '';
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Keys from a contracts object that are still unset. */
export function missingContracts(contracts, keys) {
  return keys.filter((key) => !isConfiguredAddress(contracts[key]));
}
