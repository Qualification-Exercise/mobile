# wallet-dashboard Specification

## Purpose

TBD - created by import-wdk-wallet-screens. Covers the home multi-chain balance overview and per-asset detail/activity screens, matching the WDK Wallet design canvas screens 04-05.

## Requirements

### Requirement: Home multi-chain balance overview

The app SHALL show a home screen with the wallet's total balance, a percentage change indicator, Send/Receive/Scan/Rewards quick actions, and a list of held assets (BTC, USDt on multiple chains, UTL) with per-asset balance and fiat value, matching screen 04.

#### Scenario: Home renders total balance and asset list from the store

- **WHEN** the home screen is shown
- **THEN** it displays `WalletStore`'s total fiat balance and renders one row per entry in `WalletStore.assets`, each showing the asset name, network/chain label, native balance, and fiat value

#### Scenario: Quick actions navigate to their respective screens

- **WHEN** the user taps "Send", "Receive", or "Scan"
- **THEN** the app navigates to the Send, Receive, or Scan-to-pay screen respectively
- **WHEN** the user taps "Rewards"
- **THEN** the app navigates to the Rewards screen

#### Scenario: Tapping an asset opens its detail screen

- **WHEN** the user taps an asset row
- **THEN** the app navigates to the asset-detail screen with that asset's id as a route param

### Requirement: Asset detail and activity feed

The app SHALL show a per-asset detail screen with the asset's balance, fiat value, network, Send/Receive actions, and a reverse-chronological activity feed of mock transactions, matching screen 05.

#### Scenario: Asset detail resolves the asset by route param

- **WHEN** the asset-detail screen is shown with an `assetId` route param
- **THEN** it renders that asset's balance, fiat value, and network from `WalletStore.assets`

#### Scenario: Activity feed renders transaction rows

- **WHEN** the asset-detail screen is shown
- **THEN** it renders one row per entry in `WalletStore.transactions` for that asset, each showing direction icon, counterparty/source label, signed amount, and date, styled per the transaction's direction (received vs. sent)
