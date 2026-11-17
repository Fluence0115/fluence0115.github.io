'use strict';
const topicScopes={
 safety:{title:'방호·선량·시설관리·업무대행까지',words:['방사선안전','방사선방호','선량평가','차폐','RI','SRI','방사선관리기술사','동위원소 관리'],query:'방사선안전',description:'원전·의료·연구시설·산업체의 안전관리와 방호, 인허가·종사자 피폭관리 공고를 함께 확인합니다.'},
 nuclear_safety:{title:'원전 안전과 인허가·검증을 함께',words:['원자력','SMR','안전해석','PSA','인허가','규제','기기검증','CGID','품질보증','해체','방폐물'],query:'원자력',description:'회사 이름뿐 아니라 원자로 계통·안전해석, 규제 대응, 원전 품질검증과 해체·폐기물 관리의 실제 업무를 확인해 분류합니다.'},
 research:{title:'기업 연구소·대학 연구실·정출연까지',words:['연구원','R&D','박사후연구원','Postdoc','가속기','핵융합','동위원소','방사성의약품','의학물리','검출기','방사선 소재'],query:'방사선 연구원',description:'석·박사 우대 연구직과 학사 지원이 가능한 연구개발·시험평가도 포함합니다. 관련 분야가 확인된 기업·대학·연구기관 공고를 모읍니다.'},
 ic:{title:'계측·제어·검출기·원전 SW까지',words:['계측제어','I&C','제어계측','방사선 계측','검출기','원전 SW','V&V','임베디드','PLC','EPICS'],query:'원자력 계측제어',description:'원자력·방사선 분야의 하드웨어·펌웨어·제어 시스템, 소프트웨어 검증과 계측장비 관련 공고를 함께 확인합니다.'},
 radiographer:{title:'동네 의원부터 검진센터·종합병원까지',words:['방사선사','영상의학','일반촬영','X-ray','CT','MRI','C-arm','유방촬영','Mammo','핵의학','방사선치료'],query:'방사선사',description:'내과·정형외과·통증의학과·소아청소년과·영상의학과 등 의원과 지역 병원을 포함합니다. 정규직·계약직·오전 근무·파트타임·단기 아르바이트도 확인합니다.'},
 sonographer:{title:'초음파 검사·소노그래퍼·임상지원까지',words:['초음파','초음파사','소노그래퍼','소노그레퍼','심초음파','심장초음파','혈관','복부','유방','산모초음파','sonographer','ultrasound'],query:'초음파',description:'지역 내과·산부인과·의원·검진센터와 병원의 검사 실무, 의료기기 임상지원·임상 QA 및 검사 보조를 구분해 표시합니다. 산업용 세척·용접·비파괴검사는 이 탭에서 제외합니다.'},
 faculty:{title:'학과명과 세부 초빙전공으로 교차 확인',words:['방사선학과','원자력공학','원자력시스템','방사선의과학','의학물리','전임교원','교수 초빙','연구교수','강의전담'],query:'방사선 교수',description:'하이브레인넷·학술단체·대학 공고의 초빙분야를 확인합니다. 단순히 관련 학과가 있는 대학의 통합 공채라는 이유로 포함하지 않습니다.'}
};
function renderTopicScope(){
 const topic=$('#fieldFilter').value||(view==='research'?'research':''),s=topicScopes[topic],panel=$('#topicScope');panel.hidden=!s;if(!s)return;
 panel.innerHTML=`<div class="topic-scope-heading"><strong>${esc(s.title)}</strong><span>확장 검색 기준</span></div><p>${esc(s.description)}</p><div class="scope-keywords">${s.words.map(w=>`<span>${esc(w)}</span>`).join('')}</div><div class="scope-links"><span>추가 원문 검색</span><a href="https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(s.query)}" target="_blank" rel="noopener noreferrer">사람인 ↗</a><a href="https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(s.query)}" target="_blank" rel="noopener noreferrer">잡코리아 ↗</a><a href="https://job.incruit.com/jobdb_list/searchjob.asp?col=job_all&kw=${encodeURIComponent(s.query)}" target="_blank" rel="noopener noreferrer">인크루트 ↗</a><small>이 사이트의 숫자는 확인해 수록한 공고 수이며, 각 플랫폼의 전체 검색 건수와 다릅니다.</small></div>`;
}
