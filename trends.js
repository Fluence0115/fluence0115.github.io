(function(root){
  'use strict';
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const topicOrder=['safety','nuclear_safety','accelerator','research','ic','ndt','radiographer','sonographer','other','faculty'];
  function primaryTopic(j){
    const declared=[...new Set((j.topics||[]).filter(t=>topicOrder.includes(t)))];
    // A reviewed single field is authoritative. Infer only for legacy/imported records.
    if(declared.length===1)return declared[0];
    const title=j.title||'',text=[title,j.duties].filter(Boolean).join(' ');
    if(declared.includes('faculty')||/교수|교원.*초빙/.test(title))return 'faculty';
    const industrial=/비파괴|위상배열|PAUT|\bUT\b|탐상/i.test(text);
    const equipment=/생산직|제조직|품질검사|SQA|신호.?영상처리|SW.?개발|소프트웨어.*개발|펌웨어|기구.?개발|Mechanical Engineer|Production Supervisor|기구설계/i.test(title);
    const ultrasound=/초음파|소노[그노]래?퍼|소노그레퍼|sonograph(?:er|y)?|ultrasound|ultrasonograph/i.test(text);
    const clinical=/의료|진단|임상|병원|검진|심장|산부인과|혈관|복부|유방/i.test(text);
    const ultrasoundRole=/초음파사|소노|sonograph|초음파.*(?:검사|임상|어플)|ultrasound.*(?:application|clinical)/i.test(text);
    if(ultrasound&&(clinical||ultrasoundRole)&&!equipment&&!industrial&&!/해외영업|해영|영업이사/.test(title))return 'sonographer';
    const safetyAt=title.search(/방사선\s*안전|방사선방호|선량평가|피폭관리/),ndtAt=title.search(/비파괴|탐상|PAUT/i);
    if(safetyAt>=0&&(ndtAt<0||safetyAt<ndtAt))return 'safety';
    if(ndtAt>=0)return 'ndt';
    if(declared.includes('accelerator')||/가속기|사이클로트론|가속관|cyclotron|LINAC|synchrotron/i.test(title))return 'accelerator';
    if(/방사선사/.test(title)&&!equipment&&!/영업|검증/.test(title))return 'radiographer';
    if(/계측|제어|펌웨어|SW|소프트웨어|HW|하드웨어|회로|V&V|사이버보안/i.test(title))return 'ic';
    if(/연구|R&D|개발|CFD/i.test(title)&&declared.includes('research'))return 'research';
    return ['nuclear_safety','safety','ic','research','radiographer','sonographer','ndt',...topicOrder].find(t=>declared.includes(t))||'other';
  }
  const topics=j=>[primaryTopic(j)];
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
  const api={validDate,primaryTopic,topicOrder,topics,records,aggregate};if(typeof module==='object')module.exports=api;else root.FluenceTrends=api;
})(typeof globalThis==='object'?globalThis:this);
