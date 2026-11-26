const $ = id => document.getElementById(id);
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roles = {student:'Ученик',methodist:'Методист',admin:'Администратор'};
const state = new LearningState();
const btn = (label,action,value='',style='secondary') => `<button type="button" class="${style}" data-action="${action}" data-value="${h(value)}">${h(label)}</button>`;
const progressBar = (n,total) => `<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${total?Math.min(100,Math.round(n/total*100)):0}"><div class="progress-fill" style="width:${total?Math.min(100,n/total*100):0}%"></div></div>`;
const empty = text => `<p class="empty">${h(text)}</p>`;
const dateText = date => new Date(date).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'});
function notice(text,type='') { $('message').textContent=text; $('message').className='notice '+type; }
function levelChips(selected,action,all=false) {
  return [...(all?[{id:'all',title:'Все'}]:[]),...state.levels].map(l=>btn(l.id==='all'?'Все':l.id,action,l.id,'chip'+(selected===l.id?' active':''))).join('');
}
function stats() {
  return `<div class="grid"><article class="card"><p class="muted">Пройдено уроков</p><p class="stat">${state.completed.length} / ${state.lessons.length}</p></article><article class="card"><p class="muted">Изучено слов</p><p class="stat">${state.learned.length} / ${state.words.length}</p></article><article class="card"><p class="muted">Средний результат тестов</p><p class="stat">${state.results.length?state.average+'%':'—'}</p></article></div>`;
}
function dailyGoal() {return `<article class="card"><h3>Цель на сегодня</h3><p class="muted">Новые изученные слова и завершённые уроки</p>${progressBar(state.todayCount,state.goal.daily_target)}<p><strong>${state.todayCount} / ${state.goal.daily_target}</strong> действий ${state.todayCount>=state.goal.daily_target?' · Цель достигнута!':''}</p>${btn('Изменить цель','page','progress')}</article>`;}
function homeView() {
  return `<section class="hero"><p class="eyebrow">ТВОЁ ПРОСТРАНСТВО ДЛЯ ОБУЧЕНИЯ</p><h1>English starts here.</h1><p>Привет, ${h(state.profile.name)}! Учись в своём темпе каждый день.</p>${btn('Продолжить обучение','open-level',state.goal.preferred_level,'primary')}<span class="letters" aria-hidden="true">Aa</span></section><div class="heading"><h2>Уровни обучения</h2></div><div class="grid four">${state.levels.map(l=>`<button class="card card-button" data-action="open-level" data-value="${h(l.id)}"><p class="level">${h(l.id)}</p><h3>${h(l.title)}</h3><p class="muted">${h(l.description)}</p><small>${state.lessons.filter(x=>x.level_id===l.id).length} урока(ов)</small></button>`).join('')}</div><div class="heading"><h2>Мой прогресс</h2></div>${stats()}<div class="heading"><h2>Ежедневное обучение</h2></div>${dailyGoal()}`;
}
function lessonsView() {
  const list=state.lessons.filter(l=>l.level_id===state.level);
  return `<h1>Уроки</h1><p class="muted">Выберите уровень и тему для изучения.</p><div class="filters">${levelChips(state.level,'lesson-level')}</div><div class="grid two">${list.map(l=>`<article class="card"><span class="tag ${state.completedIds.has(l.id)?'done':''}">${state.completedIds.has(l.id)?'Пройден':h(l.level_id)}</span><h3>${h(l.title)}</h3><p class="muted">${h(l.summary)}</p>${btn('Открыть урок','lesson',l.id,'primary')}</article>`).join('')||empty('Пока нет уроков этого уровня.')}</div>`;
}
function lessonView() {
  const l=state.lessons.find(x=>x.id===state.lessonId); if(!l)return empty('Урок не найден.');
  const done=state.completedIds.has(l.id);
  return `<div class="actions">${btn('Назад к урокам','page','lessons')}</div><article class="card reading"><span class="tag">${h(l.level_id)}</span><h1>${h(l.title)}</h1><p class="muted">${h(l.summary)}</p><div class="lesson-text">${h(l.body)}</div><div class="actions">${done?'<span class="tag done">Урок пройден</span>':btn('Отметить пройденным','complete',l.id,'primary')}${btn('Упражнения по теме','practice-lesson',l.id)}</div></article>`;
}
function wordsView() {
  return `<h1>Словарь</h1><p class="muted">Нажмите на карточку, чтобы увидеть перевод.</p><div class="filters">${levelChips(state.wordLevel,'word-level',true)}</div><div class="filters"><input id="word-search" placeholder="Поиск слова или перевода" aria-label="Поиск слова" value="${h(state.wordQuery)}"><select id="word-filter" aria-label="Статус слов"><option value="all">Все слова</option><option value="new" ${state.wordFilter==='new'?'selected':''}>Не изучены</option><option value="learned" ${state.wordFilter==='learned'?'selected':''}>Изучены</option></select></div><div id="word-cards" class="grid three"></div>`;
}
function renderWords() {
  const target=$('word-cards'); if(!target)return;
  const ids=state.learnedIds,q=state.wordQuery.toLowerCase().trim();
  const words=state.words.filter(w=>(state.wordLevel==='all'||w.level_id===state.wordLevel)&&(!q||`${w.word} ${w.translation}`.toLowerCase().includes(q))&&(state.wordFilter==='all'||(state.wordFilter==='learned'?ids.has(w.id):!ids.has(w.id))));
  target.innerHTML=words.map(w=>`<article class="card"><span class="tag ${ids.has(w.id)?'done':''}">${ids.has(w.id)?'Изучено':h(w.level_id)}</span><button class="flash" data-action="flip" data-value="${w.id}"><strong>${h(state.flipped.has(w.id)?w.translation:w.word)}</strong><small>${h(state.flipped.has(w.id)?w.example:w.transcription||'Нажмите для перевода')}</small></button><div class="actions">${btn('Озвучить','speak',w.id)}${btn(ids.has(w.id)?'Отменить отметку':'Запомнил(а)','learn',w.id,ids.has(w.id)?'secondary':'primary')}</div></article>`).join('')||empty('Слова не найдены.');
}
function practiceView() {
  const q=state.quiz;
  if(!q) {
    const lessons=state.lessons.filter(l=>l.level_id===state.practiceLevel);
    const count=state.exercises.filter(x=>lessons.some(l=>l.id===x.lesson_id)&&(state.practiceLesson==='all'||x.lesson_id===Number(state.practiceLesson))).length;
    return `<h1>Практика</h1><p class="muted">Проверьте знания: выбор ответа и заполнение пропусков.</p><div class="filters">${levelChips(state.practiceLevel,'practice-level')}</div><article class="card quiz"><h2>Настройте тест</h2><label>Тема<select id="practice-lesson"><option value="all">Все темы уровня</option>${lessons.map(l=>`<option value="${l.id}" ${String(l.id)===String(state.practiceLesson)?'selected':''}>${h(l.title)}</option>`).join('')}</select></label><p>Вопросов: ${count}</p><button type="button" class="primary" data-action="start-quiz" ${count===0?'disabled':''}>Начать тест</button></article>`;
  }
  if(q.finished)return `<h1>Результат теста</h1><article class="card quiz"><p class="eyebrow">ТЕСТ ЗАВЕРШЁН</p><p class="stat">${q.score} / ${q.questions.length}</p>${progressBar(q.score,q.questions.length)}<p>Правильных ответов: ${Math.round(q.score/q.questions.length*100)}%</p><p>${q.saved?'Результат сохранён в вашем профиле.':'Результат ещё не сохранён.'}</p><div class="actions">${!q.saved?btn('Сохранить результат','save-result','','primary'):''}${btn('Новый тест','reset-quiz')}${btn('Мой прогресс','page','progress')}</div></article>`;
  const x=q.current,r=q.response;
  let input=x.kind==='choice'?x.options.map(v=>`<button type="button" class="answer ${r?(v===x.answer?'correct':v===r.value?'wrong':''):''}" data-action="answer" data-value="${h(v)}" ${r?'disabled':''}>${h(v)}</button>`).join(''):`<form id="answer-form"><label>Ваш ответ<input name="answer" required autocomplete="off" value="${h(r?.value||'')}" ${r?'disabled':''}></label>${r?'':'<button class="primary">Проверить</button>'}</form>`;
  return `<div class="heading"><h1>Практика</h1>${btn('Прервать тест','reset-quiz')}</div><article class="card quiz"><p class="muted">Вопрос ${q.index+1} из ${q.questions.length}</p>${progressBar(q.index+1,q.questions.length)}<h2>${h(x.prompt)}</h2>${input}${r?`<div class="feedback ${r.correct?'good':'bad'}"><strong>${r.correct?'Правильно!':'Неправильно. Правильный ответ: '+h(x.answer)}</strong><p>${h(x.explanation)}</p></div>${btn(q.index+1===q.questions.length?'Завершить тест':'Следующий вопрос','next-question','','primary')}`:''}</article>`;
}
function progressView() {
  return `<h1>Мой прогресс</h1>${stats()}<div class="heading"><h2>Цели обучения</h2></div><div class="grid two">${dailyGoal()}<form id="goal-form" class="card"><h3>Настройки цели</h3><label>Действий в день<input type="number" name="target" min="1" max="50" required value="${state.goal.daily_target}"></label><label>Мой уровень<select name="level">${state.levels.map(l=>`<option value="${h(l.id)}" ${state.goal.preferred_level===l.id?'selected':''}>${h(l.id)} — ${h(l.title)}</option>`).join('')}</select></label><button class="primary">Сохранить цель</button></form></div><div class="heading"><h2>Уроки по уровням</h2></div><div class="grid four">${state.levels.map(l=>{const lessons=state.lessons.filter(x=>x.level_id===l.id),n=lessons.filter(x=>state.completedIds.has(x.id)).length;return `<article class="card"><h3>${h(l.id)}</h3>${progressBar(n,lessons.length)}<p>${n} / ${lessons.length}</p></article>`}).join('')}</div><div class="heading"><h2>История тестов</h2></div><article class="card table-wrap">${state.results.length?`<table><thead><tr><th>Дата</th><th>Уровень</th><th>Результат</th></tr></thead><tbody>${state.results.map(r=>`<tr><td>${h(dateText(r.created_at))}</td><td>${h(r.level_id)}</td><td>${r.correct} / ${r.total}</td></tr>`).join('')}</tbody></table>`:empty('Вы ещё не проходили тесты.')}</article>`;
}
function profileView() {return `<h1>Личный кабинет</h1><article class="card reading"><h2>${h(state.profile.name)}</h2><p>Электронная почта: ${h(state.profile.email)}</p><p>Роль: ${h(roles[state.profile.role])}</p><p>Уровень: ${h(state.goal.preferred_level)}</p><div class="actions">${btn('Мой прогресс','page','progress')}${btn('Выйти из аккаунта','logout','','danger')}</div></article>`;}
function render() {
  if(!state.profile)return;
  $('admin-nav').hidden=!state.canEdit;
  document.querySelectorAll('nav [data-page]').forEach(b=>{const active=b.dataset.page===state.page||(state.page==='lesson'&&b.dataset.page==='lessons');b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const views={home:homeView,lessons:lessonsView,lesson:lessonView,words:wordsView,practice:practiceView,progress:progressView,profile:profileView,admin:adminView};
  $('view').innerHTML=(views[state.page]||homeView)();
  if(state.page==='words')renderWords();
}
