'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = x => {try {let u = new URL(x);return ['https:','http:'].includes(u.protocol) ? u.href : '#';} catch {return '#';}};
const read = (key, fallback) => {try {return JSON.parse(localStorage.getItem('nuclear-careers:'+key)) ?? fallback;}catch{return fallback;}};
const write = (key, value) => {try {localStorage.setItem('nuclear-careers:'+key, JSON.stringify(value));return true;}catch{toast('브라우저 저장 공간을 사용할 수 없습니다.');return false;}};
const categories = {public:'공공기관(정출연 포함)',private:'사기업'};
const fieldNames={nuclear:'원자력',radiation:'방사선',design:'설계·안전해석',quality:'품질·기기검증',ic:'계측제어·SW',waste:'해체·방폐물',smr:'SMR',fuel:'핵연료·원자로',maintenance:'정비·제작·시공',safety:'방사선안전·방호',ndt:'비파괴검사',fusion:'가속기·핵융합',isotope:'동위원소·의약품·장비',support:'영업·사업지원',research:'연구직·R&D',faculty:'교수·교원'};
const jobFields=j=>Array.isArray(j.fields)?j.fields:[];
const hasLicense=(j,name)=>j.licenses.some(l=>l.name===name);
const requiredLicense=l=>l.level.startsWith('필수')&&!/확인|불명/.test(l.level);
const graduateRole=j=>/석사|박사|석·박사/.test(j.education+' '+j.qualifications);
const workspaceViews={
  research:{label:'연구직',note:'석·박사 필수·우대 조건이 있는 공고를 최근 접수순에서 먼저 보여줍니다. 학사·학력무관 연구직도 함께 포함하며, 실제 학위·경력 요건은 공고별로 확인하세요.',match:j=>jobFields(j).includes('research')},
  technologist:{label:'방사선관리기술사',note:'방사선관리기술사 자격이 명시된 공고입니다. 종목이 명시되지 않은 일반적인 ‘기술사 우대’ 문구는 이 분류에 포함하지 않습니다.',match:j=>hasLicense(j,'방사선관리기술사')},
  sri:{label:'SRI면허',note:'SRI 면허의 필수·우대·대체 조건을 함께 모았습니다. RI 또는 SRI 중 하나를 요구하는 공고는 두 메뉴에 모두 나타나며, 전체 공고 수에는 한 번만 계산합니다.',match:j=>hasLicense(j,'SRI')},
  ri:{label:'RI면허',note:'RI 면허의 필수·우대·대체 조건을 함께 모았습니다. 같은 공고가 여러 자격에 해당할 수 있으므로 각 공고의 자격 표시를 확인하세요.',match:j=>hasLicense(j,'RI')}
};
const groupLabel=j=>j.organisationType||categories[j.category];
const jobSources = j => [...new Set(j.links.map(l=>{const h=new URL(safeUrl(l.url),location.href).hostname;return h.endsWith('saramin.co.kr')?'사람인':h.endsWith('jobkorea.co.kr')?'잡코리아':h.endsWith('incruit.com')?'인크루트':h.endsWith('work24.go.kr')?'고용24':h==='nisp.kr'?'원전산업 플랫폼(NISP)':h.endsWith('hibrain.net')?'하이브레인넷':h.endsWith('jobs.ac.kr')?'JOBS.ac.kr':h.endsWith('ibric.org')?'BRIC':h.endsWith('rndjob.or.kr')?'RND JOB':h.endsWith('rememberapp.co.kr')?'리멤버':h.endsWith('wanted.co.kr')?'원티드':h.endsWith('injob.co.kr')?'인잡':h.endsWith('catch.co.kr')?'캐치':'공식 채용·공공 포털';}))];
const salaryDisclosed = j => /[0-9][0-9,~～ .]*(?:만\s*원|원)/.test(j.salary);

let base, jobs=[], extras=read('customJobs',[]), saved=new Set(read('saved',[])), tracking=read('tracking',{});
let view='all', category='all', currentId=null, toastTimer;
let storageSafe = true;
const fmt = d => d ? d.slice(0,10).replaceAll('-','.') : '미공개';
const fmtShort = d => d ? (d.slice(0,4)===new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}).slice(0,4)?d.slice(5,10).replace('-','.'):d.slice(0,10).replaceAll('-','.')) : '채용 시 마감';
const dateValue = (d, end=false) => d ? Date.parse(d.length===10 ? d+(end?'T23:59:59+09:00':'T00:00:00+09:00') : d) : Infinity;
const hasConcern = j => j.status==='check'||/상충|제한|미작성|배치.*확인|차이|상이|요약란|다르|확인해야/.test(j.notes);
function state(j) {
  if(j.end && dateValue(j.end,true)<Date.now()) return 'closed';
  if(j.status==='check') return 'check';
  if(j.start && dateValue(j.start)>Date.now())return 'upcoming';
  return 'open';
}
function statusText(j) {return {closed:'마감',check:'접수 확인 필요',upcoming:'접수 예정',open:j.end?'접수기간 중':'채용 시 마감'}[state(j)];}
function deadline(j) {
  const st=state(j);
  if(st==='closed')return ['마감','closed'];
  if(st==='check')return ['상태 확인','check'];
  if(st==='upcoming')return [fmtShort(j.start)+' 시작',''];
  if(!j.end)return ['채용 시 마감',''];
  const today = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
  const days=Math.round((Date.parse(j.end.slice(0,10)+'T00:00:00+09:00')-Date.parse(today+'T00:00:00+09:00'))/86400000);
  return [days===0?'오늘 마감':`D-${days}`,days<=3?'urgent':''];
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function rebuild(){const map=new Map(base.jobs.map(j=>[j.id,j]));if(Array.isArray(extras))for(const j of extras)map.set(j.id,j);jobs=[...map.values()].map(j=>({...j,category:j.category==='public'?'public':'private'}));const selected=$('#sourceFilter').value;const sources=[...new Set(jobs.flatMap(jobSources))].sort((a,b)=>a.localeCompare(b,'ko'));$('#sourceFilter').innerHTML='<option value="">모든 출처</option>'+sources.map(s=>`<option>${esc(s)}</option>`).join('');$('#sourceFilter').value=sources.includes(selected)?selected:'';}
function filtered(){
  const q=$('#search').value.trim().toLowerCase(), region=$('#region').value, license=$('#license').value;
  let list=jobs.filter(j=>{
    if($('#hideClosed').checked && state(j)==='closed')return false;
    if(workspaceViews[view]&&!workspaceViews[view].match(j))return false;
    if(view==='faculty'&&!jobFields(j).includes('faculty'))return false;
    if(view==='saved'&&!saved.has(j.id))return false;
    if(view==='tracking'&&(!tracking[j.id]||!tracking[j.id].stage))return false;
    if(category!=='all'&&j.category!==category)return false;
    if(region && !j.regions.includes(region))return false;
    if($('#fieldFilter').value&&!jobFields(j).includes($('#fieldFilter').value))return false;
    if($('#sourceFilter').value&&!jobSources(j).includes($('#sourceFilter').value))return false;
    if($('#salaryOnly').checked&&!salaryDisclosed(j))return false;
    if(license&&!j.licenses.some(l=>l.name===license))return false;
    if($('#requiredOnly').checked&&!j.licenses.some(l=>requiredLicense(l)&&(!license||l.name===license)&&(!['sri','ri','technologist'].includes(view)||l.name===({sri:'SRI',ri:'RI',technologist:'방사선관리기술사'}[view]))))return false;
    if(q){let blob=[j.company,j.title,j.location,j.education,j.experience,j.duties,j.qualifications,j.relationType,...jobFields(j).map(f=>fieldNames[f]),...j.detail].join(' ').toLowerCase();if(blob.includes('사이클로트론'))blob+=' 가속기';if(jobFields(j).includes('nuclear'))blob+=' 원전 원자력';if(jobFields(j).includes('ic'))blob+=' 계측제어 i&c software 소프트웨어';if(jobFields(j).includes('waste'))blob+=' 방사성폐기물 방폐물 해체';if(jobFields(j).includes('smr'))blob+=' 소형모듈원자로 smr';if(jobFields(j).includes('research'))blob+=' 연구 r&d rnd 포닥 연구원';if(jobFields(j).includes('faculty'))blob+=' 교수 교원 초빙';
      if(!q.split(/\s+/).every(t=>['sri','ri'].includes(t)?j.licenses.some(l=>l.name.toLowerCase()===t):blob.includes(t)))return false;
    }return true;
  });
  const latest=(a,b)=>(dateValue(b.start||b.posted)===Infinity?0:dateValue(b.start||b.posted))-(dateValue(a.start||a.posted)===Infinity?0:dateValue(a.start||a.posted));
  const sort=$('#sort').value;
  list.sort((a,b)=>sort==='latest'?(view==='research'?(Number(graduateRole(b))-Number(graduateRole(a)))||latest(a,b):latest(a,b)) : sort==='deadline' ? (dateValue(a.end,true)-dateValue(b.end,true))||latest(a,b) : a.company.localeCompare(b.company,'ko'));
  return list;
}
function render(){
  const active=jobs.filter(j=>state(j)!=='closed');
  for(const [key,config] of Object.entries(workspaceViews))$('#nav-'+key).textContent=active.filter(config.match).length;
  $('#navTotal').textContent=jobs.length;$('#navSaved').textContent=saved.size;$('#navTracking').textContent=Object.values(tracking).filter(t=>t.stage).length;
  $('#statAll').textContent=jobs.length;$('#statPrivate').textContent=active.filter(j=>j.category==='private').length;$('#statPublic').textContent=active.filter(j=>j.category==='public').length;$('#statSaved').textContent=saved.size;$('#allCount').textContent=jobs.length;
  const list=filtered();$('#resultCount').textContent=list.length;
  const currentWorkspace=workspaceViews[view];const workspaceNotice=$('#workspaceNotice');workspaceNotice.hidden=!currentWorkspace;workspaceNotice.innerHTML=currentWorkspace?`<strong>${esc(currentWorkspace.label)} 공고</strong><p>${esc(currentWorkspace.note)}</p>`:'';
  $('#listHeading').textContent=currentWorkspace?currentWorkspace.label+' 채용공고':view==='saved'?'관심 공고':view==='tracking'?'지원 관리':$('#fieldFilter').value?fieldNames[$('#fieldFilter').value]+' 채용공고':'전체 채용공고';
  const academic=view==='faculty'||$('#fieldFilter').value==='faculty';const box=$('#academicNotice');box.hidden=!academic;box.innerHTML=academic?`<strong>방사선·원자력 관련 학과 교수 초빙</strong><p>전임·비전임·연구교수를 구분합니다. 방사선사 면허가 지원자격인 교수직도 포함하며, 의료기관의 임상 방사선사 채용은 제외합니다. 마감 공고와 현재 모집 여부를 확인하지 못한 오래된 상시 초빙은 접수 중 목록에서 제외합니다.</p>${(base.facultyChecks||[]).length?`<details><summary>확인한 교수 초빙 공고·게시판 ${base.facultyChecks.length}곳</summary><div class="faculty-checks">${base.facultyChecks.map(c=>`<div><a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer">${esc(c.name)} ↗</a><span>${esc(c.result)}</span></div>`).join('')}</div></details>`:''}`:'';
  $('#nuclearCount').textContent=active.filter(j=>jobFields(j).includes('nuclear')).length;
  $$('[data-field]').forEach(b=>b.classList.toggle('active',$('#fieldFilter').value===b.dataset.field));
  $$('[data-source]').forEach(b=>b.classList.toggle('active',$('#sourceFilter').value===b.dataset.source));
  const bits=[];if(currentWorkspace)bits.push(currentWorkspace.label);if(view==='faculty')bits.push('교수 채용');if($('#fieldFilter').value)bits.push(fieldNames[$('#fieldFilter').value]);if($('#region').value)bits.push($('#region').value);if($('#license').value)bits.push($('#license').value);if($('#requiredOnly').checked)bits.push('필수 면허');if($('#sourceFilter').value)bits.push($('#sourceFilter').value);if($('#salaryOnly').checked)bits.push('급여 공개');
  $('#filterSummary').textContent=bits.length?' · '+bits.join(' / '):'';
  $('#jobList').innerHTML=list.length?list.map(j=>{
    const [due,cls]=deadline(j), t=tracking[j.id];const short=j.company==='한국핵융합에너지연구원'?'KFE':j.company==='한전KPS'?'KPS':j.company==='원자력안전위원회'?'NSSC':j.company.slice(0,2);
    return `<article class="job-row" data-id="${esc(j.id)}"><div class="company-logo ${esc(j.category)}" aria-hidden="true">${esc(short)}</div><div class="job-info"><div class="row-top"><span class="company">${esc(j.company)}</span><span class="group-badge ${esc(j.category)}">${esc(groupLabel(j))}</span></div><div class="field-badges">${jobFields(j).filter(f=>!['nuclear','radiation'].includes(f)).map(f=>`<span>${esc(fieldNames[f])}</span>`).join('')}${j.relationType&&j.relationType!=='관련 분야 직접 직무'?`<span class="indirect">${esc(j.relationType)}</span>`:''}</div><button class="job-title" data-detail="${esc(j.id)}">${esc(j.title)}</button><div class="job-meta"><span>${esc(j.location)}</span><span>${esc(j.experience)}</span><span>${esc(j.education)}</span></div><div class="salary-line ${salaryDisclosed(j)?'disclosed':'undisclosed'}"><span>급여</span><strong>${esc(j.salary||'미공개')}</strong></div><div class="source-badges">${jobSources(j).map(n=>`<span>${esc(n)}</span>`).join('')}</div>${j.licenses.length||hasConcern(j)||t?.stage?`<div class="tag-row">${j.licenses.map(l=>`<span class="license-tag ${l.name==='SRI'?'license-sri':l.name==='RI'?'license-ri':l.name==='방사선관리기술사'?'license-tech':''}">${esc(l.name)} ${esc(l.level)}</span>`).join('')}${hasConcern(j)?'<span class="notice-tag">조건·상태 확인</span>':''}${t?.stage?`<span class="stage-tag">${esc(t.stage)}</span>`:''}</div>`:''}</div><div class="row-right"><button class="save ${saved.has(j.id)?'saved':''}" data-save="${esc(j.id)}" aria-label="${esc(j.company)} 관심 공고 ${saved.has(j.id)?'해제':'저장'}" aria-pressed="${saved.has(j.id)}">${saved.has(j.id)?'★':'☆'}</button><span class="deadline ${cls}">${esc(due)}</span><span class="end-date">${j.end?fmtShort(j.end)+' 마감':'마감일 미정'}</span></div></article>`;
  }).join(''):`<div class="empty"><h3>${view==='saved'?'관심 있는 공고를 모아보세요':view==='tracking'?'지원 준비를 시작해 보세요':academic?'현재 조건에서 확인된 교수 공고가 없습니다':view==='technologist'?'명시적으로 확인된 방사선관리기술사 공고가 없습니다':'조건에 맞는 공고가 없습니다'}</h3><p>${view==='saved'?'공고의 별을 누르면 이곳에 저장됩니다.':view==='tracking'?'공고 상세에서 지원 상태와 메모를 남길 수 있습니다.':(academic?'확인한 초빙 공고의 마감·확인 제한 내역은 위에서 펼쳐볼 수 있습니다.':'필터를 줄이거나 다른 키워드로 검색해 보세요.')}</p><button class="secondary-button reset">${view==='all'?'필터 초기화':'전체 공고 보기'}</button></div>`;
}
function toggleSave(id){saved.has(id)?saved.delete(id):saved.add(id);write('saved',[...saved]);render();if(currentId===id&&$('#detailDialog').open){const b=$('#detailSave');b.textContent=saved.has(id)?'★ 관심 공고 저장됨':'☆ 관심 공고 저장';b.setAttribute('aria-pressed',String(saved.has(id)));}toast(saved.has(id)?'관심 공고에 저장했습니다.':'관심 공고에서 해제했습니다.');}
function openDetail(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;currentId=id;
  const fields=[['분야',jobFields(j).map(f=>fieldNames[f]).join(' · ')||'미분류'],['관련성',j.relationType||'원문 확인'],['근무지',j.location],['고용형태 · 직급',j.employment+' / '+j.grade],['학력',j.education],['경력',j.experience],['공개 급여',j.salary],['게시일',fmt(j.posted)],['접수 시작',fmt(j.start)+(j.start?.length>10?' '+j.start.slice(11,16):'')],['마감',j.end?fmt(j.end)+(j.end.length>10?' '+j.end.slice(11,16):' · 시각 미표시'):'채용 시 마감'],['확인 기록',fmt(j.checked)+' · '+j.verification],['접수 상태',statusText(j)]];
  $('#detailContent').innerHTML=`<div class="detail-top"><div class="dialog-header"><div><p class="eyebrow">${esc(groupLabel(j))}</p><div class="detail-company">${esc(j.company)}</div><h2>${esc(j.title)}</h2></div><button class="icon-button close" aria-label="닫기">×</button></div><div class="tag-row">${j.licenses.map(l=>`<span class="license-tag ${l.name==='SRI'?'license-sri':l.name==='RI'?'license-ri':l.name==='방사선관리기술사'?'license-tech':''}">${esc(l.name)} ${esc(l.level)}</span>`).join('')}</div></div><div class="detail-body"><dl class="detail-grid">${fields.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><h3>담당업무 · 분야 관련성</h3><p>${esc(j.duties)}</p><h3>필수·우대 조건</h3><p>${esc(j.qualifications)}</p>${j.detail.length?`<h3>세부 모집분야</h3><ul>${j.detail.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${j.notes?`<div class="${hasConcern(j)?'warning-box':'info-box'}"><strong>${hasConcern(j)?'지원 전에 확인하세요':'확인 메모'}</strong><p>${esc(j.notes)}</p></div>`:''}<div class="tracking-box"><label for="jobStage">나의 지원 상태</label><select id="jobStage"><option value="">아직 정하지 않았어요</option><option>지원 예정</option><option>지원 완료</option><option>전형 진행</option><option>관심 없음</option></select><label for="jobNote">나만의 메모</label><textarea id="jobNote" rows="3" maxlength="5000" placeholder="지원할 이유, 준비할 서류, 확인할 질문을 적어보세요."></textarea><small>상태·메모는 자동으로 이 브라우저에 저장됩니다. 다른 기기와 동기화되지 않습니다.</small></div></div><div class="detail-bottom"><button class="secondary-button" id="detailSave" aria-pressed="${saved.has(id)}">${saved.has(id)?'★ 관심 공고 저장됨':'☆ 관심 공고 저장'}</button><div>${j.links.map((l,i)=>`<a class="${i===0?'primary-button':'secondary-button'}" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join(' ')}</div></div>`;
  const reviewing=document.createElement('option');reviewing.value='검토 중';reviewing.textContent='검토 중';$('#jobStage').insertBefore(reviewing,$('#jobStage').options[1]);
  $('#jobStage').value=tracking[id]?.stage||'';$('#jobNote').value=tracking[id]?.note||'';
  $('#detailSave').onclick=()=>toggleSave(id);
  const saveTrack=()=>{tracking[id]={stage:$('#jobStage').value,note:$('#jobNote').value};write('tracking',tracking);render();};
  $('#jobStage').addEventListener('change',()=>{saveTrack();toast('지원 상태를 저장했습니다.');});$('#jobNote').addEventListener('input',saveTrack);
  if(!$('#detailDialog').open)$('#detailDialog').showModal();
}
function setView(v){view=v;if(workspaceViews[v]||v==='faculty'){category='all';$('#fieldFilter').value='';$('#sourceFilter').value='';$('#search').value='';$('#license').value='';$('#requiredOnly').checked=false;$$('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category==='all'));}$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('#breadcrumb').textContent=workspaceViews[v]?.label||{all:'전체 공고',saved:'관심 공고',tracking:'지원 관리',faculty:'교수 채용'}[v];$('#sidebar').classList.remove('mobile-open');render();}
function reset(){category='all';$('#search').value='';$('#fieldFilter').value='';$('#region').value='';$('#license').value='';$('#requiredOnly').checked=false;$('#sourceFilter').value='';$('#salaryOnly').checked=false;$('#hideClosed').checked=true;$('#sort').value='latest';$$('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category==='all'));setView('all');}
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportCSV(){const cols=[['기관·회사','company'],['모집직무','title'],['분류','category'],['산업·직무 분야','fields'],['관련성','relationType'],['근무지','location'],['학력','education'],['경력','experience'],['고용형태','employment'],['직급','grade'],['급여','salary'],['게시일','posted'],['접수시작','start'],['마감','end'],['자격조건','qualifications'],['확인사항','notes'],['확인일','checked']];
  const cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  let rows=[cols.map(c=>c[0]).concat(['원문','지원 상태'])];for(const j of filtered())rows.push(cols.map(([,k])=>k==='category'?groupLabel(j):k==='fields'?jobFields(j).map(f=>fieldNames[f]).join(' / '):j[k]).concat([j.links.map(l=>l.url).join(' | '),tracking[j.id]?.stage||'']));
  download('fluence-jobs-'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('현재 검색 결과를 CSV로 내보냈습니다.');
}
function normalize(j){
  if(!j||typeof j!=='object'||typeof j.company!=='string'||!j.company.trim()||typeof j.title!=='string'||!j.title.trim())throw new Error('회사명과 직무명이 있는 공고만 가져올 수 있습니다.');
  const texts=['company','title','location','education','experience','employment','salary','duties','qualifications','notes','grade','checked','verification','relationType','organisationType'];const out={id:typeof j.id==='string'?j.id.slice(0,200):'import-'+crypto.randomUUID(),category:j.category==='public'?'public':'private',fields:Array.isArray(j.fields)?j.fields.filter(f=>Object.hasOwn(fieldNames,f)):[],status:'check',regions:Array.isArray(j.regions)?j.regions.filter(x=>typeof x==='string').slice(0,20):['미확인'],licenses:Array.isArray(j.licenses)?j.licenses.filter(x=>x&&typeof x.name==='string'&&typeof x.level==='string').map(x=>({name:x.name.slice(0,60),level:x.level.slice(0,60)})):[],detail:Array.isArray(j.detail)?j.detail.filter(x=>typeof x==='string').slice(0,100):[],links:Array.isArray(j.links)?j.links.filter(x=>x&&safeUrl(x.url)!=='#').map(x=>({label:String(x.label||'원문').slice(0,100),url:safeUrl(x.url)})):[]};
  for(const k of texts)out[k]=typeof j[k]==='string'?j[k].slice(0,10000):'미공개';
  for(const k of ['posted','start','end'])out[k]=typeof j[k]==='string'&&/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(j[k])&&Number.isFinite(Date.parse(j[k]))?j[k]:null;
  if(out.organisationType==='미공개')delete out.organisationType;if(out.relationType==='미공개')out.relationType='원문에서 관련성 확인';
  out.verification='직접 가져온 데이터 · 원문 재확인';out.checked=j.checked||'미공개';return out;
}
function showSources(){ $('#sourcesList').innerHTML=base.sources.map(s=>`<div class="source-row"><div><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><small>${esc(s.note)}</small></div><span class="source-state ${s.state==='확인'?'':'limited'}">${esc(s.state)}</span></div>`).join('');$('#sourceDialog').showModal();}
async function init(){
  try{const response=await fetch('jobs.json',{cache:'no-store'});if(!response.ok)throw new Error('load');base=await response.json();rebuild();
    const regions=[...new Set(jobs.flatMap(j=>j.regions).filter(r=>r!=='전국'))].sort((a,b)=>a.localeCompare(b,'ko'));
    $('#region').innerHTML+=[...regions].map(r=>`<option>${esc(r)}</option>`).join('');render();
  }catch {$('#jobList').innerHTML='<div class="empty"><h3>공고를 불러오지 못했습니다</h3><p>잠시 후 페이지를 새로고침해 주세요.</p><button class="secondary-button" id="retry">다시 불러오기</button></div>';$('#retry').onclick=()=>location.reload();return;}
  $('#jobList').addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save){toggleSave(save.dataset.save);return;}const row=e.target.closest('[data-id]');if(row)openDetail(row.dataset.id);if(e.target.closest('.reset'))reset();});
  $$('.reset').forEach(b=>b.addEventListener('click',reset));$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;$$('[data-category]').forEach(x=>x.classList.toggle('active',x===b));render();});
  for(const id of ['fieldFilter','region','license','requiredOnly','hideClosed','sourceFilter','salaryOnly','sort'])$('#'+id).addEventListener('change',render);
  $$('[data-field]').forEach(b=>b.onclick=()=>{view='all';$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view==='all'));$('#breadcrumb').textContent='전체 공고';$('#fieldFilter').value=b.dataset.field;render();});
  $$('[data-source]').forEach(b=>b.onclick=()=>{$('#sourceFilter').value=b.dataset.source;render();});
  $('#search').addEventListener('input',render);$$('[data-query]').forEach(b=>b.onclick=()=>{$('#search').value=b.dataset.query;render();});$$('[data-license]').forEach(b=>b.onclick=()=>{$('#license').value=b.dataset.license;render();});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus();}});
  document.addEventListener('click',e=>{const c=e.target.closest('.close');if(c)c.closest('dialog').close();});
  $$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
  $('.brand').onclick=e=>{e.preventDefault();reset();};$('#menuButton').onclick=()=>$('#sidebar').classList.toggle('mobile-open');$('#sourceOpen').onclick=showSources;
  $('#aboutOpen').onclick=()=>$('#aboutDialog').showModal();$('#addOpen').onclick=()=>$('#addDialog').showModal();$('#dataOpen').onclick=()=>$('#dataDialog').showModal();$('#csvExport').onclick=exportCSV;
  $('#addForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),v=k=>String(f.get(k)||'').trim();if(safeUrl(v('url'))==='#'){toast('http 또는 https 원문 주소를 입력해 주세요.');return;}
    const j=normalize({id:'custom-'+crypto.randomUUID(),company:v('company'),title:v('title'),category:v('category'),regions:[v('region')],location:v('location')||v('region'),education:v('education')||'미공개',experience:v('experience')||'미공개',employment:v('employment')||'미공개',salary:v('salary')||'미공개',posted:v('posted'),start:v('start'),end:v('end'),duties:v('duties')||'미공개',qualifications:'원문에서 확인해 주세요.',notes:'직접 추가한 공고입니다. 접수 상태와 조건을 원문에서 확인해 주세요.',links:[{label:'원문·지원',url:v('url')}],checked:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'})});
    extras.push(j);write('customJobs',extras);rebuild();e.target.reset();$('#addDialog').close();reset();toast('공고를 이 브라우저에 추가했습니다.');openDetail(j.id);
  });
  $('#jsonExport').onclick=()=>download('fluence-jobs.json',JSON.stringify({...base,jobs},null,2),'application/json;charset=utf-8');
  $('#jsonImport').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('5MB 이하 JSON 파일을 선택해 주세요.');const parsed=JSON.parse(await file.text()),arr=Array.isArray(parsed)?parsed:parsed.jobs;if(!Array.isArray(arr)||arr.length>2000)throw new Error('jobs 배열이 포함된 JSON 파일이어야 하며 최대 2,000건까지 가져올 수 있습니다.');const incoming=arr.map(normalize);const map=new Map(extras.map(j=>[j.id,j]));incoming.forEach(j=>map.set(j.id,j));extras=[...map.values()];write('customJobs',extras);rebuild();render();$('#importMessage').textContent=incoming.length+'건을 가져왔습니다. 가져온 공고는 원문 확인 필요로 표시됩니다.';toast('공고 데이터를 가져왔습니다.');}catch(err){$('#importMessage').textContent=err.message||'파일을 가져오지 못했습니다.';}e.target.value='';};
}
init();
