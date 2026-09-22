import { useSearchParams } from 'react-router-dom';

import { MAX_COMPARE_ADDRESSES } from '../../data';
import { parseAddress } from '../../domain';

export function useCompareAddresses(): [string[], (next: string[]) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('addresses') ?? '';
  const parsed = raw.split(',').flatMap((part) => parseAddress(part) ?? []);
  const addresses = [...new Set(parsed)].slice(0, MAX_COMPARE_ADDRESSES);
  const setAddresses = (next: string[]) =>
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next.length) updated.set('addresses', next.join(','));
      else updated.delete('addresses');
      return updated;
    });
  return [addresses, setAddresses];
}
