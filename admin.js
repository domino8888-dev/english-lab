let userList=[];
const tableLabels={lessons:'Уроки',words:'Слова',exercises:'Упражнения',profiles:'Пользователи'};
function adminView() {
  if(!state.canEdit)return empty('Недостаточно прав.');
  const tabs=['lessons','words','exercises',...(state.isAdmin?['profiles']:[])];
  const tab=state.adminTab;
  let content;
  if(tab==='profiles'){
    content=`<article class="card"><h3>Роли пользователей</h3><p class="muted">Своя роль не меняется через интерфейс.</p><div class="admin-list">${userList.map(p=>`<div class="admin-row"><div><strong>${h(p.name)}</strong><p class="muted">${h(p.email)} · ${h(roles[p.role])}</p></div>${p.id===sessionUser.id?'<span class="tag">Ваш аккаунт</span>':`<select data-role-user="${h(p.id)}" aria-label="Роль ${h(p.name)}">${Object.entries(roles).map(([k,v])=>`<option value="${k}" ${p.role===k?'selected':''}>${v}</option>`).join('')}</select>${btn('Сохранить роль','role',p.id)}`}</div>`).join('')||empty('Нет пользователей.')}</div></article>`;
  }else{
    content=`<div class="actions">${btn('Добавить запись','admin-new','','primary')}</div>${state.adminEdit?editorForm(tab,state.adminEdit):''}<article class="card admin-list">${state[tab].map(r=>`<div class="admin-row"><div><strong>${h(r.title||r.word||r.prompt)}</strong><p class="muted">${h(r.level_id||state.lessons.find(l=>l.id===r.lesson_id)?.title||'')}</p></div><div class="actions">${btn('Изменить','admin-edit',r.id)}${btn('Удалить','admin-delete',r.id,'danger')}</div></div>`).join('')||empty('Записей пока нет.')}</article>`;
  }
  return `<h1>Управление</h1><p class="muted">Роль: ${h(roles[state.profile.role])}</p><div class="filters">${tabs.map(t=>btn(tableLabels[t],'admin-tab',t,'chip'+(tab===t?' active':''))).join('')}</div>${content}`;
}
function editorForm(tab,r) {
  const input=(name,label,value='',extra='')=>`<label>${label}<input name="${name}" value="${h(value)}" ${extra} required></label>`;
  const area=(name,label,value='')=>`<label>${label}<textarea name="${name}" required>${h(value)}</textarea></label>`;
  const levels=`<label>Уровень<select name="level_id">${state.levels.map(l=>`<option ${l.id===r.level_id?'selected':''}>${h(l.id)}</option>`).join('')}</select></label>`;
  let fields;
  if(tab==='lessons')fields=levels+input('title','Название',r.title)+input('summary','Краткое описание',r.summary)+area('body','Теория и примеры',r.body);
  if(tab==='words')fields=levels+input('word','Слово',r.word)+input('translation','Перевод',r.translation)+`<label>Транскрипция<input name="transcription" value="${h(r.transcription)}"></label>`+input('example','Пример',r.example);
  if(tab==='exercises')fields=`<label>Урок<select name="lesson_id" required>${state.lessons.map(l=>`<option value="${l.id}" ${l.id===r.lesson_id?'selected':''}>${h(l.level_id+' · '+l.title)}</option>`).join('')}</select></label><label>Тип<select name="kind"><option value="choice" ${r.kind==='choice'?'selected':''}>Выбор ответа</option><option value="text" ${r.kind==='text'?'selected':''}>Ввод ответа</option></select></label>`+input('prompt','Вопрос',r.prompt)+`<label>Варианты ответа (по одному на строку, для выбора)<textarea name="options">${h((r.options||[]).join('\n'))}</textarea></label>`+input('answer','Правильный ответ (точно как один из вариантов для выбора)',r.answer)+area('explanation','Объяснение',r.explanation);
  return `<form id="admin-form" class="card admin-form"><h3>${r.id?'Редактирование':'Новая запись'}</h3>${fields}<div class="actions"><button class="primary">Сохранить</button>${btn('Отмена','admin-cancel')}</div></form>`;
}
async function adminTab(tab) {if(tab==='profiles'){if(!state.isAdmin)return;userList=await db.all('profiles','email');}state.adminTab=tab;state.adminEdit=null;render();}
async function saveAdmin(form) {
  if(!state.canEdit)return;
  const table=state.adminTab, values=Object.fromEntries(new FormData(form));
  for(const k of Object.keys(values))values[k]=values[k].trim();
  if(table==='exercises'){
    values.lesson_id=Number(values.lesson_id);values.options=values.kind==='choice'?values.options.split('\n').map(s=>s.trim()).filter(Boolean):[];
    if(values.kind==='choice'&&(new Set(values.options).size!==values.options.length||values.options.length<2||!values.options.includes(values.answer)))throw new Error('Нужно минимум два разных варианта и правильный ответ среди них.');
  }
  const id=state.adminEdit.id;
  if(id)await db.update(table,id,values);else await db.add(table,values);
  await refreshData();state.adminEdit=null;render();notice('Материал сохранён.','good');
}
async function deleteAdmin(id) {if(!state.canEdit)return;if(!confirm('Удалить запись? Связанные упражнения и отметки могут быть удалены.'))return;await db.remove(state.adminTab,{id:Number(id)});await refreshData();state.adminEdit=null;render();notice('Запись удалена.','good');}
async function saveRole(id) {if(!state.isAdmin)return;const select=[...document.querySelectorAll('[data-role-user]')].find(x=>x.dataset.roleUser===id);if(!select)return;await db.run(client.rpc('set_user_role',{target_id:id,new_role:select.value}));await adminTab('profiles');notice('Роль обновлена.','good');}
