"use strict";function tryFusing(){var e=personaLists.map(function(e){return e.value}),t=_slicedToArray(e,3),a=t[0],r=t[1],n=t[2];if(!a||!r)return null;var o=p4gData.getSpecialFusionResult(p4gData.getPersonaByName(a),p4gData.getPersonaByName(r),p4gData.getPersonaByName(n));return o?o:(o=n?p4gData.getTripleFusionResult(p4gData.getPersonaByName(a),p4gData.getPersonaByName(r),p4gData.getPersonaByName(n)):p4gData.getDoubleFusionResult(p4gData.getPersonaByName(a),p4gData.getPersonaByName(r)),o||{name:"Not a valid combination"})}for(var _slicedToArray=(function(){function e(e,t){var a=[],r=!0,n=!1,o=void 0;try{for(var i,s=e[Symbol.iterator]();!(r=(i=s.next()).done)&&(a.push(i.value),!t||a.length!==t);r=!0);}catch(u){n=!0,o=u}finally{try{!r&&s["return"]&&s["return"]()}finally{if(n)throw o}}return a}return function(t,a){if(Array.isArray(t))return t;if(Symbol.iterator in Object(t))return e(t,a);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}()),p4gData=parent.p4gData,guiUtils=parent.guiUtils,personaLists=void 0,i=1;3>=i;i++){var infoWrapper=document.getElementById("personaInfo"+i);guiUtils.populatePersonaList(infoWrapper,function(){var e=tryFusing();guiUtils.displayPersona(document.querySelector("#resultPersonaInfo .personaDetails"),e)})}personaLists=Array.from(document.getElementsByClassName("personaSelect")),parent.guiUtils.initPersonaInfoView(document.getElementById("resultPersonaInfo"));