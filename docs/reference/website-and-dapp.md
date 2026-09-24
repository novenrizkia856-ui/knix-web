# Website & DApp Structure

The instruction for Knix is simple:

> **The docs and website contain the whole idea. The DApp has The Pool functional; the other modules are visible as display.**

## Website

The public website should communicate the complete Knix narrative:

1. hero — liquidity can work across vault and market activity;
2. dual-earning mechanism;
3. tokenized markets on Robinhood Chain;
4. launch Pool;
5. vault ecosystem concept;
6. Swap module;
7. KNIX and staking;
8. governance;
9. live / transparent data;
10. agents and open integration;
11. safety and risk model;
12. display-only modules.

## DApp navigation

A complete-looking navigation can use:

```text
Home
Pool
Swap
Stake
Vote
Live
Agents
Profile
Docs
```

Only `Pool` should expose working financial actions in the first release.

## Display-only page behavior

A display-only module may contain:

- feature explanation;
- diagrams;
- conceptual workflow;
- market examples;
- disabled inputs;
- `Display` badges;
- links to docs.

It should not contain a button that looks executable but silently does nothing.

## Pool page behavior

The launch Pool page should provide real state when deployed:

- wallet and network status;
- pair assets;
- wallet balances;
- deposit preview;
- approvals;
- deposit transaction;
- user's shares / position;
- withdrawal preview;
- withdrawal transaction;
- transaction links;
- risk disclosure.

## Data integrity

When a display-only module has no live backend or contract, show absence explicitly. Prefer `Display` or `Not functional` over invented numbers.
