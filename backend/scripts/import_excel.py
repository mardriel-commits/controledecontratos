import argparse
import os
import re
import datetime as dt
from decimal import Decimal

import pandas as pd

from app.db import SessionLocal
from app.models import Company, Contract
from app.models.user import User

def clean_cnpj(v):
    if v is None:
        return None
    s = re.sub(r"\D", "", str(v))
    return s if s else None

def dec(v):
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return Decimal("0")
        return Decimal(str(v))
    except Exception:
        return Decimal("0")

def to_date(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, dt.date):
        return v
    try:
        return pd.to_datetime(v).date()
    except Exception:
        return None

def get_or_create_company(db, razao, cnpj):
    cnpj_clean = clean_cnpj(cnpj)
    if not cnpj_clean:
        return None
    c = db.query(Company).filter(Company.cnpj == cnpj_clean).first()
    if c:
        if razao and (not c.razao_social):
            c.razao_social = str(razao).strip()
        return c
    c = Company(razao_social=str(razao).strip() if razao and not pd.isna(razao) else cnpj_clean, cnpj=cnpj_clean)
    db.add(c); db.flush()
    return c

def get_or_create_user(db, nome, email, perfil):
    if not email or pd.isna(email):
        return None
    em = str(email).strip().lower()
    u = db.query(User).filter(User.email == em).first()
    if u:
        return u
    nm = str(nome).strip() if nome and not pd.isna(nome) else em.split("@")[0]
    u = User(name=nm, email=em, role=perfil, active=True)
    db.add(u); db.flush()
    return u

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--excel", required=True)
    ap.add_argument("--sheet", default="Contratos")
    args = ap.parse_args()

    df = pd.read_excel(args.excel, sheet_name=args.sheet)
    # tenta normalizar colunas (usa nomes que você tiver na planilha)
    cols = {c.strip(): c for c in df.columns}
    # possíveis nomes
    c_razao = cols.get("Razao_Social") or cols.get("Empresa") or cols.get("Razão social") or cols.get("Razão Social")
    c_cnpj = cols.get("CNPJ") or cols.get("Cnpj")
    c_num = cols.get("Numero_Contrato") or cols.get("N_Contrato") or cols.get("Número do contrato") or cols.get("Contrato")
    c_ini = cols.get("Data_Inicio") or cols.get("Início") or cols.get("Data início")
    c_fim = cols.get("Data_Fim") or cols.get("Vencimento") or cols.get("Data fim")
    c_ren = cols.get("Renovavel") or cols.get("Renovável?")
    c_val = cols.get("Valor_Inicial") or cols.get("Valor") or cols.get("Valor inicial")

    c_g_nome = cols.get("Gestor") or cols.get("Gestor_Nome")
    c_g_em = cols.get("Gestor_Email") or cols.get("Email_Gestor") or cols.get("E-mail Gestor")
    c_f_nome = cols.get("Fiscal") or cols.get("Fiscal_Nome")
    c_f_em = cols.get("Fiscal_Email") or cols.get("Email_Fiscal") or cols.get("E-mail Fiscal")

    if not all([c_razao, c_cnpj, c_num, c_ini, c_fim, c_val]):
        missing = [k for k,v in [("razao",c_razao),("cnpj",c_cnpj),("numero",c_num),("inicio",c_ini),("fim",c_fim),("valor",c_val)] if not v]
        raise SystemExit(f"Colunas obrigatórias não encontradas: {missing}. Ajuste cabeçalhos na planilha ou no script.")

    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        for _, r in df.iterrows():
            comp = get_or_create_company(db, r.get(c_razao), r.get(c_cnpj))
            if comp is None:
                print(f"[PULADO] Sem CNPJ: {r.get(c_razao)} | Contrato: {r.get(c_num)}")
                skipped += 1
                continue

            numero = str(r.get(c_num)).strip()
            if not numero or numero.lower() == "nan":
                skipped += 1
                continue

            exists = db.query(Contract).filter(Contract.numero_contrato == numero).first()
            if exists:
                continue

            gestor = get_or_create_user(db, r.get(c_g_nome), r.get(c_g_em), "GESTOR") if c_g_em else None
            fiscal = get_or_create_user(db, r.get(c_f_nome), r.get(c_f_em), "FISCAL") if c_f_em else None

            di = to_date(r.get(c_ini))
            dfim = to_date(r.get(c_fim))
            if not di or not dfim:
                print(f"[PULADO] Datas inválidas: {numero}")
                skipped += 1
                continue

            renovavel = str(r.get(c_ren)).strip().upper() in ("SIM","S","TRUE","1","YES") if c_ren else False

            c = Contract(
                company_id=comp.id,
                numero_contrato=numero,
                objeto=None,
                data_inicio=di,
                data_fim=dfim,
                status="ATIVO",
                renovavel=renovavel,
                valor_inicial=dec(r.get(c_val)),
                valor_aditivado_acumulado=Decimal("0"),
                gestor_id=gestor.id if gestor else None,
                fiscal_id=fiscal.id if fiscal else None,
                observacoes=None,
            )
            db.add(c)
            created += 1

        db.commit()
        print(f"Import concluído. Criados: {created}. Pulados: {skipped}.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
