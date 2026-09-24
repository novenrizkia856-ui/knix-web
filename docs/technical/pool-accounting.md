# Pool Accounting

Pool accounting must answer one question consistently: **what fraction of the Pool does each share represent?**

## Net pool assets

A Knix Pool may hold assets in several states:

- directly in the Pool contract;
- represented by vault shares;
- deployed to an external liquidity position;
- claimable as trading fees;
- temporarily in transit during an atomic operation.

Conceptually:

```text
netAssets = idleAssets
          + redeemableVaultAssets
          + claimableLiquidityAssets
          + claimableFees
          - explicitLiabilities
```

The implementation should avoid relying on a fragile common-currency oracle solely to decide user ownership when proportional token accounting can be used instead.

## Shares

For non-initial deposits, the economic goal is to mint shares proportional to the assets added without diluting existing holders.

A simplified representation is:

```text
sharesOut ≈ contribution / netPoolAssetsBefore × totalShares
```

Actual two-token accounting must define how contribution ratios, rounding, and active external positions affect this calculation.

## Fee and vault growth

If trading fees or vault yield increase assets controlled or claimable by the Pool without minting new user shares, existing shares automatically capture that growth.

This avoids a separate per-user reward ledger for Pool earnings.

## Withdrawal

Burning `x%` of outstanding shares should redeem approximately `x%` of the Pool's economic assets after required external unwinds and bounded execution costs.

## Required invariants

1. Outstanding ownership cannot exceed total share supply.
2. A deposit cannot take pre-existing value from earlier LPs except documented rounding.
3. A withdrawal cannot redeem more shares than the caller owns.
4. External positions cannot be counted twice.
5. Vault yield and swap fees cannot be credited twice.
6. Failed external calls cannot leave share accounting partially committed.
7. Display-only modules cannot mutate Pool accounting.
