import Toast from 'react-native-toast-message';
import { showErrorToast } from './showErrorToast';

const show = Toast.show as jest.Mock;

describe('showErrorToast', () => {
  it('shows the error message, tagged with its source in dev builds', () => {
    showErrorToast({
      error: new Error('boom'),
      source: 'render',
      isFatal: false,
    });
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Something went wrong',
        text2: expect.stringContaining('boom'),
      }),
    );
    expect(show.mock.calls[0][0].text2).toContain('Render (JSX)');
  });

  it('falls back to a generic message when the error has none', () => {
    showErrorToast({ error: new Error(''), source: 'promise', isFatal: true });
    expect(show.mock.calls[0][0].text2).toContain('Unexpected error');
  });
});
