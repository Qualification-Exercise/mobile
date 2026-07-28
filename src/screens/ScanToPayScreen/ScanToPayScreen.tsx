import { ScreenContainer } from '@shared/ui';
import { ScanToPay } from '@features/scan-to-pay';

type ScanToPayScreenProps = {
  onClose: () => void;
  onPaid: () => void;
};

export function ScanToPayScreen({ onClose, onPaid }: ScanToPayScreenProps) {
  return (
    <ScreenContainer>
      <ScanToPay onClose={onClose} onPaid={onPaid} />
    </ScreenContainer>
  );
}
