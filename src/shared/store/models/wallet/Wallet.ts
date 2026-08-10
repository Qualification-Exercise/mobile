// The wallet's on-device identity. The address is not stored here: it is
// derived per network by the WDK (`useReceiveAddress`), so keeping a copy
// would only create a second, staler source of truth.
export type Wallet = {
  displayName: string;
};
