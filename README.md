# Sebrae - Gestão de Contratos (Web)

Projeto completo (Flask + Postgres + React/Vite) com:
- Login local (JWT access token + refresh cookie)
- Perfis: ADMIN / GESTOR / FISCAL / CONSULTA
- Dashboard (lista + semáforo)
- Página de cadastro manual de contrato (/contracts/new) - ADMIN
- Movimentações de saldo por NF (EXECUCAO/ESTORNO/AJUSTE) com permissão por vínculo
- Rotina de alertas (stub) via APScheduler
- Compatibilidade com banco legado (users.nome / users.perfil / users.ativo)

## Variáveis de ambiente (API)
- DATABASE_URL (Render Postgres)
- JWT_SECRET
- ACCESS_TOKEN_MINUTES=15
- REFRESH_TOKEN_DAYS=7
- CORS_ORIGINS=https://<seu-frontend>.onrender.com
- COOKIE_SECURE=true (Render)

## Frontend
No Render (Static Site):
- VITE_API_URL=https://<sua-api>.onrender.com

## Scripts
- backend/scripts/seed_admin.py
- backend/scripts/import_excel.py (usa pandas/openpyxl)

