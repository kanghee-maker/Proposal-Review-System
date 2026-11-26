import { getAccess } from '@/lib/accessSession';
import UnifiedStatistics from '../admin/stage0-stats/UnifiedStatistics';
import StatsLogin from './StatsLogin';

export default function Stage0StatsViewerPage() {
  const access = getAccess();
  return access?.role === 'admin' ? <UnifiedStatistics defaultStage="STAGE_0" fixedStage /> : <StatsLogin />;
}
