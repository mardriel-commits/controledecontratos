import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

def send_email(to_emails, subject, html_body, text_body=None):
    smtp_host = current_app.config.get("SMTP_HOST")
    smtp_port = int(current_app.config.get("SMTP_PORT", 587))
    smtp_user = current_app.config.get("SMTP_USER")
    smtp_pass = current_app.config.get("SMTP_PASS")
    smtp_from = current_app.config.get("SMTP_FROM")

    if not smtp_host or not smtp_user or not smtp_pass or not smtp_from:
        raise RuntimeError("Configuração SMTP incompleta")

    if isinstance(to_emails, str):
        to_emails = [to_emails]

    to_emails = [e.strip() for e in to_emails if e and str(e).strip()]
    if not to_emails:
        raise ValueError("Nenhum destinatário válido informado")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = ", ".join(to_emails)

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_emails, msg.as_string())
