import { getAccess } from '@/lib/accessSession';
import Stage0StatsPage from '../admin/stage0-stats/page';
import StatsLogin from './StatsLogin';

export default function Stage0StatsViewerPage() {
  const access = getAccess();
  return access?.role === 'stats' || access?.role === 'admin' ? <Stage0StatsPage /> : <StatsLogin />;
}
