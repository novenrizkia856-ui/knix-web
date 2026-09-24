import { CONTRACTS } from '../config/contracts.js';
import { explorerUrl } from '../config/network.js';
import { isConfiguredAddress } from '../lib/address.js';
import { toast } from '../lib/motion.js';

const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="3"/><path d="M15.5 8.5V7a2.5 2.5 0 0 0-2.5-2.5H7A2.5 2.5 0 0 0 4.5 7v6A2.5 2.5 0 0 0 7 15.5h1.5"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5h10v10M19 5 6 18"/></svg>';

async function writeClipboard(text) {
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

/**
 * Renders the $KNIX contract address chip into every [data-contract-address].
 * The value always comes from CONTRACTS.KNIX_TOKEN_ADDRESS.
 */
export function mountContractAddress(root = document) {
  const address = CONTRACTS.KNIX_TOKEN_ADDRESS;
  const live = isConfiguredAddress(address);

  root.querySelectorAll('[data-contract-address]').forEach((host) => {
    const link = live ? explorerUrl('token', address) : '';
    host.innerHTML = `
      <div class="ca" data-state="${live ? 'live' : 'pending'}">
        <span class="ca__rim" aria-hidden="true"></span>
        <span class="ca__tag"><span class="dot ${live ? 'dot--warm' : 'dot--accent dot--pulse'}"></span>$KNIX CA</span>
        <span class="ca__value" ${live ? `title="${address}"` : ''}>${live ? address : 'Coming Soon'}</span>
        <span class="ca__actions">
          <button type="button" class="ca__btn" data-copy aria-label="${live ? 'Copy contract address' : 'Contract address coming soon'}">${ICON_COPY}</button>
          ${link ? `<a class="ca__btn" href="${link}" target="_blank" rel="noopener" aria-label="View token on explorer">${ICON_OUT}</a>` : ''}
        </span>
      </div>`;

    const btn = host.querySelector('[data-copy]');
    btn.addEventListener('click', async () => {
      if (!live) {
        toast('Contract address coming soon', { anchor: btn });
        return;
      }
      const ok = await writeClipboard(address);
      if (!ok) {
        toast('Copy failed', { anchor: btn });
        return;
      }
      btn.innerHTML = ICON_CHECK;
      toast('Address copied', { anchor: btn, tone: 'success' });
      setTimeout(() => (btn.innerHTML = ICON_COPY), 1800);
    });
  });
}
