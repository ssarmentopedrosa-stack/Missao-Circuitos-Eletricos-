#!/usr/bin/env bash
# ==============================================================================
# MISSÃO CIRCUITOS ELÉTRICOS 2.0 — BACKUP AUTORITATIVO DO BANCO SQLITE (WAL)
# Executa snapshot ACID consistente usando VACUUM INTO via runtime Node.js 22.
# ==============================================================================

set -euo pipefail

DATA_DIR="${DATA_DIR:-./data}"
DB_FILE="${DATA_DIR}/circuits_authoritative.db"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/circuits_backup_${TIMESTAMP}.db"

echo "[BACKUP] Iniciando rotina de backup seguro para SQLite WAL..."

# Validação da existência do banco
if [ ! -f "${DB_FILE}" ]; then
  echo "[ERRO] Banco de dados autoritativo não encontrado em: ${DB_FILE}"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

# Utiliza Node.js 22 DatabaseSync para executar VACUUM INTO de forma atômica
# sem bloquear escritas ativas e garantindo checkpoint do log WAL
node - "${DB_FILE}" "${BACKUP_FILE}" << 'EOF'
const { DatabaseSync } = require("node:sqlite");
const dbPath = process.argv[2];
const targetPath = process.argv[3];

try {
  const db = new DatabaseSync(dbPath);
  // Força checkpoint passivo e gera snapshot limpo e desfragmentado
  db.exec("PRAGMA wal_checkpoint(PASSIVE);");
  const escapedTarget = targetPath.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${escapedTarget}';`);
  db.close();
  console.log("[BACKUP] Snapshot ACID gerado com sucesso via VACUUM INTO.");
} catch (err) {
  console.error("[BACKUP ERROR]", err);
  process.exit(1);
}
EOF

# Validação do arquivo gerado
if [ -f "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
  CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  echo "[BACKUP] Arquivo criado: ${BACKUP_FILE} (${FILE_SIZE})"
  echo "[BACKUP] SHA256: ${CHECKSUM}"
else
  echo "[ERRO] Falha na criação do arquivo de backup."
  exit 1
fi

# Política de retenção: remover backups mais antigos que RETENTION_DAYS
echo "[BACKUP] Aplicando política de retenção (${RETENTION_DAYS} dias)..."
find "${BACKUP_DIR}" -type f -name "circuits_backup_*.db" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "[BACKUP] Backup concluído com sucesso!"
