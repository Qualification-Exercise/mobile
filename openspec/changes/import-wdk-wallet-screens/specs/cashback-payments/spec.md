## ADDED Requirements

### Requirement: Merchant scan-to-pay flow

The app SHALL show a scan-to-pay screen presented as a full-screen modal with a mock camera viewfinder, a decorative QR target overlay, a detected-merchant summary card (merchant name, network, amount, currency), and a pay action, matching screen 09.

#### Scenario: Scan-to-pay opens as a full-screen modal over Home

- **WHEN** the user taps "Scan" on the home screen
- **THEN** the scan-to-pay screen presents as a full-screen modal with a close ("✕") action that returns to Home

#### Scenario: Scan-to-pay shows the mock detected merchant

- **WHEN** the scan-to-pay screen is shown
- **THEN** it renders the mock merchant summary (name, network, amount, currency) from `WalletStore`

#### Scenario: Paying completes and shows cashback success

- **WHEN** the user taps "Pay {amount} {currency}"
- **THEN** `WalletStore` records a new mock outgoing transaction to the merchant, issues a new mock cashback coupon, and the app navigates to the payment-success screen

### Requirement: Payment success with cashback coupon

The app SHALL show a payment-success screen confirming the completed merchant payment and displaying the cashback percentage, the UTL amount earned, and the issued coupon code, matching screen 10.

#### Scenario: Success screen shows payment and cashback details

- **WHEN** the payment-success screen is shown after a scan-to-pay payment
- **THEN** it renders the paid amount, merchant name, mock transaction id, cashback percentage, UTL amount, and coupon code for the coupon just issued in `WalletStore`

#### Scenario: Claim-now proceeds to the claim screen

- **WHEN** the user taps "Claim UTL now"
- **THEN** the app navigates to the claim-coupon screen with the issued coupon's code as a route param

#### Scenario: Done returns to Home

- **WHEN** the user taps "Done"
- **THEN** the app navigates back to the home screen
