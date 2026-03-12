import argparse, datetime as dt
from decimal import Decimal
import pandas as pd
from app import create_app
from app.db import SessionLocal
from app.models import Company, User, Contract

def norm_cnpj(v):
    if pd.isna(v): return None
    s=''.join(ch for ch in str(v) if ch.isdigit())
    return s

def to_date(v):
    if pd.isna(v): return None
    if isinstance(v, dt.datetime): return v.date()
    if isinstance(v, dt.date): return v
    return pd.to_datetime(v).date()

def to_bool(v):
    if pd.isna(v): return False
    return str(v).strip().upper() in ('SIM','S','TRUE','1','YES')

def to_dec(v):
    if pd.isna(v): return Decimal('0')
    try:
        return Decimal(str(v)).quantize(Decimal('0.01'))
    except Exception:
        s=str(v).replace('.','').replace(',','.')
        return Decimal(s).quantize(Decimal('0.01'))

def get_or_create_company(db, razao, cnpj):
    cnpj_n=norm_cnpj(cnpj)
    c=db.query(Company).filter(Company.cnpj==cnpj_n).first()
    if c: return c
    c=Company(razao_social=str(razao).strip(), cnpj=cnpj_n)
    db.add(c); db.flush()
    return c

def get_or_create_user(db, nome, email, perfil):
    if pd.isna(email) or not str(email).strip():
        return None
    em=str(email).strip().lower()
    u=db.query(User).filter(User.email==em).first()
    if u: return u
    u=User(nome=str(nome).strip() if nome and not pd.isna(nome) else em.split('@')[0], email=em, perfil=perfil, ativo=True)
    db.add(u); db.flush()
    return u

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--excel', required=True)
    ap.add_argument('--sheet', default='Contratos')
    ap.add_argument('--dry-run', action='store_true')
    args=ap.parse_args()

    create_app()
    db=SessionLocal()
    try:
        df=pd.read_excel(args.excel, sheet_name=args.sheet)
        cols={c.strip():c for c in df.columns}
        def pick(*names):
            for n in names:
                if n in cols: return cols[n]
            return None

        c_razao=pick('Razao_Social','Empresa','Fornecedor','Razão Social')
        c_cnpj=pick('CNPJ','Cnpj')
        c_num=pick('Numero_Contrato','N_Contrato','Contrato','Número do contrato')
        c_ini=pick('Data_Inicio','Inicio','Data início')
        c_fim=pick('Data_Fim','Vencimento','Data de vencimento')
        c_status=pick('Status')
        c_ren=pick('Renovavel','Renovável?')
        c_val=pick('Valor_Inicial','Valor','Saldo_Inicial','Valor inicial')
        c_adit=pick('Valor_Aditivado_Acumulado','Aditivado_Acumulado')
        c_obj=pick('Objeto','Descrição','Objeto/Descricao')
        c_g_nome=pick('Gestor_Nome','Gestor')
        c_g_em=pick('Gestor_Email','Email_Gestor','E-mail Gestor')
        c_f_nome=pick('Fiscal_Nome','Fiscal')
        c_f_em=pick('Fiscal_Email','Email_Fiscal','E-mail Fiscal')

        if any(x is None for x in [c_razao,c_cnpj,c_num,c_ini,c_fim]):
            raise SystemExit('Colunas obrigatórias não encontradas na aba Contratos.')

        ins=upd=0
        for _, r in df.iterrows():
            if pd.isna(r[c_num]): 
                continue
            numero=str(r[c_num]).strip()
            if not numero: 
                continue
            di=to_date(r[c_ini]); dfim=to_date(r[c_fim])
            if not di or not dfim: 
                continue
            comp=get_or_create_company(db, r[c_razao], r[c_cnpj])
            gestor=get_or_create_user(db, r.get(c_g_nome), r.get(c_g_em), 'GESTOR') if c_g_em else None
            fiscal=get_or_create_user(db, r.get(c_f_nome), r.get(c_f_em), 'FISCAL') if c_f_em else None

            c=db.query(Contract).filter(Contract.numero_contrato==numero).first()
            if not c:
                c=Contract(
                    company_id=comp.id,
                    numero_contrato=numero,
                    objeto=str(r.get(c_obj)).strip() if c_obj and not pd.isna(r.get(c_obj)) else None,
                    data_inicio=di,
                    data_fim=dfim,
                    status=str(r.get(c_status)).strip().upper() if c_status and not pd.isna(r.get(c_status)) else 'ATIVO',
                    renovavel=to_bool(r.get(c_ren)) if c_ren else False,
                    valor_inicial=to_dec(r.get(c_val)) if c_val else Decimal('0'),
                    valor_aditivado_acumulado=to_dec(r.get(c_adit)) if c_adit and not pd.isna(r.get(c_adit)) else Decimal('0'),
                    gestor_id=gestor.id if gestor else None,
                    fiscal_id=fiscal.id if fiscal else None,
                )
                db.add(c); ins+=1
            else:
                c.company_id=comp.id
                c.data_inicio=di
                c.data_fim=dfim
                if c_status and not pd.isna(r.get(c_status)): c.status=str(r.get(c_status)).strip().upper()
                if c_ren: c.renovavel=to_bool(r.get(c_ren))
                if c_val: c.valor_inicial=to_dec(r.get(c_val))
                if c_adit and not pd.isna(r.get(c_adit)): c.valor_aditivado_acumulado=to_dec(r.get(c_adit))
                if c_obj and not pd.isna(r.get(c_obj)): c.objeto=str(r.get(c_obj)).strip()
                if gestor: c.gestor_id=gestor.id
                if fiscal: c.fiscal_id=fiscal.id
                upd+=1

        if args.dry_run:
            db.rollback()
            print(f'[DRY-RUN] Inseridos: {ins} | Atualizados: {upd}')
        else:
            db.commit()
            print(f'Inseridos: {ins} | Atualizados: {upd}')
    finally:
        db.close()

if __name__=='__main__':
    main()
