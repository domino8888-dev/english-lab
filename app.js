let busy=false;
async function refreshData(){Object.assign(state,await db.load(sessionUser.id));}
function go(page){if(page==='admin'&&!state.canEdit)return;state.page=page;notice('');render();window.scrollTo(0,0);}
async function operation(fn,button){if(busy)return;busy=true;if(button)button.disabled=true;try{await fn();}catch(e){notice(explain(e),'bad');}finally{busy=false;if(button)button.disabled=false;}}
async function saveResult(){const q=state.quiz;if(!q?.finished||q.saved)return;const row=await db.add('test_results',{user_id:sessionUser.id,level_id:state.practiceLevel,correct:q.score,total:q.questions.length});state.results.unshift(row);q.saved=true;render();notice('Результат сохранён.','good');}
async function action(a,v) {
  switch(a){
    case 'page':go(v);break;
    case 'open-level':state.level=v;go('lessons');break;
    case 'lesson-level':state.level=v;render();break;
    case 'lesson':state.lessonId=Number(v);go('lesson');break;
    case 'complete':if(!state.completedIds.has(Number(v))){const row=await db.save('lesson_progress',{user_id:sessionUser.id,lesson_id:Number(v)},'user_id,lesson_id');state.completed.push(row);render();notice('Урок отмечен как пройденный.','good');}break;
    case 'word-level':state.wordLevel=v;render();break;
    case 'flip':{const id=Number(v);state.flipped.has(id)?state.flipped.delete(id):state.flipped.add(id);renderWords();break;}
    case 'speak':{const word=state.words.find(w=>w.id===Number(v));if(!word)return;if(!('speechSynthesis'in window)){notice('Браузер не поддерживает озвучивание.','bad');return;}const utterance=new SpeechSynthesisUtterance(word.word);utterance.lang='en-US';utterance.onerror=()=>notice('Не удалось озвучить слово.','bad');speechSynthesis.cancel();speechSynthesis.speak(utterance);break;}
    case 'learn':{const id=Number(v);if(state.learnedIds.has(id)){await db.remove('learned_words',{user_id:sessionUser.id,word_id:id});state.learned=state.learned.filter(w=>w.word_id!==id);}else{state.learned.push(await db.save('learned_words',{user_id:sessionUser.id,word_id:id},'user_id,word_id'));}renderWords();notice('Прогресс сохранён.','good');break;}
    case 'practice-level':state.practiceLevel=v;state.practiceLesson='all';render();break;
    case 'practice-lesson':{const l=state.lessons.find(x=>x.id===Number(v));if(!l)return;state.practiceLevel=l.level_id;state.practiceLesson=String(l.id);state.quiz=null;go('practice');break;}
    case 'start-quiz':{const ids=state.lessons.filter(l=>l.level_id===state.practiceLevel&&(state.practiceLesson==='all'||l.id===Number(state.practiceLesson))).map(l=>l.id);const qs=state.exercises.filter(x=>ids.includes(x.lesson_id));if(qs.length)state.quiz=new Quiz(qs);render();break;}
    case 'answer':state.quiz.answer(v);render();break;
    case 'next-question':state.quiz.next();render();if(state.quiz.finished)await saveResult();break;
    case 'save-result':await saveResult();break;
    case 'reset-quiz':state.quiz=null;notice('');render();break;
    case 'logout':await logout();break;
    case 'admin-tab':await adminTab(v);break;
    case 'admin-new':state.adminEdit={};render();break;
    case 'admin-edit':state.adminEdit=state[state.adminTab].find(x=>x.id===Number(v));render();break;
    case 'admin-cancel':state.adminEdit=null;render();break;
    case 'admin-delete':await deleteAdmin(v);break;
    case 'role':await saveRole(v);break;
  }
}
$('app').addEventListener('click',e=>{const b=e.target.closest('button[data-action],button[data-page]');if(!b||!sessionUser)return;operation(()=>action(b.dataset.action||'page',b.dataset.value??b.dataset.page),b);});
$('app').addEventListener('input',e=>{if(e.target.id==='word-search'){state.wordQuery=e.target.value;renderWords();}});
$('app').addEventListener('change',e=>{if(e.target.id==='word-filter'){state.wordFilter=e.target.value;renderWords();}if(e.target.id==='practice-lesson'){state.practiceLesson=e.target.value;render();}});
$('app').addEventListener('submit',e=>{e.preventDefault();if(!sessionUser)return;const form=e.target;operation(async()=>{
  if(form.id==='answer-form'){state.quiz.answer(new FormData(form).get('answer'));render();}
  if(form.id==='goal-form'){const f=new FormData(form);state.goal=await db.save('goals',{user_id:sessionUser.id,daily_target:Number(f.get('target')),preferred_level:f.get('level')},'user_id');render();notice('Цель сохранена.','good');}
  if(form.id==='admin-form')await saveAdmin(form);
},form.querySelector('button[type=submit],button:not([type])'));});
initAuth();
