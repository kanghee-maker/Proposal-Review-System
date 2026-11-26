'use client';
import { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';

export const statisticsColors: Record<string, string> = { 채택: '#f59e0b', 조건부채택: '#38bdf8', 불채택: '#f43f5e', 과락: '#8b5cf6', '미제출 / 검토중': '#94a3b8' };
export function StatisticsHeader({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <header className="stats-header stats-panel"><div className="stats-heading"><div className="stats-icon"><BarChart3 size={24} /></div><div><h1>{title}</h1><p>{subtitle}</p></div></div><div className="stats-actions screen-only">{children}</div></header>;
}
export function StatisticsPrintOptions({ sections, selected, onChange }: { sections: Record<string, string>; selected: string[]; onChange: (ids: string[]) => void }) {
  return <div className="stats-print-options screen-only"><b>인쇄 항목</b><button type="button" onClick={() => onChange(Object.keys(sections))}>전체 선택</button><button type="button" onClick={() => onChange([])}>선택 해제</button>
    {Object.entries(sections).map(([id, name]) => <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={e => onChange(e.target.checked ? [...selected, id] : selected.filter(x => x !== id))} />{name}</label>)}
  </div>;
}
export function StatisticsDonut({ segments, total, adopted }: { segments: { name: string; count: number; color?: string }[]; total: number; adopted: number }) {
  const circumference = 2 * Math.PI * 60;
  let offset = 0;
  return <div className="stats-donut-layout"><div className="stats-donut-chart" role="img" aria-label={segments.map(s => `${s.name} ${s.count}건`).join(', ')}>
    <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true"><g transform="rotate(-90 80 80)"><circle cx="80" cy="80" r="60" fill="none" stroke="#e2e8f0" strokeWidth="20" />
      {segments.map(s => { const length = total ? s.count / total * circumference : 0; const start = offset; offset += length; return <circle key={s.name} cx="80" cy="80" r="60" fill="none" stroke={s.color || statisticsColors[s.name] || '#94a3b8'} strokeWidth="20" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-start} />; })}</g></svg>
    <div className="stats-donut-center"><span>채택률</span><strong>{total ? (adopted / total * 100).toFixed(1) : '0.0'}%</strong><small>{adopted} / {total}건</small></div>
  </div><div className="stats-donut-legend">{segments.map(s => <div className="stats-legend-row" key={s.name} style={{ borderColor: `${s.color || statisticsColors[s.name] || '#94a3b8'}55`, background: `${s.color || statisticsColors[s.name] || '#94a3b8'}0c` }}>
    <span><i style={{ background: s.color || statisticsColors[s.name] || '#94a3b8' }} />{s.name}</span><span><b>{s.count}건</b><small> ({total ? (s.count / total * 100).toFixed(1) : '0.0'}%)</small></span>
  </div>)}</div></div>;
}
export function StatisticsVisualStyles() {
  return <style jsx global>{`
    .statistics-view.statistics-view{max-width:1280px;margin:0 auto;padding:24px;color:#0f172a;font-size:14px;line-height:1.6;font-family:inherit}
    .statistics-view.statistics-view h1{font-size:24px;line-height:1.3;font-weight:800;letter-spacing:-.025em;margin:0}
    .statistics-view.statistics-view h2{font-size:18px;line-height:1.5;font-weight:800;margin:0 0 8px;color:#0f172a}
    .statistics-view.statistics-view h3{font-size:16px;font-weight:750}
    .statistics-view.statistics-view p,.statistics-view.statistics-view small,.statistics-view.statistics-view .text-xs,.statistics-view.statistics-view [class*="text-[11px]"],.statistics-view.statistics-view [class*="text-[12px]"]{font-size:12px;line-height:1.6;color:#64748b}
    .statistics-view.statistics-view table{font-size:13px;line-height:1.6}.statistics-view.statistics-view th,.statistics-view.statistics-view td{font-size:13px;padding:11px 12px;vertical-align:top;border-bottom:1px solid #e2e8f0}
    .statistics-view.statistics-view th{background:#f1f5f9;font-weight:700;color:#334155}
    .statistics-view.statistics-view .panel,.statistics-view.statistics-view .stats-panel,.statistics-view.statistics-view .bg-white.rounded-2xl.border{background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 1px 2px #0f172a06}
    .statistics-view.statistics-view .panel{padding:24px;margin-bottom:24px}
    .statistics-view .stats-content{display:flex;flex-direction:column;gap:24px}
    .statistics-view.statistics-view .stats-header{padding:24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
    .statistics-view .stats-heading{display:flex;align-items:center;gap:14px;min-width:0}.statistics-view .stats-heading p{margin:4px 0 0}
    .statistics-view .stats-icon{border:2px solid #f59e0b;background:#0f172a;color:#fbbf24;width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .statistics-view .stats-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .statistics-view.statistics-view button,.statistics-view.statistics-view a,.statistics-view.statistics-view select,.statistics-view.statistics-view input:not([type=checkbox]){font-size:12px;line-height:1.5;border-radius:8px}
    .statistics-view.statistics-view button,.statistics-view.statistics-view .stats-actions a{white-space:nowrap;padding:8px 12px;font-weight:700}
    .statistics-view .stats-print-options{display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-top:1px solid #e2e8f0;margin-top:18px;padding-top:14px;font-size:12px}
    .statistics-view .stats-print-options label{display:flex;flex-direction:row;gap:5px;align-items:center;font-size:12px}.statistics-view .stats-print-options button{border:1px solid #cbd5e1;background:white}
    .statistics-view.statistics-view .stats-kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
    .statistics-view.statistics-view .stats-kpi-grid>div{min-height:208px;height:208px;border-radius:16px;border:1px solid #e2e8f0;background:white;padding:20px;box-shadow:0 1px 2px #0f172a06}
    .statistics-view.statistics-view .stats-kpi-grid .metric{display:flex;flex-direction:column;justify-content:space-between}
    .statistics-view.statistics-view .stats-kpi-grid .metric>span{font-size:12px;font-weight:700;color:#64748b}
    .statistics-view.statistics-view section.panel:has(.stats-kpi-grid){padding:0;border:0;box-shadow:none;background:none}
    .statistics-view.statistics-view .stats-kpi-grid .metric>strong,.statistics-view.statistics-view .stats-kpi-grid .text-2xl{font-size:30px;line-height:1.2;font-weight:800}
    .statistics-view.statistics-view [data-metric="total"] :is(.text-2xl,strong){color:#0f172a}
    .statistics-view.statistics-view [data-metric="submitted"] :is(.text-2xl,strong),.statistics-view.statistics-view [data-metric="complete"] strong{color:#059669}
    .statistics-view.statistics-view [data-metric="accepted"] :is(.text-2xl,strong){color:#d97706}
    .statistics-view.statistics-view [data-metric="rejected"] :is(.text-2xl,strong){color:#f43f5e}
    .statistics-view.statistics-view [data-metric="disqualified"] strong{color:#8b5cf6}
    .statistics-view .stats-donut-layout{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
    .statistics-view .stats-donut-chart{position:relative;width:160px;height:160px;flex:0 0 160px}
    .statistics-view .stats-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
    .statistics-view.statistics-view .stats-donut-center>span{font-size:11px;color:#94a3b8;font-weight:700}
    .statistics-view.statistics-view .stats-donut-center>strong{font-size:24px;line-height:1.3;font-weight:800;color:#d97706}
    .statistics-view.statistics-view .stats-donut-center>small{font-size:11px;color:#64748b;font-weight:600}
    .statistics-view .stats-donut-legend{display:flex;flex-direction:column;gap:12px;flex:1;min-width:190px}
    .statistics-view .stats-legend-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid;border-radius:12px;padding:12px;font-size:12px}
    .statistics-view .stats-legend-row>span:first-child{display:flex;align-items:center;gap:8px;font-weight:700}
    .statistics-view .stats-legend-row i{display:inline-block;width:10px;height:10px;border-radius:50%;margin:0}
    .statistics-view.statistics-view .stats-legend-row b{font-size:14px}.statistics-view.statistics-view .stats-legend-row small{font-size:12px}
    .statistics-view.statistics-view .chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
    .statistics-view.statistics-view .group-card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:14px}
    .statistics-view.statistics-view .track,.statistics-view.statistics-view .stack{height:12px;border-radius:999px;background:#f1f5f9}
    .statistics-view.statistics-view .track>div,.statistics-view.statistics-view .stack>div{height:100%}
    .statistics-view.statistics-view div[class*="h-1.5"],.statistics-view.statistics-view div[class*="h-3"]{height:12px;border-radius:999px}
    .statistics-view .stats-print-caption{display:none}
    @media(max-width:1023px){.statistics-view.statistics-view .stats-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:767px){.statistics-view.statistics-view{padding:16px}.statistics-view.statistics-view h1{font-size:22px}.statistics-view.statistics-view .stats-header,.statistics-view.statistics-view .panel{padding:20px}.statistics-view.statistics-view .chart-grid{grid-template-columns:1fr}.statistics-view .stats-donut-layout{justify-content:center}.statistics-view .stats-donut-legend{min-width:190px;width:100%}}
    @page evaluation-statistics{size:A4 landscape;margin:12mm}
    @media print{
      .admin-shell:has(.statistics-view){display:block;min-height:0;padding:0;background:white}.admin-shell:has(.statistics-view)>:not(main){display:none!important}.admin-shell:has(.statistics-view)>main{page:evaluation-statistics;max-width:none;padding:0}
      .statistics-view.statistics-view{page:evaluation-statistics;max-width:none;padding:0;font-size:10pt}.statistics-view .screen-only,.statistics-view .stats-print-hidden,.statistics-view .skip-print{display:none!important}
      .statistics-view .stats-print-caption{display:block;font-size:9pt}.statistics-view.statistics-view .stats-header,.statistics-view.statistics-view .panel{border:none;box-shadow:none;padding:8px 0;margin-bottom:12px}
      .statistics-view.statistics-view .stats-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.statistics-view.statistics-view .stats-kpi-grid>div{min-height:110px;height:auto;padding:12px}
      .statistics-view.statistics-view .chart-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.statistics-view .stats-content{gap:16px}.statistics-view .stats-layout-grid{display:block!important}.statistics-view .stats-layout-grid>[data-print-section]{margin-bottom:16px}
      .statistics-view [class*="overflow"]{overflow:visible!important;max-height:none!important}.statistics-view table{width:100%;table-layout:fixed}.statistics-view.statistics-view th,.statistics-view.statistics-view td,.statistics-view.statistics-view td *{font-size:9pt;white-space:normal;overflow-wrap:anywhere;padding:5px}
      .statistics-view thead{display:table-header-group;position:static}.statistics-view tr,.statistics-view .stats-donut-chart,.statistics-view .stats-legend-row{break-inside:avoid}.statistics-view h2{break-after:avoid}.statistics-view *{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    }
  `}</style>;
}
