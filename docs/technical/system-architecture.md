# System Architecture

This architecture describes the complete Knix vision while distinguishing the functional Pool path from display-only modules.

## Full architecture

```text
                         ┌──────────────────┐
                         │  Knix Website    │
                         │ docs + full idea │
                         └────────┬─────────┘
                                  │
                                  ▼
User Wallet ───────────────→ Knix DApp
                                  │
              ┌───────────────────┼────────────────────┐
              │                   │                    │
              ▼                   ▼                    ▼
       [LIVE SCOPE]          [DISPLAY]             [DISPLAY]
        Knix Pool             Swap UI          Stake / Vote / Agents
              │
       ┌──────┴─────────┐
       ▼                ▼
 Vault Adapter     Liquidity Adapter
       │                │
       ▼                ▼
External Vault      External AMM
       └──────┬─────────┘
              ▼
       Robinhood Chain

Conceptual coordination layer:
Registry / Factory ─ KNIX ─ Staking ─ Governance ─ Analytics / Agent interfaces
```

## Functional launch path

Only the path required by The Pool needs to transact:

- wallet connection;
- Robinhood Chain network detection;
- token balance and allowance reads;
- deposit preview;
- token approval;
- deposit;
- share / position reads;
- withdrawal preview;
- withdrawal;
- transaction receipt display.

## Pool contract boundary

The Pool is responsible for user ownership accounting and approved external interactions. Frontend state is never the ownership source of truth.

## Adapters

Venue-specific behavior should be isolated where practical:

```text
VaultAdapter
- depositStable(...)
- redeemStable(...)
- totalAssets(...)

LiquidityAdapter
- addLiquidity(...)
- removeLiquidity(...)
- collectFees(...)
- preview(...)
```

The final implementation may use a different interface if the chosen AMM or dual-liquidity primitive already provides the required behavior safely.

## Display-only modules

Registry, swap routing, KNIX, staking, governance, agents, profiles, and referral systems are architectural extensions. Their pages can exist in the UI before their contracts do, but must remain non-transactional.
