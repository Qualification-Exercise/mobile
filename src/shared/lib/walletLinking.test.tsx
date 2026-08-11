import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { walletsApi } from '@shared/api';
import { linkWalletAddresses, useLinkWalletAddresses } from './walletLinking';

const mockUseWdkApp = jest.fn();
const mockLoadAddresses = jest.fn().mockResolvedValue([]);
const mockUseStore = jest.fn();

jest.mock('@shared/api', () => ({
  walletsApi: { link: jest.fn().mockResolvedValue(undefined), list: jest.fn() },
}));
jest.mock('@shared/store', () => ({ useStore: () => mockUseStore() }));
jest.mock('@tetherto/wdk-react-native-core', () => ({
  BaseAsset: class {},
  useWdkApp: () => mockUseWdkApp(),
  useAddresses: () => ({ loadAddresses: mockLoadAddresses }),
}));

const link = walletsApi.link as jest.Mock;
const list = walletsApi.list as jest.Mock;

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

function walletStore() {
  return { setLinkedEvmAddress: jest.fn() } as any;
}

// A derived-address result as `useAddresses().loadAddresses` returns them.
const address = (network: string, addr: string) => ({
  success: true,
  network,
  address: addr,
});

describe('linkWalletAddresses', () => {
  it('collapses the EVM networks into one record and records the read-back', async () => {
    const loadAddresses = jest
      .fn()
      .mockResolvedValue([
        address('ethereum', '0xETH'),
        address('arbitrum', '0xARB'),
        address('polygon', '0xPOL'),
      ]);
    list.mockResolvedValue([{ chain: 'evm', address: '0xLINKED' }]);
    const store = walletStore();

    await linkWalletAddresses(loadAddresses, store);

    // The three EVM networks fold into one evm record; the first (Sepolia) wins.
    expect(link).toHaveBeenCalledWith({
      wallets: [{ chain: 'evm', srcChainId: 11155111, address: '0xETH' }],
    });
    expect(store.setLinkedEvmAddress).toHaveBeenCalledWith('0xLINKED');
  });

  it('does not link when no EVM address is derived', async () => {
    const loadAddresses = jest
      .fn()
      .mockResolvedValue([address('bitcoin', 'bc1')]);
    list.mockResolvedValue([]);
    const store = walletStore();

    await linkWalletAddresses(loadAddresses, store);

    expect(link).not.toHaveBeenCalled();
    expect(store.setLinkedEvmAddress).toHaveBeenCalledWith(null);
  });

  it('swallows a link failure but still reads the linked address back', async () => {
    const loadAddresses = jest
      .fn()
      .mockResolvedValue([address('ethereum', '0xETH')]);
    link.mockRejectedValueOnce(new Error('conflict'));
    list.mockResolvedValue([{ chain: 'evm', address: '0xLINKED' }]);
    const store = walletStore();

    await linkWalletAddresses(loadAddresses, store);

    expect(store.setLinkedEvmAddress).toHaveBeenCalledWith('0xLINKED');
  });

  it('falls back to null when the read-back fails', async () => {
    const loadAddresses = jest
      .fn()
      .mockResolvedValue([address('ethereum', '0xETH')]);
    list.mockRejectedValueOnce(new Error('offline'));
    const store = walletStore();

    await linkWalletAddresses(loadAddresses, store);

    expect(store.setLinkedEvmAddress).toHaveBeenCalledWith(null);
  });
});

// A component that just mounts the effect under test.
function Harness() {
  useLinkWalletAddresses();
  return null;
}

const flush = () =>
  act(async () => {
    await new Promise(resolve => setImmediate(resolve));
  });

describe('useLinkWalletAddresses', () => {
  it('links and flushes queued reports once READY and authenticated', async () => {
    const store = {
      setLinkedEvmAddress: jest.fn(),
      flushPendingReports: jest.fn().mockResolvedValue(undefined),
    };
    mockUseStore.mockReturnValue({
      walletStore: store,
      authStore: { isAuthenticated: true },
    });
    mockUseWdkApp.mockReturnValue({
      state: { status: 'READY', walletId: 'w1' },
    });
    list.mockResolvedValue([]);

    await act(async () => {
      ReactTestRenderer.create(<Harness />);
    });
    await flush();

    expect(mockLoadAddresses).toHaveBeenCalled();
    expect(store.flushPendingReports).toHaveBeenCalled();
  });

  it('stays idle when the wallet is not READY or the user is signed out', async () => {
    const store = {
      setLinkedEvmAddress: jest.fn(),
      flushPendingReports: jest.fn(),
    };
    mockUseStore.mockReturnValue({
      walletStore: store,
      authStore: { isAuthenticated: false },
    });
    mockUseWdkApp.mockReturnValue({
      state: { status: 'READY', walletId: 'w1' },
    });

    await act(async () => {
      ReactTestRenderer.create(<Harness />);
    });
    await flush();

    expect(store.flushPendingReports).not.toHaveBeenCalled();
  });
});
