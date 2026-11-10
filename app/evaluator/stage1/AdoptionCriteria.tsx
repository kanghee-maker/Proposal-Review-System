export default function AdoptionCriteria() {
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-slate-800 break-keep">
      <h3 className="mb-1 font-bold text-amber-950">1차 심사 채택 기준</h3>
      <p>제안별 심사위원 총점의 평균이 <strong>50점 이상</strong>이면 채택합니다.</p>
      <p>다만, 평균이 50점 이상이더라도 <strong>총점 50점 미만을 부여한 심사위원이 3명 이상</strong>이면 불채택합니다.</p>
    </section>
  );
}
