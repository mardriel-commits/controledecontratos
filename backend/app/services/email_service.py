import smtplib
from email.mime.text import MIMEText

def send_email(app, to_list, subject, body):
    host = app.config.get('SMTP_HOST')
    user = app.config.get('SMTP_USER')
    password = app.config.get('SMTP_PASS')
    port = int(app.config.get('SMTP_PORT') or 587)
    from_addr = app.config.get('SMTP_FROM') or user
    if not host or not from_addr or not to_list:
        return {'sent': False, 'reason': 'SMTP not configured'}

    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = from_addr
    msg['To'] = ', '.join(to_list)

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        if user and password:
            server.login(user, password)
        server.sendmail(from_addr, to_list, msg.as_string())
    return {'sent': True}
