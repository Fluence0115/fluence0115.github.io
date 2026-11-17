'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=fs.existsSync(path.join(__dirname,'../dist/app.js'))?path.join(__dirname,'../dist'):path.join(__dirname,'..');
const F=require(path.join(root,'filters.js')),T=require(path.join(root,'trends.js'));
const jobs=[
{id:'both',topics:['safety','accelerator'],regions:['대전','경기'],licenses:[{name:'RI',level:'필수'},{name:'SRI',level:'우대'}]},
{id:'sri',topics:['safety'],regions:['경기'],licenses:[{name:'SRI',level:'필수'}]},
{id:'other-region',topics:['accelerator'],regions:['서울'],licenses:[{name:'RI',level:'필수'}]},
{id:'other-license',topics:['safety'],regions:['대전'],licenses:[{name:'방사선사',level:'필수'}]},
{id:'uncertain',topics:['accelerator'],regions:['경기'],licenses:[{name:'RI',level:'필수 여부 확인'}]},
];
const selection={fields:['safety','accelerator'],regions:['대전','경기'],licenses:['RI','SRI']};
assert.deepEqual(jobs.filter(j=>F.matches(j,selection)).map(j=>j.id),['both','sri','uncertain']);
assert.deepEqual(jobs.filter(j=>F.matches(j,{...selection,requiredOnly:true})).map(j=>j.id),['both','sri']);
assert(!F.matches(jobs[0],{licenses:['SRI'],requiredOnly:true}));
assert(!F.matches(jobs[0],{licenses:['SRI','RI'],requiredOnly:true,workspaceLicense:'SRI'}));
assert(F.matches(jobs[0],{licenses:['SRI','RI'],requiredOnly:true,workspaceLicense:'RI'}));
assert.equal(jobs.filter(j=>F.matches(j,{})).length,5);
// Exercise the real list filter, including the mixed faculty/industry closed-status exception.
const elements={'#sourceFilter':{value:''},'#search':{value:''},'#hideClosed':{checked:true},'#requiredOnly':{checked:false},'#salaryOnly':{checked:false},'#sort':{value:'latest'}};
const checks={fieldFilter:[{value:'safety'},{value:'faculty'}],region:[],license:[]};
const document={querySelector:s=>elements[s],querySelectorAll:s=>checks[s.match(/^#(\w+)/)[1]]||[]};
const ctx=vm.createContext({document,localStorage:{getItem:()=>null},FluenceTrends:T,FluenceFilters:F,URL,location:{href:'https://fluence0115.github.io/'},Date,console});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/init\(\);\s*$/,''),ctx);
const fixtures=[['open-safety','safety','open'],['closed-safety','safety','closed'],['open-faculty','faculty','open'],['closed-faculty','faculty','closed']].map(([id,topic,status])=>({id,title:id,company:id,topics:[topic],fields:[topic],regions:['대전'],licenses:[],status,start:null,end:null,posted:'2026-11-01',links:[],detail:[]}));
ctx.fixtures=fixtures;vm.runInContext('jobs=fixtures',ctx);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(filtered().map(j=>j.id))',ctx)),['open-safety','open-faculty','closed-faculty']);
assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(filtered({facultyStatus:'closed'}).map(j=>j.id))",ctx)),['open-safety','closed-faculty']);
console.log('Passed: checkbox OR within groups, AND across groups, required selected license, unknown requirement, empty selections, faculty/industry status isolation.');
