function normalizeAnswer(value) {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase().replace(/[’]/g, "'");
}

class Exercise {
  constructor(row) { Object.assign(this, row); }
  check(value) { return normalizeAnswer(value) === normalizeAnswer(this.answer); }
}
class ChoiceExercise extends Exercise {
  check(value) { return this.options.includes(value) && super.check(value); }
}
class TextExercise extends Exercise {}

class Quiz {
  constructor(rows) {
    this.questions = rows.map(row => row.kind === 'choice' ? new ChoiceExercise(row) : new TextExercise(row));
    this.index = 0;
    this.answers = [];
    this.saved = false;
  }
  get current() { return this.questions[this.index]; }
  get finished() { return this.index >= this.questions.length; }
  get score() { return this.answers.filter(answer => answer.correct).length; }
  get response() { return this.answers[this.index]; }
  answer(value) {
    if (this.finished || this.response || !String(value).trim()) return;
    this.answers.push({ value, correct: this.current.check(value) });
  }
  next() { if (this.response) this.index++; }
}

class LearningState {
  constructor() { this.reset(); }
  reset() {
    Object.assign(this, { profile: null, levels: [], lessons: [], words: [], exercises: [], completed: [], learned: [], results: [], goal: { daily_target: 5, preferred_level: 'A1' }, page: 'home', level: 'A1', wordLevel: 'all', wordQuery: '', wordFilter: 'all', flipped: new Set(), quiz: null, lessonId: null, practiceLevel: 'A1', practiceLesson: 'all', adminTab: 'lessons', adminEdit: null });
  }
  get completedIds() { return new Set(this.completed.map(row => row.lesson_id)); }
  get learnedIds() { return new Set(this.learned.map(row => row.word_id)); }
  get todayCount() {
    const today = new Date().toDateString();
    return [...this.completed, ...this.learned].filter(row => new Date(row.completed_at || row.learned_at).toDateString() === today).length;
  }
  get canEdit() { return ['methodist', 'admin'].includes(this.profile?.role); }
  get isAdmin() { return this.profile?.role === 'admin'; }
  get average() { return this.results.length ? Math.round(this.results.reduce((sum,r) => sum + r.correct,0) / this.results.reduce((sum,r) => sum + r.total,0)*100) : 0; }
}

class Database {
  constructor(client) { this.client = client; }
  async run(query) {
    const {data,error} = await query;
    if (error) throw error;
    return data;
  }
  async all(table, order = 'id') {
    const rows = [];
    for (let start = 0; ; start += 500) {
      const batch = await this.run(this.client.from(table).select('*').order(order).range(start,start+499));
      rows.push(...batch);
      if (batch.length < 500) return rows;
    }
  }
  async load(userId) {
    const [profile,levels,lessons,words,exercises,completed,learned,results,goal] = await Promise.all([
      this.run(this.client.from('profiles').select('*').eq('id',userId).single()),
      this.all('levels','position'), this.all('lessons'), this.all('words'), this.all('exercises'),
      this.run(this.client.from('lesson_progress').select('*').eq('user_id',userId)),
      this.run(this.client.from('learned_words').select('*').eq('user_id',userId)),
      this.run(this.client.from('test_results').select('*').eq('user_id',userId).order('created_at',{ascending:false})),
      this.run(this.client.from('goals').select('*').eq('user_id',userId).maybeSingle())
    ]);
    return { profile,levels,lessons,words,exercises,completed,learned,results,goal:goal || {daily_target:5,preferred_level:'A1'} };
  }
  async save(table, row, conflict) { return this.run(this.client.from(table).upsert(row,{onConflict:conflict}).select().single()); }
  async add(table,row) { return this.run(this.client.from(table).insert(row).select().single()); }
  async update(table,id,row) { return this.run(this.client.from(table).update(row).eq('id',id).select().single()); }
  async remove(table,conditions) { let q=this.client.from(table).delete(); for(const [key,value] of Object.entries(conditions)) q=q.eq(key,value); return this.run(q); }
}
