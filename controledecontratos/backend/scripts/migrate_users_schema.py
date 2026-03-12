import os
import psycopg2

def main():
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        raise SystemExit("DATABASE_URL não definida")

    conn = psycopg2.connect(db_url)
    conn.autocommit = True

    with conn.cursor() as cur:
        # Garante colunas necessárias (mantém compatível com a tabela antiga)
        cur.execute("""ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);""")
        cur.execute("""ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'CONSULTA';""")
        cur.execute("""ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;""")
        cur.execute("""ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();""")

        # Garante defaults para registros existentes (caso as colunas tenham sido criadas agora)
        cur.execute("""UPDATE users SET role='CONSULTA' WHERE role IS NULL;""")
        cur.execute("""UPDATE users SET active=TRUE WHERE active IS NULL;""")
        cur.execute("""UPDATE users SET created_at=now() WHERE created_at IS NULL;""")

        print("OK: users schema atualizado (password_hash, role, active, created_at).")

    conn.close()

if __name__ == "__main__":
    main()