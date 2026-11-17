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
