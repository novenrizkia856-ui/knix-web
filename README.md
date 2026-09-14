# Knix Web

Static frontend for Knix on Robinhood Chain. Vite, vanilla JS, Three.js (hero only, lazy loaded).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview  # serve dist/ locally
```

Deploy on Vercel as a static Vite project (`vercel.json` included). No backend, no SSR.

## Pages

| Path | Entry | Purpose |
| --- | --- | --- |
| `/` | `index.html` + `src/main.js` | Landing |
| `/app` | `app.html` + `src/app.js` | Pool app and module surfaces |

## Configuration

| File | What lives there |
| --- | --- |
| `src/config/contracts.js` | **Every contract address.** One address book per network. |
| `src/config/network.js` | Chain ids, RPC, explorer for Robinhood Chain mainnet and testnet. |
| `.env.example` | Optional build time overrides (`VITE_*`). Env values win over the file. |

Empty or zero addresses are treated as not deployed. The UI shows pending states and never fabricates data.

### Token contract address

Set `KNIX_TOKEN_ADDRESS` in `src/config/contracts.js` (or `VITE_KNIX_TOKEN_ADDRESS`).
The CA component switches from **Coming Soon** to the real address, enables copy, and adds an explorer link.

### Pool

1. Fill `POOL_ADDRESS`, `POOL_ASSET_A_ADDRESS`, `POOL_ASSET_B_ADDRESS` (and `ROUTER_ADDRESS` if used).
2. Adjust pair labels in `POOL_PAIR` if the pair is not KNIX / ETH.
3. Reads (share balance, supply, reserves) activate automatically using standard ERC-20 selectors.
4. Implement `deposit` and `withdraw` in `src/lib/pool-adapter.js` with the final ABI. The UI already calls them.

### Network

`VITE_KNIX_NETWORK=testnet` switches to Robinhood Chain Testnet (46630). Fill the testnet RPC and explorer in `network.js` or `.env` first.

## Structure

```
src/
  config/       network.js, contracts.js
  lib/          wallet (EIP-1193), rpc, pool-adapter, motion, address
  components/   pool, contract-address, nav
  three/        hero-scene.js
  styles/       base, pool, modules, landing, app
```

Motion respects `prefers-reduced-motion`. Ambient loops pause off screen; the WebGL hero stops rendering when not visible.
