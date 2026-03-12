import argparse
import os

from app.db import SessionLocal, get_database_url
from app.models.user import User

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--nome", required=True)
    parser.add_argument("--senha", required=True)
    parser.add_argument("--perfil", default="ADMIN")
    args = parser.parse_args()

    # validações simples
    email = args.email.strip().lower()
    nome = args.nome.strip()
    senha = args.senha
    perfil = args.perfil.strip().upper()

    if perfil not in ("ADMIN", "GESTOR", "FISCAL", "CONSULTA"):
        raise SystemExit("Perfil inválido. Use ADMIN/GESTOR/FISCAL/CONSULTA")

    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        raise SystemExit("DATABASE_URL não definida. Cole a External Database URL do Render.")

    print("Usando DATABASE_URL:", get_database_url().split("@")[-1])  # não expõe senha

    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            # atualiza para admin e ativa
            u.name = nome
            u.role = perfil
            u.active = True
            u.set_password(senha)
            db.commit()
            print(f"Usuário atualizado: {u.email} ({u.role})")
            return

        u = User(name=nome, email=email, role=perfil, active=True)
        u.set_password(senha)

        db.add(u)
        db.commit()
        print(f"Usuário criado: {u.email} ({u.role})")
    finally:
        db.close()

if __name__ == "__main__":
    main()
