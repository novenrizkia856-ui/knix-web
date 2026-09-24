# Profiles & Referrals

**DApp status: Display only.**

The full Knix product may include wallet-linked profiles, handles, points, referrals, and leaderboards.

## Profiles

A profile can associate a public wallet with optional metadata such as a handle and activity summary. Creating a profile should not imply custody of assets.

## Referrals

The referral concept can attribute sign-ups or qualifying activity to a referral code. Any points should be described as community scores unless they explicitly have another defined legal and protocol role.

## Design constraints

- signing in should be distinguishable from sending an onchain transaction;
- points should not be represented as guaranteed token value;
- referral logic should not change Pool ownership accounting;
- public leaderboards should avoid exposing unnecessary personal information.

This layer is non-essential to the launch Pool and can remain visual only.
