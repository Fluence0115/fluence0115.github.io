const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const root=fs.existsSync(path.join(__dirname,'../dist/trends.js'))?path.join(__dirname,'../dist'):path.join(__dirname,'..');const T=require(path.join(root,'trends.js'));
const r=(id,date,n,topics=['safety'],more={})=>({id,date,openings:n,topics,category:'public',regions:['대전'],...more});
let x=T.aggregate([r('outside','2025-11-17',99),r('first','2025-11-18',2),r('last','2026-11-17',3),r('future','2026-11-18',90),r('unknown','2026-05-01',null),r('zero','2026-05-02',0)],'2026-11-17');
assert.equal(x.start,'2025-11-18');assert.equal(x.headcount,5);assert.equal(x.ads,4);assert.equal(x.months.length,13);assert.equal(x.months[2].ads,0);assert.equal(x.months.find(m=>m.key==='2026-05').known,0);assert.equal(x.unknown,2);
x=T.aggregate([r('a','2026-02-01',2,['safety','research']),r('a','2026-02-01',2),r('b','2026-03-01',2,['safety'],{vacancyKey:'campaign'}),r('c','2026-04-01',2,['safety'],{vacancyKey:'campaign'})],'2026-11-17');assert.equal(x.ads,3);assert.equal(x.headcount,4);assert.equal(x.months.find(m=>m.key==='2026-04').repeats,1);
x=T.aggregate([r('old','2025-01-01',2,['safety'],{vacancyKey:'same'}),r('new','2026-02-01',2,['safety'],{vacancyKey:'same'})],'2026-11-17');assert.equal(x.headcount,0);assert.equal(x.ads,1);
const records=T.records([{id:'closed',posted:null,start:'2026-01-02T09:00:00+09:00',status:'closed',topics:['safety'],openings:1}],[]);assert.equal(records[0].date,'2026-01-02');assert.equal(records[0].dateBasis,'start');assert.equal(T.aggregate(records,'2026-11-17').headcount,1);
assert.equal(T.aggregate([r('a','2026-02-01',2,['safety','research'])],'2026-11-17',{topic:'research'}).headcount,2);
assert.equal(T.aggregate([r('a','2026-02-01',2)],'2026-11-17',{region:'경기'}).ads,0);
assert.equal(T.aggregate([],'2024-02-29').start,'2023-03-01');assert.equal(T.validDate('2026-02-30'),false);
for(const title of ['초음파 검사','소노그래퍼','소노그레퍼','Clinical Sonographer','Ultrasound application specialist'])assert(T.topics({title,topics:[]}).includes('sonographer'));
assert(!T.topics({title:'초음파·위상배열 비파괴검사 UT PAUT',topics:[]}).includes('sonographer'));assert(!T.topics({title:'초음파 연구 교수',topics:['faculty']}).includes('sonographer'));
const jobs=JSON.parse(fs.readFileSync(path.join(root,'jobs.json'))).jobs,history=JSON.parse(fs.readFileSync(path.join(root,'trend-history.json'))).records;
assert.equal(new Set(jobs.map(j=>j.id)).size,jobs.length);assert.equal(new Set(history.map(j=>j.id)).size,history.length);
for(const j of history){assert(T.validDate(j.date));assert(j.openings===null||Number.isInteger(j.openings)&&j.openings>0);assert(/^https:\/\//.test(j.source.url));}
for(const topic of ['safety','nuclear_safety','research','ic','radiographer','sonographer','faculty']){x=T.aggregate(T.records(jobs,history),'2026-11-17',{topic});assert(x.ads>0);}
console.log('Passed: year boundaries, missing vs zero, unknown TO, dedup/reposts, archived records, filters, ultrasound aliases, source data.');
// The public board now starts in October 2026; keep default-window compatibility.
x=T.aggregate([r('sep','2026-09-30',100),r('oct','2026-10-01',2),r('nov','2026-11-17',3),r('future2','2026-11-18',100)],'2026-11-17',{start:'2026-10-01'});
assert.equal(x.start,'2026-10-01');assert.deepEqual(x.months.map(m=>m.key),['2026-10','2026-11']);assert.equal(x.headcount,5);assert.equal(x.ads,2);assert.equal(x.months[0].partial,false);assert.equal(x.months[1].partial,true);
assert.throws(()=>T.aggregate([],'2026-11-17',{start:'2026-12-01'}));
for(const title of ['초음파 세척 Operator','초음파 의료기기 신호 영상처리 엔지니어','초음파 진단기 SQA','초음파 Probe 품질검사','초음파사업부 Mechanical Engineer'])assert(!T.topics({title,topics:[]}).includes('sonographer'),title);
const data=JSON.parse(fs.readFileSync(path.join(root,'jobs.json'))),byId=new Map(jobs.map(j=>[j.id,j])),allowed=new Set(['safety','nuclear_safety','research','ic','radiographer','sonographer','faculty']);
assert.equal(data.trendStart,'2026-10-01');assert.equal(new Set(data.addedThisUpdate).size,data.addedThisUpdate.length);
for(const j of jobs){for(const k of ['detail','fields','topics','licenses','regions','links'])assert(Array.isArray(j[k]),`${j.id}.${k}`);assert(j.topics.every(t=>allowed.has(t)));assert(j.openings===null||j.openings===undefined||Number.isInteger(j.openings)&&j.openings>0);for(const k of ['posted','start','end'])if(j[k])assert(T.validDate(j[k].slice(0,10)));for(const l of j.links)assert(/^https?:\/\//.test(l.url));}
for(const id of data.addedThisUpdate)assert(byId.has(id));
assert.equal(byId.get('sr-55468570').openings,null); // Six exam rooms are not six hires.
assert.equal(byId.get('sr-55580829').openings,null); // A second MRI is not two hires.
assert.equal(byId.get('sr-55417535').openings,null); // One workday is not one hire.
assert.equal(byId.get('sr-55399913').openings,null); // Four mixed hires cannot be assigned to safety.
assert.equal(byId.get('sr-55519459').openings,3); // Three named QA/design fields, one each.
assert(!byId.has('sr-55467179'));assert(byId.get('jk-50293232').links.some(l=>l.url.includes('55467179')));
assert(!byId.has('sr-55506964'));assert(byId.get('sr-55542378').links.some(l=>l.url.includes('55506964')));
assert(!byId.has('sr-55204325')); // October 31 temporary work has already passed.
assert.equal(byId.get('sr-55599451').regions[0],'광주');
console.log('Passed: October cutoff, 2-month chart, category data, dedup, expired short shifts, equipment exclusion, TO evidence.');
// Broad discovery keywords are a registry, not claims that each job has every skill.
const vm=require('node:vm'),scopeContext=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'topic-scopes.js'),'utf8'),scopeContext);const scopes=vm.runInContext('topicScopes',scopeContext),strategy=JSON.parse(fs.readFileSync(path.join(root,'search-strategy.json')));
assert.equal(Object.values(strategy.topics).reduce((n,t)=>n+t.keywords.length,0),150);
for(const [topic,config] of Object.entries(strategy.topics))assert.equal(JSON.stringify(scopes[topic].words),JSON.stringify(config.keywords));
for(const word of ['방사성','방사성동위원소','방사선취급감독자','동위원소','삼중수소','차폐해석'])assert(strategy.topics.safety.keywords.includes(word));
assert(byId.has('sr-55521053'));assert(byId.get('sr-55521053').topics.includes('ic'));
assert(!byId.has('sr-55417472')); // Work on November 12–13 has already ended.
assert(!byId.has('sr-55530832'));assert(byId.get('sr-55530866').links.some(l=>l.url.includes('55530832')));
assert.equal(byId.get('sr-55593244').status,'check');assert.equal(byId.get('sr-55593244').openings,null); // Mixed 13-person total is not radiography TO.
assert.equal(byId.get('snu-nucl-24083').status,'check');assert.equal(byId.get('snu-nucl-24083').openings,null); // No guesses from inaccessible attachment.
assert(!byId.get('sr-55362447').topics.includes('sonographer'));assert(!T.topics(byId.get('sr-55391730')).includes('sonographer'));
assert.equal(byId.get('sr-55541080').regions[0],'경기');
console.log('Passed: 150-keyword registry consistency, requested aliases, broader roles, work-date exclusions, schedule alternatives, source conflicts and job-family separation.');
