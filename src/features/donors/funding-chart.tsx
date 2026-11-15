"use client";
import { useId,useState } from 'react';
import { formatMoney } from '@/lib/domain/rules';
import { fundingData,type FundingGift } from './funding-data';
import styles from './funding-chart.module.css';
const options=['Bar chart','Line chart','Pie chart','Doughnut chart'] as const;
const colors=['#007a3d','#51a675','#88be99','#b2d9bd','#4c8063','#206d55'];
export function FundingChart({gifts,scope}:{gifts:FundingGift[];scope:string}) {
  const id=useId(),[chart,setChart]=useState<typeof options[number]>('Bar chart');
  const rows=fundingData(gifts),total=rows.reduce((sum,r)=>sum+r.cents,0),max=Math.max(1,...rows.map(r=>r.cents));
  const ring=chart==='Pie chart'||chart==='Doughnut chart';let angle=-Math.PI/2;
  return <section className={styles.panel} aria-label="Where donor funds go">
    <header><div><h2>Where donor funds go</h2><p>{scope} · All recorded dates · Recorded program designations, not verified expenditure.</p></div>
      <label htmlFor={id}>Pick your own chart<select id={id} value={chart} onChange={e=>setChart(e.target.value as typeof chart)}>{options.map(option=><option key={option}>{option}</option>)}</select></label></header>
    {!total?<p>No received gifts are recorded for these donors.</p>:<>
      <svg role="img" aria-label={`${chart}: recorded giving by program`} viewBox="0 0 760 320" className={styles.chart}>
        <title>{`${chart} — recorded giving by program, ${formatMoney(total)} total`}</title>
        {ring?rows.map((row,i)=>{
          const start=angle,end=angle+row.cents/total*Math.PI*2;angle=end;
          if(row.cents===total)return <circle key={row.label} cx={210} cy={155} r={125} fill={colors[i%colors.length]}><title>{`${row.label}: ${formatMoney(row.cents)}`}</title></circle>;
          const x1=210+125*Math.cos(start),y1=155+125*Math.sin(start),x2=210+125*Math.cos(end),y2=155+125*Math.sin(end);
          return <path key={row.label} d={`M210 155 L${x1} ${y1} A125 125 0 ${end-start>Math.PI?1:0} 1 ${x2} ${y2} Z`} fill={colors[i%colors.length]}><title>{`${row.label}: ${formatMoney(row.cents)}`}</title></path>;
        }):<>
          {[0,.5,1].map(ratio=><g key={ratio}><line x1={80} x2={730} y1={250-ratio*205} y2={250-ratio*205} stroke="#dce8df"/><text x={5} y={255-ratio*205} fontSize={12}>{formatMoney(Math.round(max*ratio))}</text></g>)}
          {chart==='Line chart'&&<polyline fill="none" stroke="#007a3d" strokeWidth={4} points={rows.map((r,i)=>`${110+i/Math.max(1,rows.length-1)*590},${250-r.cents/max*205}`).join(' ')}/>}
          {rows.map((row,i)=>{const x=chart==='Bar chart'?80+(i+.5)*650/rows.length:110+i/Math.max(1,rows.length-1)*590,y=250-row.cents/max*205;return <g key={row.label}>{chart==='Bar chart'?<rect x={x-100/Math.max(1,rows.length)} y={y} width={200/Math.max(1,rows.length)} height={250-y} rx={4} fill={colors[i%colors.length]}/>:<circle cx={x} cy={y} r={6} fill="#007a3d"/>}<text x={x} y={278} textAnchor="middle" fontSize={12}>{i+1}</text><title>{`${row.label}: ${formatMoney(row.cents)}`}</title></g>;})}
        </>}
        {chart==='Doughnut chart'&&<><circle cx={210} cy={155} r={77} fill="white"/><text x={210} y={160} textAnchor="middle" fontSize={22} fill="#007a3d">{formatMoney(total)}</text></>}
        {ring&&<text x={410} y={150} fill="#007a3d" fontSize={28}>{formatMoney(total)} recorded</text>}
      </svg>
      <p className={styles.note}>{chart==='Line chart'?'Points compare program categories; this is not a time trend.':'Each category shows its share of recorded gifts.'}</p>
      <div className="table-scroll"><table><caption>Exact giving by program — USD</caption><thead><tr><th>Program</th><th>Recorded gifts</th><th>Share</th></tr></thead><tbody>{rows.map((row,i)=><tr key={row.label}><td><span aria-hidden style={{color:colors[i%colors.length]}}>● </span>{i+1}. {row.label}</td><td>{formatMoney(row.cents)}</td><td>{(row.cents/total*100).toFixed(1)}%</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
