import argparse
from app import create_app
from app.db import SessionLocal
from app.models import User

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--email', required=True)
    ap.add_argument('--nome', default='Admin')
    ap.add_argument('--perfil', default='ADMIN')
    args=ap.parse_args()

    create_app()
    db=SessionLocal()
    try:
        email=args.email.strip().lower()
        u=db.query(User).filter(User.email==email).first()
        if u:
            print('Admin já existe:', u.email); return
        u=User(nome=args.nome, email=email, perfil=args.perfil, ativo=True)
        db.add(u); db.commit()
        print('Admin criado:', u.email)
    finally:
        db.close()

if __name__=='__main__':
    main()
