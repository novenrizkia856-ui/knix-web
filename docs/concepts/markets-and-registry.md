# Markets & Registry

Knix is designed to grow from one launch pool into a registry of recognized markets.

## Market categories

The wider concept can include:

- tokenized equities against a stable asset;
- tokenized ETFs against a stable asset;
- native crypto assets;
- protocol-token markets;
- other explicitly approved EVM assets.

Tokenized markets can have market-hours, issuer, transfer, oracle, liquidity, and regulatory constraints that differ from ordinary crypto assets. Knix should surface those differences instead of treating every token identically.

## Registry concept

The Registry concept can be the canonical index of Knix-recognized pools.

A registry entry may include:

```text
pool address / identifier
asset0
asset1
fee configuration
vault binding
market category
active / paused / legacy status
creation source
```

The registry does not need to be functional in the first release. For launch, the website can show a curated market catalogue while the transaction path points only to the single live Pool.

## Display rules for launch

Market cards may show descriptive information and display-only categories, but should use labels such as:

- `LIVE POOL` only for the actual functional pool;
- `DISPLAY` for display-only pools;
- `DISPLAY ONLY` when no transaction route exists.

Do not fabricate liquidity, volume, APR, contract addresses, or registry verification.
