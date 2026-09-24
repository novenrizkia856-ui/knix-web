# Contract Model

This is a conceptual model only. It does not publish deployed interfaces or addresses.

## Launch-critical contracts

### KnixPool

Responsibilities:

- accept supported launch assets;
- calculate and mint pool shares;
- burn shares on withdrawal;
- coordinate the configured vault / liquidity integration;
- expose read functions required by the DApp;
- enforce pause and bounded execution rules.

A conceptual surface may resemble:

```solidity
previewDeposit(...)
deposit(...)
previewWithdraw(...)
withdraw(...)
balanceOf(address user)
totalShares()
```

The final ABI must follow the actual implementation.

### Vault / liquidity integration

Knix should prefer integrating established external primitives over implementing an entire exchange or lending market from scratch.

Depending on the chosen architecture, adapters can separate Knix accounting from:

- ERC-4626 vault mechanics;
- AMM position mechanics;
- fee collection;
- liquidity activation / deactivation.

## Conceptual contracts

The full product concept also includes:

### PoolFactory / Registry
Creates and indexes recognized Knix Pools.

### KnixToken
The KNIX protocol token.

### StakingVault
Tracks staked KNIX and funded rewards.

### Voting / Governance
Tracks voting power, snapshots, proposals, and possibly execution.

### Router / Quoter
Supports direct trading through recognized markets.

### Community registry
Optional handles, referral attribution, or points.

These conceptual components are separate from the functional Pool transaction path.
