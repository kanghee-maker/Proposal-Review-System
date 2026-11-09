import { supabase } from './supabaseClient';

export interface Stage0ReviewLinks {
  sourceSessionId: string;
  sourceProposalIds: Record<string, string>;
}

const recordId = (sessionId: string) => `stage0_review_links_${sessionId}`;

export async function getStage0ReviewLinks(sessionId: string): Promise<Stage0ReviewLinks | null> {
  const { data, error } = await supabase.from('organization_charts').select('description')
    .eq('id', recordId(sessionId)).maybeSingle();
  if (error) throw new Error('0차 부서평가 연결 정보를 읽지 못했습니다.');
  return data ? JSON.parse(data.description) : null;
}

export async function saveStage0ReviewLinks(sessionId: string, links: Stage0ReviewLinks): Promise<void> {
  const { data, error } = await supabase.from('organization_charts').upsert({
    id: recordId(sessionId), name: 'STAGE0_REVIEW_LINKS', version: '1',
    description: JSON.stringify(links), updated_at: new Date().toISOString()
  }).select('id');
  if (error || !data?.length) throw new Error('0차 부서평가 연결 정보를 저장하지 못했습니다.');
}
