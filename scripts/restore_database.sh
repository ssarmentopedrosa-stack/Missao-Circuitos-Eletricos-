#!/usr/bin/env bash
# ==============================================================================
# MISSÃO CIRCUITOS ELÉTRICOS 2.0 — RESTAURAÇÃO DE BACKUP SQLITE
# Valida integridade física (PRAGMA integrity_check) antes da restauração.
# ==============================================================================

set -euo pipefail

DATA_DIR="${DATA_DIR:-./data}"
TARGET_DB="${DATA_DIR}/circuits_authoritative.db"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Identificar arquivo de backup informado ou o mais recente
BACKUP_SRC="${1:-}"

if [ -z "${BACKUP_SRC}" ]; then
  BACKUP_SRC=$(find "${BACKUP_DIR}" -type f -name "circuits_backup_*.db" | sort -r | head -n 1)
fi

if [ -z "${BACKUP_SRC}" ] || [ ! -f "${BACKUP_SRC}" ]; then
  echo "[ERRO] Nenhum arquivo de backup válido encontrado para restauração."
  exit 1
fi

echo "[RESTORE] Arquivo selecionado para restauração: ${BACKUP_SRC}"

# Validação de integridade física antes de restaurar
node -e '
const { DatabaseSync } = require("node:sqlite");
const backupPath = process.argv[1];

try {
  const db = new DatabaseSync(backupPath, { readOnly: true });
  const check = db.prepare("PRAGMA integrity_check;").get();
  db.close();
  if (!check || check.integrity_check !== "ok") {
    console.error("[RESTORE] Falha na integridade física do backup:", check);
    process.exit(1);
  }
  console.log("[RESTORE] Integridade física do backup verificada: OK.");
} catch (err) {
  console.error("[RESTORE ERROR]", err);
  process.exit(1);
}
' "${BACKUP_SRC}"

mkdir -p "${DATA_DIR}"

TEMP_RESTORE="${DATA_DIR}/circuits_restore_temp.db"
rm -f "${TEMP_RESTORE}" "${TEMP_RESTORE}-wal" "${TEMP_RESTORE}-shm"

# Copiar arquivo de backup para o destino
echo "[RESTORE] ATENÇÃO OPERACIONAL: Se o container de produção estiver em execução,"
echo "[RESTORE] reinicie-o após a restauração para recarregar o descritor de arquivo SQLite."
echo "[RESTORE] Exemplo: docker compose restart backend"
cp "${BACKUP_SRC}" "${TEMP_RESTORE}"

# Configurar modo WAL no banco restaurado antes da troca atômica
node - "${TEMP_RESTORE}" << 'EOF'
const { DatabaseSync } = require("node:sqlite");
const dbPath = process.argv[2];

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
const mode = db.prepare("PRAGMA journal_mode;").get();
db.close();
console.log("[RESTORE] Modo de journal verificado no snapshot:", mode.journal_mode);
EOF

# Se existir banco atual, criar cópia preventiva de rollback
if [ -f "${TARGET_DB}" ]; then
  SAFETY_COPY="${DATA_DIR}/circuits_authoritative.db.pre_restore_$(date +%Y%m%d_%H%M%S)"
  echo "[RESTORE] Criando cópia de segurança preventiva: ${SAFETY_COPY}"
  cp "${TARGET_DB}" "${SAFETY_COPY}" 2>/dev/null || true
fi

# Limpeza de logs residuais
rm -f "${TARGET_DB}-wal" "${TARGET_DB}-shm"

# Troca atômica (atomic rename)
mv -f "${TEMP_RESTORE}" "${TARGET_DB}"
rm -f "${TEMP_RESTORE}-wal" "${TEMP_RESTORE}-shm"

echo "[RESTORE] Restauração concluída com sucesso! Banco ativo em: ${TARGET_DB}"
