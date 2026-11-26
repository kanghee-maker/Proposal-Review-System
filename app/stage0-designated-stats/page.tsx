import { getAccess } from '@/lib/accessSession';
import UnifiedStatistics from '../admin/stage0-stats/UnifiedStatistics';
import StatsLogin from '../stage0-stats/StatsLogin';
export default function Page() {
  return getAccess()?.role === 'admin' ? <UnifiedStatistics defaultStage="STAGE_0" fixedStage designatedOnly /> : <StatsLogin title="0차 지정제안평가 통계" />;
}
