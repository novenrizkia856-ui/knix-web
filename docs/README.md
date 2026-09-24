# Knix

## Liquidity that works in two places

Knix is a liquidity protocol concept for **Robinhood Chain** built around a dual-earning pool model. Capital can participate in a configured trading market while the stable side can also be routed to an approved yield vault when it is not required for active liquidity.

The Knix product concept includes pools, tokenized-asset markets, a vault layer, swaps, a protocol token, staking, governance, live analytics, agent access, and community profiles.

> **Current product scope:** only **The Pool** is intended to be functional in the first DApp release. The website and documentation describe the complete Knix vision. Other DApp modules may be visible for product context, but must be clearly marked **Display Only** until their contracts and transaction flows actually exist.

> **Project status:** these documents are a product and technical specification. They do not claim that Knix contracts, token, staking, governance, TVL, APR, vault integrations, or production addresses already exist.

## The core idea

A Knix Pool connects two economic environments:

1. **Vault side** — eligible idle stable assets can earn external lending or vault yield.
2. **Trading side** — liquidity can be made available to a configured market and earn swap fees when traders use it.

Conceptually:

```text
                    ┌──────────────────────┐
                    │   Approved Vault     │
                    │ idle stable capital  │
                    │ can earn vault yield │
                    └──────────┬───────────┘
                               │
User deposit → Knix Pool ──────┼──────→ Trading liquidity
                               │           earns swap fees
                               │
                         capital moves
                       according to pool
                           requirements
```

The objective is not to promise a fixed yield. It is to make the same pool position capable of capturing multiple sources of onchain productivity when the connected infrastructure permits it.

## Product surfaces

| Module | Launch DApp status | Role in the full Knix idea |
| --- | --- | --- |
| The Pool | **Functional target** | Deposit, position accounting, dual-earning liquidity concept, withdrawal |
| Markets / Registry | Display | Discover tokenized-asset and native-market pool candidates |
| Swap | Display | Trade supported assets against pool liquidity |
| Vaults | Display | Show approved yield sources for the stable liquidity leg |
| KNIX token | Display | Protocol coordination concept |
| Stake | Display | Token staking and reward distribution concept |
| Vote | Display | Governance over protocol-listed decisions |
| Live | Display | Pool, vault, volume, and protocol analytics |
| Agents | Display | Machine-readable access to protocol actions |
| Profile / Referrals | Display | Identity and community participation concept |

Start with [The Full Knix Idea](concepts/full-idea.md) or see [Feature Status](reference/feature-status.md).
