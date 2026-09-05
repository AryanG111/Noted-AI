import smtplib
import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from backend.app.core.config import settings

logger = logging.getLogger("noted_ai.email")

def _send_smtp_email_sync(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None):
    """Synchronous SMTP email delivery with TLS/SSL support."""
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP is not fully configured (HOST/USER/PASSWORD missing). Skipping email to {to_email}.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.PROJECT_NAME} <{settings.SMTP_FROM or settings.SMTP_USER}>"
    msg["To"] = to_email

    # Plaintext fallback
    if text_content:
        msg.attach(MIMEText(text_content, "plain"))
    else:
        msg.attach(MIMEText("Please view this email in a client that supports HTML.", "plain"))

    # HTML body
    msg.attach(MIMEText(html_content, "html"))

    try:
        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
            if settings.SMTP_TLS:
                server.starttls()

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM or settings.SMTP_USER, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully sent email '{subject}' to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_email_async(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None):
    """Async wrapper for non-blocking email delivery."""
    return await asyncio.to_thread(_send_smtp_email_sync, to_email, subject, html_content, text_content)


def get_base_email_template(preheader: str, body_html: str) -> str:
    """Standardized HTML email shell matching Noted AI aesthetic."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noted AI</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #FAF9F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      -webkit-font-smoothing: antialiased;
    }}
    .email-wrapper {{
      width: 100%;
      background-color: #FAF9F6;
      padding: 40px 16px;
    }}
    .email-container {{
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }}
    .header {{
      padding: 28px 32px 20px 32px;
      border-bottom: 1px solid #F3F4F6;
      display: flex;
      align-items: center;
    }}
    .logo-badge {{
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }}
    .logo-sparkle {{
      color: #7C3AED;
      margin-right: 6px;
    }}
    .content {{
      padding: 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #374151;
    }}
    .h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.01em;
    }}
    .pill-card {{
      background-color: #FAF9F6;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
    }}
    .feature-item {{
      margin-bottom: 10px;
      display: flex;
      align-items: flex-start;
      font-size: 14px;
    }}
    .btn {{
      display: inline-block;
      background-color: #111827;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 26px;
      border-radius: 8px;
      margin: 20px 0 10px 0;
      text-align: center;
    }}
    .btn-purple {{
      background-color: #7C3AED;
    }}
    .footer {{
      padding: 24px 32px;
      background-color: #FAF9F6;
      border-top: 1px solid #F3F4F6;
      font-size: 12px;
      color: #6B7280;
      text-align: center;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">{preheader}</div>
  <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <span class="logo-badge"><span class="logo-sparkle">&#10022;</span> Noted AI</span>
          </div>

          <!-- Body -->
          <div class="content">
            {body_html}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 500; color: #4B5563;">Noted AI — Cognitive Workspace with Long-Term Memory</p>
            <p style="margin: 0;">Automated notification sent to your registered email.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_welcome_email(to_email: str, full_name: Optional[str] = None, is_pending: bool = True):
    """Sends the welcome & registration confirmation email."""
    name_str = full_name.split()[0] if full_name else "there"
    subject = "✦ Welcome to Noted AI — Registration Received"
    preheader = "Your Noted AI workspace request has been received."

    status_block = f"""
      <div class="pill-card" style="border-left: 3px solid #F59E0B; background-color: #FFFBEB;">
        <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: 500;">
          <strong>Account Status: Pending Approval</strong><br>
          Your account request has been submitted for administrator review. You'll receive a confirmation email the moment access is granted.
        </p>
      </div>
    """ if is_pending else f"""
      <div class="pill-card" style="border-left: 3px solid #10B981; background-color: #ECFDF5;">
        <p style="margin: 0; font-size: 14px; color: #065F46; font-weight: 500;">
          <strong>Account Status: Active & Ready</strong><br>
          Your account is fully approved. You can sign in immediately to start capturing memories.
        </p>
      </div>
    """

    login_url = f"{settings.FRONTEND_URL}/login"

    body_html = f"""
      <h1 class="h1">Hello {name_str}, welcome to Noted AI.</h1>
      <p>Thank you for creating an account with Noted AI, your private cognitive workspace powered by long-term vector memory and graph intelligence.</p>

      {status_block}

      <p style="font-weight: 600; color: #111827; margin-bottom: 8px;">What you can do with Noted AI:</p>
      <div class="pill-card">
        <div class="feature-item">&#10022; <strong>Thought Ingestion:</strong> Automatically extracts tags, action items, and contacts from your notes.</div>
        <div class="feature-item">&#10022; <strong>Voice Capture:</strong> Record voice notes with instant Whisper AI transcription.</div>
        <div class="feature-item">&#10022; <strong>Memory Graph:</strong> Explore evolving relationships between your ideas, projects, and network.</div>
        <div class="feature-item">&#10022; <strong>Daily Executive Briefing:</strong> Get smart daily morning recaps and memory flashbacks.</div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{login_url}" class="btn">Go to Noted AI</a>
      </div>
    """

    return await send_email_async(to_email, subject, get_base_email_template(preheader, body_html))


async def send_account_approved_email(to_email: str, full_name: Optional[str] = None):
    """Sends the account approval notification email."""
    name_str = full_name.split()[0] if full_name else "there"
    subject = "✨ Your Noted AI Account is Approved & Ready!"
    preheader = "Your administrator has approved your Noted AI account. Start using your workspace now."

    login_url = f"{settings.FRONTEND_URL}/login"

    body_html = f"""
      <h1 class="h1">Great news, {name_str}!</h1>
      <p>Your administrator has reviewed and <strong>approved</strong> your Noted AI account registration.</p>

      <div class="pill-card" style="border-left: 3px solid #10B981; background-color: #ECFDF5;">
        <p style="margin: 0; font-size: 14px; color: #065F46; font-weight: 500;">
          &#10003; <strong>Access Activated:</strong> You can now sign in with your email (<code>{to_email}</code>) and your password.
        </p>
      </div>

      <p>Your second brain is ready to start indexing notes, extracting commitments, and organizing your cognitive workspace.</p>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="{login_url}" class="btn btn-purple">Enter Your Workspace &rarr;</a>
      </div>
    """

    return await send_email_async(to_email, subject, get_base_email_template(preheader, body_html))
