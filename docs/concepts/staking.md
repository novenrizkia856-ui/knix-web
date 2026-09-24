# Staking

**Launch status: Display Only.**

Staking is a utility concept for KNIX holders.

## Concept

A staking contract can allow users to lock or deposit KNIX and earn rewards according to an explicitly funded reward stream.

Potential reward designs include:

- KNIX-denominated emissions;
- stable-asset rewards funded from an explicitly defined protocol revenue stream;
- non-financial participation points.

The final design must not promise rewards that are not funded.

## Conceptual state

```text
wallet KNIX
   ↓ stake
staked balance
   ↓ time / reward funding
claimable rewards
   ↓ unstake request
optional cooldown
   ↓
withdrawable KNIX
```

## Launch display

The DApp may display the staking model and sample state labels as display-only content. It should not expose an active Stake button until KNIX and the staking contracts are deployed and verified.
