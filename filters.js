(function(root){
  'use strict';
  function matches(job,selected={},topics=job.topics||[]){
    const {fields=[],regions=[],licenses=[],requiredOnly=false,workspaceLicense=''}=selected;
    if(fields.length&&!fields.some(value=>topics.includes(value)))return false;
    if(regions.length&&!regions.some(value=>(job.regions||[]).includes(value)))return false;
    if(licenses.length&&!(job.licenses||[]).some(l=>licenses.includes(l.name)))return false;
    if(requiredOnly&&!(job.licenses||[]).some(l=>l.level.startsWith('필수')&&!/확인|불명/.test(l.level)&&(!licenses.length||licenses.includes(l.name))&&(!workspaceLicense||workspaceLicense===l.name)))return false;
    return true;
  }
  const api={matches};if(typeof module==='object')module.exports=api;else root.FluenceFilters=api;
})(typeof globalThis==='object'?globalThis:this);
