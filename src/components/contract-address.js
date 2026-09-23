import { ACCOUNTS, explorerUrl } from '../config/solana.js';
import { isConfiguredAddress, shortAddress, writeClipboard } from '../lib/address.js';
import { toast } from '../lib/motion.js';

const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="3"/><path d="M15.5 8.5V7a2.5 2.5 0 0 0-2.5-2.5H7A2.5 2.5 0 0 0 4.5 7v6A2.5 2.5 0 0 0 7 15.5h1.5"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5h10v10M19 5 6 18"/></svg>';

/**
 * Renders the $KNIX mint address chip into every [data-contract-address].
 * The value always comes from ACCOUNTS.TOKEN_MINT.
 */
export function mountContractAddress(root = document) {
  const mint = ACCOUNTS.TOKEN_MINT;
  const live = isConfiguredAddress(mint);

  root.querySelectorAll('[data-contract-address]').forEach((host) => {
    const link = live ? explorerUrl('address', mint) : '';
    host.innerHTML = `
      <div class="ca" data-state="${live ? 'live' : 'pending'}">
        <span class="ca__tag"><span class="dot ${live ? 'dot--warm' : 'dot--accent dot--pulse'}"></span>$KNIX CA</span>
        <span class="ca__value" ${live ? `title="${mint}"` : ''}>${live ? `<span class="ca__full">${mint}</span><span class="ca__short">${shortAddress(mint)}</span>` : 'Coming Soon'}</span>
        <span class="ca__actions">
          <button type="button" class="ca__btn" data-copy aria-label="${live ? 'Copy mint address' : 'Mint address coming soon'}">${ICON_COPY}</button>
          ${link ? `<a class="ca__btn" href="${link}" target="_blank" rel="noopener" aria-label="View mint on Solana Explorer">${ICON_OUT}</a>` : ''}
        </span>
      </div>`;

    const btn = host.querySelector('[data-copy]');
    btn.addEventListener('click', async () => {
      if (!live) {
        toast('Mint address coming soon', { anchor: btn });
        return;
      }
      const ok = await writeClipboard(mint);
      if (!ok) {
        toast('Copy failed', { anchor: btn });
        return;
      }
      btn.innerHTML = ICON_CHECK;
      toast('Mint address copied', { anchor: btn, tone: 'success' });
      setTimeout(() => (btn.innerHTML = ICON_COPY), 1800);
    });
  });
}
