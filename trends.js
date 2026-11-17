(function(root){
  'use strict';
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  function topics(j){
    const list=[...new Set(j.topics||[])], text=[j.title,j.duties].filter(Boolean).join(' ');
    const ultrasound=/초음파|소노[그노]래?퍼|소노그레퍼|sonograph(?:er|y)?|ultrasound|ultrasonograph/i.test(text);
    const industrial=/비파괴|위상배열|PAUT|\bUT\b|용접|탐상/i.test(text);
    const clinical=/의료|진단|임상|병원|검진|심장|산부인과|혈관|복부|유방/i.test(text);
    const ultrasoundRole=/초음파사|소노|sonograph|초음파.*(?:검사|임상|어플)|ultrasound.*(?:application|clinical)/i.test(text);
    const equipment=/생산직|제조직|품질검사|SQA|신호.?영상처리|SW.?개발|소프트웨어.*개발|펌웨어|기구.?개발|Mechanical Engineer|Production Supervisor|기구설계/i.test(j.title||'');
    if(ultrasound&&(clinical||ultrasoundRole)&&!equipment&&!list.includes('faculty')&&(!industrial||clinical)&&!list.includes('sonographer'))list.push('sonographer');
    return list;
  }
  const number=n=>Number.isInteger(n)&&n>0?n:null;
  function records(jobs,history){
    const map=new Map();
    for(const j of [...(history||[]),...(jobs||[])]){
      const date=j.date||(j.posted||j.start||'').slice(0,10);
      const record={...j,date,dateBasis:j.dateBasis||(j.posted?'posted':'start'),topics:topics(j),source:j.source||j.links?.[0],openings:number(j.openings)};
      map.set(j.id,record);
    }
    return [...map.values()];
  }
  function aggregate(input,asOf,options={}){
    if(!validDate(asOf))throw new Error('Invalid cutoff');
    const end=new Date(asOf+'T00:00:00Z'), first=new Date(end);const month=first.getUTCMonth();first.setUTCFullYear(first.getUTCFullYear()-1);if(first.getUTCMonth()!==month)first.setUTCDate(0);first.setUTCDate(first.getUTCDate()+1);
    if(options.start){if(!validDate(options.start)||options.start>asOf)throw new Error('Invalid start');first.setTime(Date.parse(options.start+'T00:00:00Z'));}
    const start=first.toISOString().slice(0,10), months=[];
    const cursor=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),1));
    while(cursor<=end){const key=cursor.toISOString().slice(0,7);months.push({key,records:[],ads:0,headcount:0,known:0,unknown:0,repeats:0,partial:key===start.slice(0,7)&&start.slice(8)!=='01'||key===asOf.slice(0,7)&&new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate()!==end.getUTCDate()});cursor.setUTCMonth(cursor.getUTCMonth()+1);}
    const selectedTopics=options.topics??(options.topic?[options.topic]:[]),selectedRegions=options.regions??(options.region?[options.region]:[]);
    const byMonth=new Map(months.map(m=>[m.key,m]));let undated=0;const ids=new Set(),vacancies=new Set();
    // Recognize earlier campaigns before the window so reposts do not add the same TO again.
    const sorted=[...input].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    for(const j of sorted){
      if(selectedTopics.length&&!selectedTopics.some(t=>topics(j).includes(t))||options.category&&options.category!=='all'&&j.category!==options.category||selectedRegions.length&&!selectedRegions.some(r=>(j.regions||[]).includes(r)))continue;
      if(ids.has(j.id))continue;ids.add(j.id);
      if(!validDate(j.date)){undated++;continue;}
      const vacancy=j.vacancyKey||j.id, repeat=vacancies.has(vacancy);vacancies.add(vacancy);
      if(j.date<start||j.date>asOf)continue;
      const m=byMonth.get(j.date.slice(0,7));
      // Per-topic totals may overlap; a combined selection uses only the verified overall total.
      const n=number(selectedTopics.length===1&&j.openingsByTopic?j.openingsByTopic[selectedTopics[0]]:j.openings);
      const entry={...j,trendOpenings:n,repeat};m.records.push(entry);m.ads++;
      if(n===null)m.unknown++;else if(repeat)m.repeats++;else {m.headcount+=n;m.known++;}
    }
    return {start,end:asOf,months,undated,ads:months.reduce((n,m)=>n+m.ads,0),headcount:months.reduce((n,m)=>n+m.headcount,0),known:months.reduce((n,m)=>n+m.known,0),unknown:months.reduce((n,m)=>n+m.unknown,0),covered:months.filter(m=>m.ads).length};
  }
  const api={validDate,topics,records,aggregate};if(typeof module==='object')module.exports=api;else root.FluenceTrends=api;
})(typeof globalThis==='object'?globalThis:this);
