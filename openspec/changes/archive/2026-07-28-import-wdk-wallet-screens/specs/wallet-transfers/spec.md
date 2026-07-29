## ADDED Requirements

### Requirement: Receive screen

The app SHALL show a receive screen with an asset/network selector, a QR placeholder encoding the wallet's mock address, the address in full, and Copy/Share actions, matching screen 06.

#### Scenario: Receive screen shows the wallet's address for the selected asset/network

- **WHEN** the receive screen is shown for a given asset
- **THEN** it renders that asset's network label and the wallet's mock address from `WalletStore`, plus the decorative QR placeholder grid

#### Scenario: Copy action is available

- **WHEN** the user taps "Copy"
- **THEN** the address string is copied to the clipboard

### Requirement: Send screen

The app SHALL show a send screen with an editable amount, percentage/max quick-fill actions, a destination address field with a scan-to-fill action, network and fee display, and a review action, matching screen 07.

#### Scenario: Quick-fill sets amount from balance percentage

- **WHEN** the user taps "25%", "50%", or "Max"
- **THEN** the amount field updates to that percentage of the selected asset's available balance

#### Scenario: Review send proceeds to approval

- **WHEN** the user taps "Review send" with a non-zero amount and a destination address populated
- **THEN** the app navigates to the approve-transaction screen with the amount, destination, asset, and network as route params

### Requirement: Biometric transaction approval

The app SHALL present the pending transaction's summary (amount, destination, network, fee) as a modal sheet with a biometric-confirmation affordance and a hold-to-sign action, matching screen 08.

#### Scenario: Approval screen renders the pending transaction summary

- **WHEN** the approve-transaction screen is shown
- **THEN** it displays the amount, destination, network, and fee passed via route params, over a dimmed backdrop of the previous screen

#### Scenario: Confirming completes the send

- **WHEN** the user completes "Hold to sign"
- **THEN** `WalletStore` records a new mock outgoing transaction for that asset and the app navigates back to the home screen

> Note: peer-to-peer sends via this flow do not earn cashback and do not use the payment-success screen — that screen is specific to the merchant scan-to-pay flow (see `cashback-payments`), matching the design canvas where screen 10's cashback card and merchant name are tied to the scan-to-pay scenario, not a generic send.
