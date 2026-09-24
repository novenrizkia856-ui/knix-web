# The Pool

**The Pool** is the only financial module intended to be functional in the first Knix DApp release.

It represents a shared two-asset liquidity position on Robinhood Chain. Users deposit the configured assets, receive proportional pool shares, monitor their position, and later withdraw their share of the underlying assets.

## Pool lifecycle

```text
Connect wallet
      ↓
Select / view launch pool
      ↓
Preview required asset amounts
      ↓
Approve tokens
      ↓
Deposit
      ↓
Receive proportional pool shares
      ↓
Vault yield / trading fees may accrue
      ↓
View position
      ↓
Withdraw proportional assets
```

## Ownership model

Let:

- `S` = total outstanding pool shares;
- `A` = net pool assets before a deposit, measured by the pool's accounting rules;
- `D` = net value contributed by the new deposit under those same rules.

Conceptually:

```text
sharesMinted = D / A × S
```

The first deposit requires an initialization convention. Production accounting must be based on controlled assets and claimable external positions, not an arbitrary frontend price.

## Deposit

The user selects a deposit size. The DApp previews the counterpart token required by the configured market and submits only after user approval.

The final transaction should enforce bounded execution such as minimum shares or maximum counterpart input where appropriate.

## During the position

A user's shares represent a proportional claim on current Pool assets. The exact token composition can change with trading, fees, vault growth, rebalancing mechanics, and price movement.

The user should not be told that the exact original token quantities are guaranteed to return.

## Withdrawal

A withdrawal burns shares and returns the corresponding economic fraction of Pool assets after any required external position is unwound.

Conceptually:

```text
fraction = sharesBurned / totalShares
asset0Out ≈ fraction × netAsset0
asset1Out ≈ fraction × netAsset1
```

Execution details depend on the final AMM and vault integrations.

## Functional Pool vs Registry display

The two-day launch can use one configured live pool. The wider website may display additional markets as display-only examples.

A pool card is **not** evidence that a pool is deployed. Only the actually configured launch pool should enable transaction controls.
