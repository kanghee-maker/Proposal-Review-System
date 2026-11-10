export default function AdoptionCriteria() {
  return (
    <section className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs leading-snug text-slate-800 break-keep">
      <h3 className="mb-1 font-bold text-sky-950">1차 심사 채택 기준</h3>
      <p>심사위원 총점 평균 <strong>50점 이상</strong>이면 채택.</p>
      <p>단, <strong>50점 미만을 준 위원이 3명 이상</strong>이면 불채택.</p>
    </section>
  );
}
