# Gestão de Contratos — Sebrae (MVP)

## Local (Docker)
```bash
docker compose up --build
```
- Web: http://localhost:5173
- API: http://localhost:5000/api
- Health: http://localhost:5000/health

## Deploy online (Render + GitHub)
1. Suba este projeto no GitHub.
2. No Render: **New > Blueprint** e selecione o repositório.
3. O Render cria banco Postgres + API + Site.

## Importação via script (Excel)
> Recomendado: rodar no seu computador apontando para o Postgres do Render (External Database URL).

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export DATABASE_URL="postgresql://..."  # pegue no Render
python scripts/seed_admin.py --email admin@sebrae.local --nome Admin --perfil ADMIN
python scripts/import_excel.py --excel "/caminho/Modelo de gestão.xlsx" --sheet "Contratos"
```

## Semáforo de vencimento
- VERDE: > 30 dias
- AMARELO: <= 30 dias
- VERMELHO: <= 15 dias
