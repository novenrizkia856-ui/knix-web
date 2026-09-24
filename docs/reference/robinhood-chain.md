# Robinhood Chain

Knix targets **Robinhood Chain**, an EVM-compatible network for onchain financial applications.

## Network assumptions

| Property | Target |
| --- | --- |
| Network | Robinhood Chain |
| Execution | EVM-compatible |
| Mainnet chain ID | `4663` |
| Gas asset | ETH |
| Smart-contract language | Solidity-compatible EVM bytecode |

## Why Knix fits

The concept depends on standard EVM building blocks:

- ERC-20 assets;
- wallet signatures;
- Solidity contracts;
- token approvals;
- event logs;
- external AMM integration;
- tokenized-vault interfaces where available;
- public contract state for analytics.

## Tokenized assets

Robinhood Chain's financial focus makes tokenized assets a natural market category for Knix. Each individual token still requires separate technical and economic review.

## Deployment policy

No Knix address should enter these docs until it actually exists and has been checked against the intended deployment.
