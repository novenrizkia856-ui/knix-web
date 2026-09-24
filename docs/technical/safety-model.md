# Safety Model

Knix combines user deposits with external financial infrastructure. Safety therefore depends on both Knix code and every connected dependency.

## Principles

### Exit before expansion

Emergency controls should stop new risk while preserving withdrawals whenever technically safe.

### Explicit integrations

Only configured assets, pools, vaults, routers, and adapters should be callable from the Pool.

### Bounded execution

Deposits, withdrawals, and swaps should enforce user-protective bounds such as minimum outputs, maximum inputs, slippage limits, and deadlines where relevant.

### No fake protocol state

Display modules must not simulate live balances, APY, proposals, token addresses, or contract status in a way that can be mistaken for real onchain state.

### Dependency transparency

Every external vault and AMM introduces separate smart-contract, governance, liquidity, and economic assumptions.

## Risk classes

- Knix smart-contract risk;
- external AMM risk;
- vault and lending-market risk;
- token / issuer / upgrade risk;
- stable-asset depeg risk;
- impermanent loss and inventory drift;
- market-hours and tokenized-asset constraints;
- network / RPC / sequencer risk;
- frontend and indexing errors;
- governance risk once governance exists.

## Verification goals before Pool mainnet use

Tests should cover at minimum:

- first deposit;
- subsequent deposits;
- partial and full withdrawal;
- ratio and rounding edges;
- zero and dust inputs;
- allowance failures;
- vault deposit / redemption failures if integrated;
- AMM / liquidity-call failures;
- reentrancy attempts where relevant;
- pause behavior;
- fee accounting;
- share / asset invariants;
- slippage protection;
- transaction rollback on external failure.

These are requirements, not claims that testing has already happened.
