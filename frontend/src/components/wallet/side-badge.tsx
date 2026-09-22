import { Badge } from '../ui';

type Side = 'long' | 'short' | 'buy' | 'sell';

const labels: Record<Side, string> = { long: 'Long', short: 'Short', buy: 'Buy', sell: 'Sell' };

export function SideBadge({ side }: { side: Side }) {
  const bullish = side === 'long' || side === 'buy';
  return <Badge tone={bullish ? 'positive' : 'negative'}>{labels[side]}</Badge>;
}
