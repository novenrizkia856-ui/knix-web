# Agents

**DApp status: Display only.**

Knix can eventually expose its open onchain state and transaction flows to software agents as well as human users.

## Agent capabilities

The agent concept may support:

- discover recognized pools;
- read reserves and user shares;
- preview deposits and withdrawals;
- request swap quotes;
- stake or unstake KNIX;
- read proposals;
- simulate a transaction before signing;
- verify transaction receipts and post-transaction balances.

## Safety loop

A machine client should follow a strict sequence:

```text
Discover → Quote → Simulate → Bound → Sign → Verify
```

The agent must not sign based only on a UI number or unverified text response.

## Keys

Knix should never require users to paste private keys into the website. Any agent wallet model should clearly define where keys live and who controls them.
