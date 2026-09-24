# Vault Layer

The vault layer is the second half of the Knix dual-earning concept.

## Purpose

A stable liquidity leg may spend periods of time not actively required by trading. Instead of leaving all eligible capital idle, Knix can connect that capital to approved third-party yield vaults.

## Preferred interface

Where possible, the vault integration should use standardized tokenized-vault behavior such as ERC-4626 semantics:

```text
deposit(assets) → vaultShares
redeem(vaultShares) → assets
convertToAssets(shares) → estimate
```

Knix should not assume every vault is safe simply because it follows a standard interface.

## Allowlist concept

A protocol configuration can restrict Pool integrations to explicitly reviewed vault addresses. A Pool's vault binding should be transparent and difficult to change silently.

## What the website can display

The website may explain:

- what the vault side does;
- candidate vault categories;
- how yield is measured;
- third-party risk;
- whether the launch Pool currently has an active vault integration.

If no production vault is integrated yet, the DApp should show `Vault integration: display only` instead of an APY.

## Risks

Vault integration adds:

- vault smart-contract risk;
- underlying lending-market risk;
- withdrawal liquidity risk;
- share-price/accounting risk;
- asset depeg risk;
- dependency on third-party governance or upgrades.
