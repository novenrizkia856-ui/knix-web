# Knix Web

Static frontend for Knix on Solana. Vite, vanilla JS, Three.js (lazy loaded), Reown AppKit with
the Solana adapter for wallets (lazy loaded). No backend, no SSR.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview  # serve dist/ locally
```

Node 22 (see `engines` in `package.json`).

## Pages

| Path | Entry | Purpose |
| --- | --- | --- |
| `/` | `index.html` + `src/main.js` | Landing, with the live Pool card |
| `/app` | `app.html` + `src/app.js` | Pool app and module surfaces |
| any other | `public/404.html` | Not found page (served by Vercel) |

## Configuration

| File | What lives there |
| --- | --- |
| `src/config/solana.js` | **Every Solana parameter**: cluster, RPC, explorer, Knix program id, $KNIX mint, treasury. |
| `src/config/wallet.js` | WalletConnect (Reown) project id and app metadata. |
| `.env.example` | Build time values (`VITE_*`). Env values win over the files. |

All `VITE_*` values end up in the browser bundle. Only put public values there, never a key.

### Solana

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_SOLANA_NETWORK` | `mainnet-beta` | or `devnet` |
| `VITE_SOLANA_RPC_URL` | Reown RPC | The public `api.mainnet-beta.solana.com` refuses browser requests (403), so reads default to the Reown RPC keyed by the project id. Use a managed RPC in production. |
| `VITE_SOLANA_EXPLORER_URL` | `https://explorer.solana.com` | Links add `?cluster=` off mainnet. |
| `VITE_KNIX_PROGRAM_ID` | empty | No Knix program is deployed. |
| `VITE_KNIX_TOKEN_MINT` | empty | $KNIX SPL mint. Empty keeps the CA section on Coming Soon. |
| `VITE_KNIX_TREASURY_ADDRESS` | empty | |

Once the $KNIX mint exists, set `VITE_KNIX_TOKEN_MINT`: the CA component shows the mint with copy
and a Solana Explorer link, and the Profile view shows the connected wallet's $KNIX balance.

### Execution status

Live execution is disabled. There is no Knix program on Solana yet and the frontend ships no
transaction builder: `src/lib/knix.js` is read only (SPL mint data, token balances) and the wallet
store in `src/lib/wallet.js` only connects and disconnects. The Pool validates input, shows what a
lock would do and stops with a notice. Nothing is signed or sent, and no signature or success is
ever shown. The market clock (US equity regular session, NYSE holidays through 2027) is computed
locally until the program provides it.

### Wallets

`src/lib/wallet.js` uses Reown AppKit with the Solana adapter whenever a project id is configured:
Phantom, Solflare, Backpack and any Wallet Standard wallet, WalletConnect QR and mobile wallets.
AppKit loads on the app page after first paint, and on the landing only when the Pool card nears
the viewport. Send, swap and onramp features in the modal are switched off.

The Knix project id (`ff24e7c4e7d10744e3ccd080e4307cad`) is set in `src/config/wallet.js`, so builds
work without extra setup. `VITE_WALLETCONNECT_PROJECT_ID` overrides it. Without any project id the
store falls back to the injected Solana provider (`window.phantom.solana`, `window.solflare`,
`window.backpack`).

In the [Reown dashboard](https://dashboard.reown.com), add every domain the site runs on (production
domain, `*.vercel.app` previews if you use them) to the project allowlist. Unlisted domains get a 403,
an empty wallet list and, with the default RPC, no Solana reads.

## Deploy on Vercel

1. Import the repository in Vercel. `vercel.json` sets the framework, `npm ci`, the build command and
   `dist` as output.
2. Environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `VITE_WALLETCONNECT_PROJECT_ID` | optional, the Knix id is already in config |
   | `VITE_SOLANA_NETWORK` | `mainnet-beta` (default, optional) |
   | `VITE_SOLANA_RPC_URL` | recommended: a managed Solana RPC |

3. Deploy, then add the production domain to the Reown allowlist.

`vercel.json` also serves `/app` without the `.html` suffix, caches hashed assets for a year, and
sends `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and a restrictive `Permissions-Policy`.

## Brand assets

Source art lives in `public/brand`, traced from the supplied logo files (mark 99.8% and lockup 98.5%
overlap with the originals, so they are pixel faithful at any size).

| File | Use |
| --- | --- |
| `knix-mark.svg`, `knix-lockup.svg` | inlined in the pages, coloured through `currentColor` |
| `knix-mark-green.svg`, `knix-mark-dark.svg`, `knix-lockup-green.svg`, `knix-lockup-dark.svg` | fixed colour copies for partners and listings |
| `knix-mark-green-512.png`, `knix-mark-white-512.png`, `knix-lockup-green-1024.png`, `knix-lockup-white-1024.png` | transparent raster exports |
| `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | home screen and manifest icons |
| `/favicon.svg`, `/og-image.jpg` | browser tab and social card |

Brand colours: green `#70f250` (token `--brand`), deep green `#023a21`. The site accent stays red;
the logo glyph is the one green element, the wordmark follows the page ink.

## Structure

```
src/
  config/       solana.js, wallet.js
  lib/          wallet (AppKit or injected), appkit, knix (read only client, market clock), rpc, motion, address
  components/   pool, contract-address, nav
  three/        liquid hero, section views, CTA silk
  styles/       base, pool, modules, landing, app
```

Motion respects `prefers-reduced-motion`. Ambient loops pause off screen; WebGL stops rendering when
not visible.
