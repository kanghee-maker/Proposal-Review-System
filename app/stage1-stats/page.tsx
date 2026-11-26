import { getAccess } from '@/lib/accessSession';
import Stage1Dashboard from '../admin/stage1-stats/Stage1Dashboard';
import StatsLogin from '../stage0-stats/StatsLogin';
export default function Page() {
  return getAccess()?.role === 'admin' ? <Stage1Dashboard /> : <StatsLogin title="1차 제안심사 통계 조회" />;
}
