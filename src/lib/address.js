const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Byte length of a base58 string, or -1 when it is not base58. */
function base58Length(value) {
  const bytes = [];
  for (const char of value) {
    let carry = BASE58.indexOf(char);
    if (carry < 0) return -1;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (value[zeros] === '1') zeros += 1;
  return bytes.length + zeros;
}

/** True for a well formed Solana public key (base58, 32 bytes). */
export function isPublicKey(value) {
  const key = String(value ?? '').trim();
  return BASE58_RE.test(key) && base58Length(key) === 32;
}

/** True only for a well formed public key that is not the all zero default key. */
export function isConfiguredAddress(value) {
  return isPublicKey(value) && !/^1+$/.test(String(value).trim());
}

export function shortAddress(value, head = 4, tail = 4) {
  if (!value) return '';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Clipboard write with a fallback for browsers without the async API. */
export async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
