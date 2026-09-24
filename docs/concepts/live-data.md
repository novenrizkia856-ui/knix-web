# Live Data

**Launch status: Display, with real reads only where available.**

Knix is intended to make protocol state observable rather than hiding it behind marketing numbers.

## Data categories

The Live surface can eventually expose:

- pool reserves and share supply;
- user pool positions;
- swap volume and fee data;
- vault assets and share value;
- vault yield history;
- staking totals and reward stream;
- governance proposals;
- protocol events and transactions.

## Source hierarchy

Preferred data priority:

1. direct smart-contract reads;
2. indexed onchain events;
3. clearly identified offchain analytics;
4. never invented placeholders presented as live data.

## Rates

APR, APY, fee yield, and vault rates are backward-looking or current-rate measurements unless otherwise specified. They are not promises of future return.

## Launch behavior

For the first DApp, Pool state can be real if the Pool is deployed. Other analytics may remain explanatory display modules. Missing data should render as `Not live yet` rather than `0` when zero would imply a real measurement.
