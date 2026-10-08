// Popula o banco com dados de exemplo, só se ainda estiver vazio.
// Rode com: npm run seed
const bcrypt = require('bcryptjs');
const { db } = require('./index');

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

if (userCount === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  insertUser.run('Regina Pereira da Silva', 'regina@mchfs.org', hash('mudar123'), 'admin');
  insertUser.run('Mentee de teste', 'mentee@mchfs.org', hash('mudar123'), 'mentee');
  console.log('Utilizadores de exemplo criados:');
  console.log('  admin  -> regina@mchfs.org / mudar123');
  console.log('  mentee -> mentee@mchfs.org / mudar123');
  console.log('IMPORTANTE: troque estas senhas antes de usar com dados reais.');
} else {
  console.log('Já existem utilizadores — nada foi alterado.');
}

const moduleCount = db.prepare('SELECT COUNT(*) AS n FROM modules').get().n;

if (moduleCount === 0) {
  const insertModule = db.prepare(`
    INSERT INTO modules
      (order_index, title_en, title_pt, description_en, description_pt, content_en, content_pt, youtube_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertModule.run(
    1,
    'Introduction',
    'Introdução',
    'An overview of the Baby-Friendly Standards and how this mentoring programme is organised.',
    'Uma visão geral dos Baby-Friendly Standards e de como este programa de mentoria está organizado.',
    'Welcome to the programme. This first module sets expectations for the fifteen months ahead.',
    'Bem-vinda ao programa. Este primeiro módulo define o que esperar dos próximos quinze meses.',
    ''
  );
  insertModule.run(
    2,
    'Module 1',
    'Módulo 1',
    'Foundations of respectful, person-centred maternal care.',
    'Fundamentos dos cuidados maternos respeitosos e centrados na pessoa.',
    'Placeholder content — replace with the real module text.',
    'Conteúdo de exemplo — substituir pelo texto real do módulo.',
    ''
  );
  console.log('Módulos de exemplo criados.');
} else {
  console.log('Já existem módulos — nada foi alterado.');
}
