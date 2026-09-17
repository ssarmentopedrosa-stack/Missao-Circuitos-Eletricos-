import { ALL_QUESTIONS } from '../src/data/questions/index';
import { db, getTeacherDashboardOverview, getDbHealth } from '../server/persistenceEngine';
import {
  startQuestionAttempt,
  submitQuestionAttempt,
  getOrCreateSession,
  resetUserSession,
} from '../server/authoritativeEngine';

async function runProductionCertification() {
  console.log('================================================================');
  console.log('    AUDITORIA E CERTIFICAÇÃO E2E DE PRODUÇÃO REAL               ');
  console.log('    MISSÃO CIRCUITOS ELÉTRICOS 2.0                              ');
  console.log('================================================================\n');

  const results: Record<string, { pass: boolean; details: string }> = {};

  // -------------------------------------------------------------
  // TEST 1: DATABASE INTEGRITY & WAL MODE
  // -------------------------------------------------------------
  try {
    const integrity = db.prepare('PRAGMA integrity_check;').all() as Array<{ integrity_check: string }>;
    const journalMode = db.prepare('PRAGMA journal_mode;').get() as { journal_mode: string };
    const foreignKeys = db.prepare('PRAGMA foreign_keys;').get() as { foreign_keys: number };

    const isIntegrityOk = integrity.length === 1 && integrity[0].integrity_check === 'ok';
    const isWal = journalMode.journal_mode.toLowerCase() === 'wal';
    const isFk = foreignKeys.foreign_keys === 1;

    if (isIntegrityOk && isWal && isFk) {
      results['1_DB_INTEGRITY_WAL'] = {
        pass: true,
        details: `PRAGMA integrity_check: ok, journal_mode: ${journalMode.journal_mode}, foreign_keys: ${foreignKeys.foreign_keys}`,
      };
    } else {
      results['1_DB_INTEGRITY_WAL'] = {
        pass: false,
        details: `Integrity check failed: ${JSON.stringify(integrity)}, journal: ${journalMode.journal_mode}`,
      };
    }
  } catch (err: any) {
    results['1_DB_INTEGRITY_WAL'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 2: QUESTION REPOSITORY INTEGRITY (101 QUESTIONS)
  // -------------------------------------------------------------
  try {
    let totalQuestions = 0;
    const seenIds = new Set<string>();
    let invalidQuestions = 0;

    for (let s = 1; s <= 9; s++) {
      const list = ALL_QUESTIONS[s as 1|2|3|4|5|6|7|8|9] || [];
      totalQuestions += list.length;
      for (const q of list) {
        if (seenIds.has(q.id)) invalidQuestions++;
        seenIds.add(q.id);
        if (!q.options || q.options.length !== 5) invalidQuestions++;
        if (!['A', 'B', 'C', 'D', 'E'].includes(q.correctAnswer)) invalidQuestions++;
        if (!q.narrative || !q.title) invalidQuestions++;
      }
    }

    if (totalQuestions === 101 && invalidQuestions === 0) {
      results['2_QUESTION_CATALOG_101'] = {
        pass: true,
        details: `101 questões validadas com 5 alternativas (A-E), gabaritos válidos e IDs únicos.`,
      };
    } else {
      results['2_QUESTION_CATALOG_101'] = {
        pass: false,
        details: `Total: ${totalQuestions}, Inválidas/Duplicadas: ${invalidQuestions}`,
      };
    }
  } catch (err: any) {
    results['2_QUESTION_CATALOG_101'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 3: INFORMATION LEAK IN START ATTEMPT (CLIENT PROTECTION)
  // -------------------------------------------------------------
  try {
    const uidTest = 'test_leak_' + Date.now();
    const { questionPublic } = startQuestionAttempt('s1_q01', 1, uidTest);

    const hasCorrectAnswer = 'correctAnswer' in questionPublic;
    const hasSolution = 'solution' in questionPublic;
    const hasAnswerKey = 'answerKey' in questionPublic;
    const hasIsCorrect = 'isCorrect' in questionPublic;

    if (!hasCorrectAnswer && !hasSolution && !hasAnswerKey && !hasIsCorrect) {
      results['3_NO_CLIENT_LEAK'] = {
        pass: true,
        details: `Nenhum gabarito ou flag de acerto é transmitido ao cliente no início da tentativa.`,
      };
    } else {
      results['3_NO_CLIENT_LEAK'] = {
        pass: false,
        details: `Vazamento detectado: correctAnswer=${hasCorrectAnswer}, solution=${hasSolution}`,
      };
    }
  } catch (err: any) {
    results['3_NO_CLIENT_LEAK'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 4: E2E FUNCTIONAL LIFECYCLE (ANSWER CORRECT -> SCORE UP, LIVES PRESERVED)
  // -------------------------------------------------------------
  const uidA = 'aluno_alpha_' + Date.now();
  resetUserSession(uidA);

  try {
    const { attempt, questionPublic } = startQuestionAttempt('s1_q01', 1, uidA);
    const initialSession = getOrCreateSession(uidA);

    // Answer correctly (B is 6,0 A)
    const submitRes = submitQuestionAttempt({
      attemptId: attempt.attemptId,
      selectedOptionId: 'B',
      uid: uidA,
    });

    const updatedSession = getOrCreateSession(uidA);

    const isScoreUp = updatedSession.score > initialSession.score;
    const isLivesPreserved = updatedSession.lives === 5;
    const isCorrectMarked = submitRes.isCorrect === true;

    if (isScoreUp && isLivesPreserved && isCorrectMarked) {
      results['4_CORRECT_ANSWER_E2E'] = {
        pass: true,
        details: `Acerto validado: Vidas = ${updatedSession.lives}, Score = +${submitRes.scoreAwarded} pts.`,
      };
    } else {
      results['4_CORRECT_ANSWER_E2E'] = {
        pass: false,
        details: `Falha: scoreUp=${isScoreUp}, lives=${updatedSession.lives}, isCorrect=${isCorrectMarked}`,
      };
    }
  } catch (err: any) {
    results['4_CORRECT_ANSWER_E2E'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 5: WRONG ANSWER -> DEDUCT EXACTLY 1 LIFE
  // -------------------------------------------------------------
  try {
    const { attempt } = startQuestionAttempt('s1_q02', 1, uidA);
    const sessionBefore = getOrCreateSession(uidA);

    const submitRes = submitQuestionAttempt({
      attemptId: attempt.attemptId,
      selectedOptionId: 'A', // gabarito é C
      uid: uidA,
    });

    const sessionAfter = getOrCreateSession(uidA);

    const lifeDecremented = sessionBefore.lives - sessionAfter.lives === 1;
    const isCorrectFalse = submitRes.isCorrect === false;

    if (lifeDecremented && isCorrectFalse && sessionAfter.lives === 4) {
      results['5_WRONG_ANSWER_DEDUCTION'] = {
        pass: true,
        details: `Erro validado: Vidas reduzidas de ${sessionBefore.lives} para ${sessionAfter.lives}.`,
      };
    } else {
      results['5_WRONG_ANSWER_DEDUCTION'] = {
        pass: false,
        details: `Falha: vidasBefore=${sessionBefore.lives}, vidasAfter=${sessionAfter.lives}`,
      };
    }
  } catch (err: any) {
    results['5_WRONG_ANSWER_DEDUCTION'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 6: GAME OVER SYSTEM & ATTEMPT LOCKOUT
  // -------------------------------------------------------------
  try {
    // Force 4 more errors on uidA to reach 0 lives
    for (let i = 0; i < 4; i++) {
      const { attempt } = startQuestionAttempt('s1_q03', 1, uidA);
      submitQuestionAttempt({
        attemptId: attempt.attemptId,
        selectedOptionId: 'E', // Errado
        uid: uidA,
      });
    }

    const sessionZero = getOrCreateSession(uidA);
    const isZeroLives = sessionZero.lives === 0;
    const isGameOverStatus = sessionZero.status === 'GAME_OVER';

    let blocked = false;
    try {
      startQuestionAttempt('s1_q04', 1, uidA);
    } catch (e: any) {
      if (e.message.includes('Game Over') || e.message.includes('Vidas esgotadas')) {
        blocked = true;
      }
    }

    if (isZeroLives && isGameOverStatus && blocked) {
      results['6_GAME_OVER_LOCKOUT'] = {
        pass: true,
        details: `Game Over ativo no servidor: Vidas = 0, Status = GAME_OVER, novas tentativas bloqueadas.`,
      };
    } else {
      results['6_GAME_OVER_LOCKOUT'] = {
        pass: false,
        details: `Falha: lives=${sessionZero.lives}, status=${sessionZero.status}, blocked=${blocked}`,
      };
    }
  } catch (err: any) {
    results['6_GAME_OVER_LOCKOUT'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 7: GAME OVER RECOVERY & STATE RESTORATION
  // -------------------------------------------------------------
  try {
    const resetRes = resetUserSession(uidA);
    const sessionRestored = getOrCreateSession(uidA);

    const is5Lives = sessionRestored.lives === 5;
    const isActive = sessionRestored.status === 'ACTIVE';

    // Now start and answer question after reset
    const { attempt } = startQuestionAttempt('s1_q03', 1, uidA);
    const subRes = submitQuestionAttempt({
      attemptId: attempt.attemptId,
      selectedOptionId: 'A', // gabarito s1_q03
      uid: uidA,
    });

    if (is5Lives && isActive && subRes.isCorrect) {
      results['7_RECOVERY_POST_RESET'] = {
        pass: true,
        details: `Reset autoritativo bem-sucedido: 5 vidas restauradas, status ACTIVE, nova questão respondida.`,
      };
    } else {
      results['7_RECOVERY_POST_RESET'] = {
        pass: false,
        details: `Falha: lives=${sessionRestored.lives}, status=${sessionRestored.status}, isCorrect=${subRes.isCorrect}`,
      };
    }
  } catch (err: any) {
    results['7_RECOVERY_POST_RESET'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 8: IDOR & CROSS-USER ISOLATION (STUDENT A vs STUDENT B)
  // -------------------------------------------------------------
  const uidB = 'aluno_beta_' + Date.now();
  resetUserSession(uidB);

  try {
    // Student A starts an attempt
    const { attempt: attemptA } = startQuestionAttempt('s2_q01', 2, uidA);

    // Student B attempts to submit Student A's attempt
    let idorBlocked = false;
    try {
      submitQuestionAttempt({
        attemptId: attemptA.attemptId,
        selectedOptionId: 'A',
        uid: uidB, // malicious mismatch
      });
    } catch (err: any) {
      if (err.message.includes('outro usuário')) {
        idorBlocked = true;
      }
    }

    if (idorBlocked) {
      results['8_IDOR_PROTECTION'] = {
        pass: true,
        details: `Tentativa de acesso cruzado bloqueada pelo servidor com erro 'Tentativa pertence a outro usuário'.`,
      };
    } else {
      results['8_IDOR_PROTECTION'] = {
        pass: false,
        details: `IDOR não bloqueado: Aluno B conseguiu submeter tentativa do Aluno A!`,
      };
    }
  } catch (err: any) {
    results['8_IDOR_PROTECTION'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 9: CONCURRENCY & IDEMPOTENCY (DOUBLE-CLICK / RACE CONDITION)
  // -------------------------------------------------------------
  try {
    const { attempt } = startQuestionAttempt('s3_q01', 3, uidB);
    const reqId = 'req_idempotent_' + Date.now();

    const sessionBefore = getOrCreateSession(uidB);
    const livesBefore = sessionBefore.lives;

    // Send the exact same submission twice concurrently
    const [sub1, sub2] = await Promise.all([
      Promise.resolve().then(() =>
        submitQuestionAttempt({
          attemptId: attempt.attemptId,
          selectedOptionId: 'E', // Resposta errada
          uid: uidB,
          requestId: reqId,
        })
      ),
      Promise.resolve().then(() =>
        submitQuestionAttempt({
          attemptId: attempt.attemptId,
          selectedOptionId: 'E',
          uid: uidB,
          requestId: reqId,
        })
      ),
    ]);

    const sessionAfter = getOrCreateSession(uidB);

    // Exactly 1 life must be lost, not 2
    const livesLost = livesBefore - sessionAfter.lives;

    if (livesLost === 1 && sub1.attemptId === sub2.attemptId) {
      results['9_IDEMPOTENCY_RACE_SAFE'] = {
        pass: true,
        details: `Submissão concorrente idempotente: 1 vida deduzida em vez de 2 (${livesBefore} -> ${sessionAfter.lives}).`,
      };
    } else {
      results['9_IDEMPOTENCY_RACE_SAFE'] = {
        pass: false,
        details: `Falha de concorrência: livesLost=${livesLost} (esperado 1).`,
      };
    }
  } catch (err: any) {
    results['9_IDEMPOTENCY_RACE_SAFE'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 10: TEACHER OVERVIEW & PEDAGOGICAL METRICS
  // -------------------------------------------------------------
  try {
    const overview = getTeacherDashboardOverview();

    const hasClassSummary = Boolean(overview.classSummary && overview.classSummary.totalStudents >= 2);
    const hasSectorMetrics = overview.sectorMetrics.length === 9;
    const hasRecentEvents = Array.isArray(overview.recentEvents) && overview.recentEvents.length > 0;
    const dbModeOk = overview.classSummary.databaseMode === 'SQLite-WAL-ACID';

    if (hasClassSummary && hasSectorMetrics && hasRecentEvents && dbModeOk) {
      results['10_TEACHER_DASHBOARD_METRICS'] = {
        pass: true,
        details: `Dashboard Docente ativo: ${overview.classSummary.totalStudents} alunos, 9 setores auditados, integridade ${overview.classSummary.integrityCheck}.`,
      };
    } else {
      results['10_TEACHER_DASHBOARD_METRICS'] = {
        pass: false,
        details: `Falha no dashboard: classSummary=${hasClassSummary}, sectors=${hasSectorMetrics}`,
      };
    }
  } catch (err: any) {
    results['10_TEACHER_DASHBOARD_METRICS'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // TEST 11: HTTP API ENDPOINTS SIMULATION
  // -------------------------------------------------------------
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const healthData = await healthRes.json();

    // Teacher unauthorized test
    const teacherUnauthRes = await fetch('http://localhost:3000/api/teacher/overview');

    // Teacher authorized test
    const teacherAuthRes = await fetch('http://localhost:3000/api/teacher/overview', {
      headers: { Authorization: 'Bearer prof-ares-2026' },
    });
    const teacherData = await teacherAuthRes.json();

    // Admin forbidden test
    const adminRes = await fetch('http://localhost:3000/api/admin/users');

    const isHealth200 = healthRes.status === 200 && healthData.status === 'ok';
    const isTeacher401 = teacherUnauthRes.status === 401;
    const isTeacher200 = teacherAuthRes.status === 200 && Boolean(teacherData.classSummary);
    const isAdmin403 = adminRes.status === 403;

    if (isHealth200 && isTeacher401 && isTeacher200 && isAdmin403) {
      results['11_API_SECURITY_ENDPOINTS'] = {
        pass: true,
        details: `/api/health (200), /api/teacher unauth (401), /api/teacher auth (200), /api/admin (403).`,
      };
    } else {
      results['11_API_SECURITY_ENDPOINTS'] = {
        pass: false,
        details: `Health: ${healthRes.status}, TeacherUnauth: ${teacherUnauthRes.status}, TeacherAuth: ${teacherAuthRes.status}, Admin: ${adminRes.status}`,
      };
    }
  } catch (err: any) {
    results['11_API_SECURITY_ENDPOINTS'] = { pass: false, details: err.message };
  }

  // -------------------------------------------------------------
  // OUTPUT RESULTS MATRIX
  // -------------------------------------------------------------
  console.log('RESULTADOS DOS TESTES E2E:');
  let passedCount = 0;
  let totalCount = 0;

  for (const [key, val] of Object.entries(results)) {
    totalCount++;
    if (val.pass) passedCount++;
    const icon = val.pass ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${key}: ${val.details}`);
  }

  console.log(`\nTOTAL: ${passedCount} / ${totalCount} TESTES APROVADOS (${Math.round((passedCount/totalCount)*100)}%)`);

  if (passedCount === totalCount) {
    console.log('\n>>> STATUS FINAL: 🟢 APROVADO PARA PRODUÇÃO <<<');
  } else {
    console.log('\n>>> STATUS FINAL: 🔴 NÃO CERTIFICADO <<<');
  }
}

runProductionCertification();
