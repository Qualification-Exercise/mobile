// Turn a fee-estimation failure into something the user can act on.
//
// EVM token transfers are paid for by an ERC-4337 paymaster that fronts the
// gas and takes its repayment in `feeSymbol`. It refuses when the account
// cannot cover transfer + fee, and the refusal reaches us as a generic
// `PAYMASTER_ERROR: pm_getPaymasterData failed` — abstractionkit keeps the
// real reason in `cause`, which does not survive the worklet boundary. The
// overwhelmingly common cause is the balance being too small to leave anything
// for the fee, so that is what we say.
export function describeFeeError(
  error: string | null | undefined,
  feeSymbols: string | string[],
): string {
  const message = error ?? '';
  const symbols = Array.isArray(feeSymbols) ? feeSymbols : [feeSymbols];
  const list =
    symbols.length > 1
      ? `${symbols.slice(0, -1).join(', ')} or ${symbols[symbols.length - 1]}`
      : symbols[0];

  if (/paymaster|pm_getPaymasterData|allowance|insufficient/i.test(message)) {
    return `Not enough ${list} to cover the network fee. The fee comes out on top of the amount you send, so leave some spare.`;
  }

  return message.trim() === '' ? 'Fee unavailable' : message;
}
