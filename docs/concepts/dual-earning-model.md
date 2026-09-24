# Dual-Earning Model

The defining Knix concept is that liquidity should not be forced to choose permanently between a yield vault and a trading market.

## Vault side

When eligible stable liquidity is not needed by the trading side, the pool may place it into an approved ERC-4626-compatible or equivalent vault. The pool acts as the depositor; individual Knix users do not need separate vault positions.

Any vault integration introduces third-party risk and must be explicitly configured and disclosed.

## Trading side

When trading activity requires liquidity, the pool can make capital available to the configured AMM or liquidity engine. Trades pay fees according to the connected venue's rules.

The conceptual income sources are therefore:

```text
poolGrowth = netVaultYield + netTradingFees - losses - explicitProtocolCosts
```

This equation is descriptive, not a guaranteed-return formula.

## Why the model matters

Classic liquidity can remain economically idle between trades. Pure vault capital earns lending yield but does not collect swap fees. Knix attempts to bridge those two states through one pool position.

## No double-counting

Vault yield and trading fees must be accounted for from real asset growth. The UI must never add projected rates together as if both are guaranteed simultaneously.

## Launch requirement

Because The Pool is the only functional launch module, the DApp may expose the dual-earning model through Pool state and explanations. If an external vault integration is not actually connected at deployment time, the live interface must label the vault side as unavailable rather than showing fabricated yield.
