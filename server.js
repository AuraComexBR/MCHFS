const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const { supabase } = require('./db/supabase');
const { translator } = require('./i18n');
const { requireLogin, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mchfs-prototype-secret-troque-isto';
const PDF_BUCKET = 'course-materials';

// ---------- view engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- static files (site institucional + assets) ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- body parsing / cookies ----------
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------- idioma (querystring > cookie > padrão) ----------
app.use((req, res, next) => {
  const queryLang = req.query.lang === 'pt' ? 'pt' : req.query.lang === 'en' ? 'en' : null;
  if (queryLang) {
    res.cookie('lang', queryLang, { maxAge: 1000 * 60 * 60 * 24 * 365 });
  }
  req.lang = queryLang || req.cookies.lang || 'en';
  req.t = translator(req.lang);
  next();
});

// ---------- autenticação via cookie assinado (sem estado no servidor) ----------
app.use((req, res, next) => {
  const token = req.cookies.session;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
});

// ---------- upload de PDF (memória -> Supabase Storage) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas ficheiros PDF são aceites.'));
    }
    cb(null, true);
  },
});

async function uploadPdf(file) {
  if (!file) return '';
  const objectPath = `${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(objectPath, file.buffer, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

// ---------- helpers ----------
function toEmbedUrl(youtubeUrl) {
  if (!youtubeUrl) return null;
  try {
    const url = new URL(youtubeUrl);
    let id = null;
    if (url.hostname.includes('youtu.be')) {
      id = url.pathname.slice(1);
    } else if (url.searchParams.get('v')) {
      id = url.searchParams.get('v');
    } else if (url.pathname.startsWith('/embed/')) {
      return youtubeUrl;
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

function moduleFieldsFromBody(body) {
  return {
    order_index: parseInt(body.order_index, 10) || 0,
    title_en: (body.title_en || '').trim(),
    title_pt: (body.title_pt || '').trim(),
    description_en: (body.description_en || '').trim(),
    description_pt: (body.description_pt || '').trim(),
    content_en: (body.content_en || '').trim(),
    content_pt: (body.content_pt || '').trim(),
    youtube_url: (body.youtube_url || '').trim(),
    published: !!body.published,
  };
}

const PASS_THRESHOLD = 80; // percentagem mínima para gerar certificado

function quizFieldsFromBody(body) {
  const correct = ['a', 'b', 'c', 'd'].includes(body.correct_option) ? body.correct_option : 'a';
  return {
    order_index: parseInt(body.order_index, 10) || 0,
    question_en: (body.question_en || '').trim(),
    question_pt: (body.question_pt || '').trim(),
    option_a_en: (body.option_a_en || '').trim(),
    option_a_pt: (body.option_a_pt || '').trim(),
    option_b_en: (body.option_b_en || '').trim(),
    option_b_pt: (body.option_b_pt || '').trim(),
    option_c_en: (body.option_c_en || '').trim(),
    option_c_pt: (body.option_c_pt || '').trim(),
    option_d_en: (body.option_d_en || '').trim(),
    option_d_pt: (body.option_d_pt || '').trim(),
    correct_option: correct,
  };
}

// ---------- rotas de autenticação ----------
app.get('/login', (req, res) => {
  if (req.user) return res.redirect(`/courses?lang=${req.lang}`);
  res.render('login', { lang: req.lang, t: req.t, error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', (email || '').trim().toLowerCase())
    .maybeSingle();

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.render('login', { lang: req.lang, t: req.t, error: req.t('login_error') });
  }

  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 });
  res.redirect(`/courses?lang=${req.lang}`);
});

app.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect(`/login?lang=${req.lang}`);
});

// ---------- área da mentoranda ----------
app.get('/courses', requireLogin, async (req, res) => {
  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('published', true)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });
  res.render('courses-list', { lang: req.lang, t: req.t, user: req.user, modules: modules || [] });
});

app.get('/courses/:id', requireLogin, async (req, res) => {
  const { data: module_ } = await supabase
    .from('modules')
    .select('*')
    .eq('id', req.params.id)
    .eq('published', true)
    .maybeSingle();

  if (!module_) return res.status(404).send('Módulo não encontrado.');

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('module_id', req.params.id)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });

  const { data: lastAttempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('module_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(1);

  res.render('course-detail', {
    lang: req.lang,
    t: req.t,
    user: req.user,
    module_,
    embedUrl: toEmbedUrl(module_.youtube_url),
    questions: questions || [],
    lastAttempt: (lastAttempts && lastAttempts[0]) || null,
    passThreshold: PASS_THRESHOLD,
  });
});

// ---------- checklist (quiz) do módulo ----------
app.post('/courses/:id/quiz', requireLogin, async (req, res) => {
  const { data: module_ } = await supabase
    .from('modules')
    .select('*')
    .eq('id', req.params.id)
    .eq('published', true)
    .maybeSingle();

  if (!module_) return res.status(404).send('Módulo não encontrado.');

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('module_id', req.params.id);

  if (!questions || questions.length === 0) {
    return res.redirect(`/courses/${req.params.id}?lang=${req.lang}`);
  }

  let score = 0;
  const answers = {};
  questions.forEach((q) => {
    const given = (req.body['q_' + q.id] || '').trim().toLowerCase();
    answers[q.id] = given || null;
    if (given && given === q.correct_option) score += 1;
  });

  const total = questions.length;
  const percentage = Math.round((score / total) * 1000) / 10;
  const passed = percentage >= PASS_THRESHOLD;
  const certificateCode = passed ? crypto.randomUUID() : null;

  await supabase.from('quiz_attempts').insert({
    user_id: req.user.id,
    module_id: module_.id,
    score,
    total,
    percentage,
    passed,
    answers,
    certificate_code: certificateCode,
  });

  res.redirect(`/courses/${req.params.id}?lang=${req.lang}`);
});

// ---------- certificado online ----------
app.get('/certificate/:moduleId', requireLogin, async (req, res) => {
  const { data: module_ } = await supabase
    .from('modules')
    .select('*')
    .eq('id', req.params.moduleId)
    .maybeSingle();

  if (!module_) return res.status(404).send('Módulo não encontrado.');

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('module_id', req.params.moduleId)
    .eq('passed', true)
    .order('created_at', { ascending: false })
    .limit(1);

  const attempt = (attempts && attempts[0]) || null;

  if (!attempt) {
    return res.render('certificate', {
      lang: req.lang, t: req.t, user: req.user, module_, attempt: null,
    });
  }

  res.render('certificate', { lang: req.lang, t: req.t, user: req.user, module_, attempt });
});

// ---------- verificação pública de certificado ----------
app.get('/certificate/verify/:code', async (req, res) => {
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('*, modules(title_en, title_pt), users(name)')
    .eq('certificate_code', req.params.code)
    .maybeSingle();

  res.render('certificate-verify', { lang: req.lang, t: req.t, attempt });
});

// ---------- painel da administradora ----------
app.get('/admin', requireLogin, requireAdmin, async (req, res) => {
  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });
  res.render('admin-dashboard', { lang: req.lang, t: req.t, user: req.user, modules: modules || [] });
});

app.get('/admin/modules/new', requireLogin, requireAdmin, async (req, res) => {
  const { data: rows } = await supabase
    .from('modules')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1);
  const maxOrder = rows && rows[0] ? rows[0].order_index : 0;
  res.render('admin-form', {
    lang: req.lang,
    t: req.t,
    user: req.user,
    module_: null,
    nextOrder: maxOrder + 1,
  });
});

app.get('/admin/modules/:id/edit', requireLogin, requireAdmin, async (req, res) => {
  const { data: module_ } = await supabase.from('modules').select('*').eq('id', req.params.id).maybeSingle();
  if (!module_) return res.status(404).send('Módulo não encontrado.');
  res.render('admin-form', { lang: req.lang, t: req.t, user: req.user, module_, nextOrder: null });
});

app.post('/admin/modules', requireLogin, requireAdmin, upload.single('pdf'), async (req, res) => {
  const f = moduleFieldsFromBody(req.body);
  let pdfUrl = '';
  try {
    pdfUrl = await uploadPdf(req.file);
  } catch (err) {
    return res.status(500).send('Erro ao enviar o PDF: ' + err.message);
  }

  await supabase.from('modules').insert({ ...f, pdf_filename: pdfUrl });
  res.redirect(`/admin?lang=${req.lang}`);
});

app.post('/admin/modules/:id', requireLogin, requireAdmin, upload.single('pdf'), async (req, res) => {
  const { data: existing } = await supabase.from('modules').select('*').eq('id', req.params.id).maybeSingle();
  if (!existing) return res.status(404).send('Módulo não encontrado.');

  const f = moduleFieldsFromBody(req.body);
  let pdfUrl = existing.pdf_filename;
  if (req.file) {
    try {
      pdfUrl = await uploadPdf(req.file);
    } catch (err) {
      return res.status(500).send('Erro ao enviar o PDF: ' + err.message);
    }
  }

  await supabase
    .from('modules')
    .update({ ...f, pdf_filename: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  res.redirect(`/admin?lang=${req.lang}`);
});

app.post('/admin/modules/:id/delete', requireLogin, requireAdmin, async (req, res) => {
  await supabase.from('modules').delete().eq('id', req.params.id);
  res.redirect(`/admin?lang=${req.lang}`);
});

// ---------- gestão da checklist (quiz) por módulo ----------
app.get('/admin/modules/:id/quiz', requireLogin, requireAdmin, async (req, res) => {
  const { data: module_ } = await supabase.from('modules').select('*').eq('id', req.params.id).maybeSingle();
  if (!module_) return res.status(404).send('Módulo não encontrado.');

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('module_id', req.params.id)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });

  res.render('admin-quiz-list', { lang: req.lang, t: req.t, user: req.user, module_, questions: questions || [] });
});

app.get('/admin/modules/:id/quiz/new', requireLogin, requireAdmin, async (req, res) => {
  const { data: module_ } = await supabase.from('modules').select('*').eq('id', req.params.id).maybeSingle();
  if (!module_) return res.status(404).send('Módulo não encontrado.');

  const { data: rows } = await supabase
    .from('quiz_questions')
    .select('order_index')
    .eq('module_id', req.params.id)
    .order('order_index', { ascending: false })
    .limit(1);
  const maxOrder = rows && rows[0] ? rows[0].order_index : 0;

  res.render('admin-quiz-form', {
    lang: req.lang, t: req.t, user: req.user, module_, question: null, nextOrder: maxOrder + 1,
  });
});

app.get('/admin/modules/:id/quiz/:qid/edit', requireLogin, requireAdmin, async (req, res) => {
  const { data: module_ } = await supabase.from('modules').select('*').eq('id', req.params.id).maybeSingle();
  if (!module_) return res.status(404).send('Módulo não encontrado.');

  const { data: question } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('id', req.params.qid)
    .eq('module_id', req.params.id)
    .maybeSingle();
  if (!question) return res.status(404).send('Pergunta não encontrada.');

  res.render('admin-quiz-form', { lang: req.lang, t: req.t, user: req.user, module_, question, nextOrder: null });
});

app.post('/admin/modules/:id/quiz', requireLogin, requireAdmin, async (req, res) => {
  const f = quizFieldsFromBody(req.body);
  await supabase.from('quiz_questions').insert({ ...f, module_id: req.params.id });
  res.redirect(`/admin/modules/${req.params.id}/quiz?lang=${req.lang}`);
});

app.post('/admin/modules/:id/quiz/:qid', requireLogin, requireAdmin, async (req, res) => {
  const f = quizFieldsFromBody(req.body);
  await supabase.from('quiz_questions').update(f).eq('id', req.params.qid).eq('module_id', req.params.id);
  res.redirect(`/admin/modules/${req.params.id}/quiz?lang=${req.lang}`);
});

app.post('/admin/modules/:id/quiz/:qid/delete', requireLogin, requireAdmin, async (req, res) => {
  await supabase.from('quiz_questions').delete().eq('id', req.params.qid).eq('module_id', req.params.id);
  res.redirect(`/admin/modules/${req.params.id}/quiz?lang=${req.lang}`);
});

// Em ambiente serverless (Vercel), o módulo exporta o app em vez de escutar uma porta.
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`MCHFS a correr em http://localhost:${PORT}`);
  });
}
