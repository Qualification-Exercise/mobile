# rewards-coupons Specification

## Purpose

TBD - created by import-wdk-wallet-screens. Covers the rewards list and coupon-claiming flow, matching the WDK Wallet design canvas screens 11-12.

## Requirements

### Requirement: Claimable rewards and coupon list

The app SHALL show a rewards screen with the total claimable UTL cashback across all unclaimed coupons and a list of coupons with code, merchant, amount, and status, matching screen 11.

#### Scenario: Rewards screen totals unclaimed coupons

- **WHEN** the rewards screen is shown
- **THEN** it displays the sum of `amount` across coupons in `WalletStore.coupons` whose status is "Claimable", and the count of such coupons

#### Scenario: Coupon rows show status

- **WHEN** the rewards screen is shown
- **THEN** it renders one row per coupon in `WalletStore.coupons` showing its code, merchant, amount, and a status label styled per whether it is "Claimable" or "Claimed"

#### Scenario: Claim-all navigates to the claim screen

- **WHEN** the user taps "Claim all — {total} UTL"
- **THEN** the app navigates to the claim-coupon screen

### Requirement: Claim UTL via coupon code

The app SHALL show a claim screen with a 3-segment coupon-code entry, the resulting UTL amount, the token contract, and destination wallet address, and a claim action, matching screen 12.

#### Scenario: Claim screen prefills a coupon code from route params

- **WHEN** the claim-coupon screen is opened with a `couponCode` route param
- **THEN** the 3-segment code entry is prefilled with that code and resolves the matching coupon's UTL amount from `WalletStore.coupons`

#### Scenario: Claiming marks the coupon claimed

- **WHEN** the user taps "Claim {amount} UTL" for a coupon whose status is "Claimable"
- **THEN** `WalletStore` marks that coupon's status as "Claimed" and credits the mock UTL amount to the UTL asset balance

#### Scenario: Already-claimed coupons cannot be claimed again

- **WHEN** the entered coupon code resolves to a coupon whose status is already "Claimed"
- **THEN** the claim action is disabled
