# Swap

**Launch status: Display Only.**

The full Knix product includes a trading surface for supported markets. Traders should be able to exchange a stable quote asset and supported tokenized or crypto assets through the liquidity infrastructure connected to Knix Pools.

## Conceptual flow

```text
Select input asset
      ↓
Select output asset
      ↓
Request quote
      ↓
Show price impact + fee + minimum output
      ↓
User signs transaction
      ↓
Route executes through supported liquidity
      ↓
Receipt and final balances are verified
```

## Design principles

A Swap module module should:

- quote before signing;
- enforce slippage bounds and deadlines;
- make the execution venue visible;
- avoid relying on a displayed mid-price as an executable quote;
- show token and market risks;
- return unused input where the route permits it.

## Launch display

The DApp may show the Swap page, supported-market examples, and an explanation of the conceptual flow. Transaction inputs should be disabled or clearly marked `Display Only` until a real router and quote path exist.
