import os
import psycopg2

def main():
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        raise SystemExit("DATABASE_URL não definida")

    # psycopg2 aceita postgresql:// normalmente
    conn = psycopg2.connect(db_url)
    conn.autocommit = True

    with conn.cursor() as cur:
        # adiciona coluna se não existir
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        """)
        print("OK: coluna password_hash garantida.")

    conn.close()

if __name__ == "__main__":
    main()