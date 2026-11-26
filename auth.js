let client, db, sessionUser = null, signup = false;
function explain(error) {
  const code=error?.code, msg=error?.message||String(error);
  const map={invalid_credentials:'Неверная почта или пароль.',email_not_confirmed:'Подтвердите электронную почту.',email_exists:'Аккаунт уже существует.',user_already_exists:'Аккаунт уже существует.',over_email_send_rate_limit:'Превышен лимит отправки писем. Попробуйте позже.',weak_password:'Пароль слишком короткий или простой.', '42501':'Недостаточно прав для этого действия.', '23505':'Такая запись уже существует.', '23503':'Запись связана с другими данными.'};
  if(map[code])return map[code];
  if(/invalid login credentials/i.test(msg))return map.invalid_credentials;
  if(/email rate limit/i.test(msg))return map.over_email_send_rate_limit;
  if(/fetch|network/i.test(msg))return 'Не удалось подключиться к серверу. Проверьте интернет.';
  return 'Ошибка: '+msg;
}
function screen(id) {for(const name of ['loading','auth','app'])$(name).hidden=name!==id;}
function authMessage(text,type=''){$('auth-message').textContent=text;$('auth-message').className='notice '+type;}
function authMode(value) {
  signup=value; $('name-label').hidden=!signup; $('auth-name').required=signup;
  $('auth-title').textContent=signup?'Создать аккаунт':'Вход в аккаунт';
  $('auth-subtitle').textContent=signup?'Начните изучение английского.':'Продолжите изучение английского.';
  $('auth-submit').textContent=signup?'Зарегистрироваться':'Войти';
  $('auth-switch').textContent=signup?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться';
  $('auth-password').autocomplete=signup?'new-password':'current-password'; authMessage('');
}
async function enter(user) {
  screen('loading'); state.reset(); sessionUser=user;
  try {Object.assign(state,await db.load(user.id)); state.level=state.goal.preferred_level;state.practiceLevel=state.level;render();notice('');screen('app');}
  catch(error){sessionUser=null;state.reset();screen('auth');authMessage(explain(error),'bad');}
}
async function initAuth() {
  $('auth-switch').addEventListener('click',()=>authMode(!signup));
  $('auth-form').addEventListener('submit',async e=>{
    e.preventDefault(); if(!client){authMessage('Подключите Supabase по инструкции README.','bad');return;}
    const email=$('auth-email').value.trim(), password=$('auth-password').value, name=$('auth-name').value.trim();
    if(signup&&!name){authMessage('Введите имя.','bad');return;}
    $('auth-submit').disabled=true;authMessage('Подключение...');
    try {
      const {data,error}=signup?await client.auth.signUp({email,password,options:{data:{name}}}):await client.auth.signInWithPassword({email,password});
      if(error)throw error; $('auth-password').value='';
      if(data.session)await enter(data.session.user);else {authMode(false);authMessage('Проверьте почту и подтвердите регистрацию.','good');}
    } catch(error){authMessage(explain(error),'bad');}finally{$('auth-submit').disabled=false;}
  });
  if(!window.supabase||SUPABASE_URL.includes('YOUR_PROJECT')||SUPABASE_KEY.includes('YOUR_')){screen('auth');authMessage('Подключите базу данных по инструкции README.');return;}
  try {
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);db=new Database(client);
    const {data,error}=await client.auth.getSession();if(error)throw error;
    if(data.session)await enter(data.session.user);else screen('auth');
    client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'&&!session){sessionUser=null;state.reset();authMode(false);$('auth-password').value='';screen('auth');}});
  }catch(error){screen('auth');authMessage(explain(error),'bad');}
}
async function logout() {const {error}=await client.auth.signOut();if(error)throw error;sessionUser=null;state.reset();authMode(false);$('auth-password').value='';screen('auth');}
