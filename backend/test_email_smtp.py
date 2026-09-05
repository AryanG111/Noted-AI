import asyncio
import os
import sys
from dotenv import load_dotenv

# Load env file
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services.email import send_welcome_email, send_account_approved_email

async def main():
    recipient = "aryanghait123@gmail.com" # send to self as test
    print(f"Testing SMTP delivery to: {recipient}...")
    
    # 1. Test Welcome Email
    print("\n1. Sending Welcome Email (Registration Received)...")
    res1 = await send_welcome_email(recipient, "Aryan Ghait", is_pending=True)
    print(f" -> Welcome Email Result: {'SUCCESS' if res1 else 'FAILED'}")
    
    # 2. Test Account Approved Email
    print("\n2. Sending Account Approved Email...")
    res2 = await send_account_approved_email(recipient, "Aryan Ghait")
    print(f" -> Account Approved Email Result: {'SUCCESS' if res2 else 'FAILED'}")

if __name__ == "__main__":
    asyncio.run(main())
