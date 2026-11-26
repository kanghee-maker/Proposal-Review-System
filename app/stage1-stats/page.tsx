import { getAccess } from '@/lib/accessSession';
import UnifiedStatistics from '../admin/stage0-stats/UnifiedStatistics';
import StatsLogin from '../stage0-stats/StatsLogin';
export default function Page() {
  return getAccess()?.role === 'admin' ? <UnifiedStatistics defaultStage="STAGE_1" /> : <StatsLogin title="1차 제안심사 통계 조회" />;
}
