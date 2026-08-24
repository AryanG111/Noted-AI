import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Load backend app path to imports
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.config import settings
from backend.app.core.db import engine, Base
# Ensure all models are imported so metadata knows about them
from backend.app.models import User, Note, Contact, Task, Relationship

def check_and_init_db():
    print("Testing PostgreSQL connection...")
    
    # Extract connection details to connect to default database 'postgres' first
    db_url = settings.DATABASE_URL
    base_url, db_name = db_url.rsplit('/', 1)
    
    # Connect to default 'postgres' database
    postgres_engine = create_engine(f"{base_url}/postgres", isolation_level="AUTOCOMMIT")
    
    try:
        with postgres_engine.connect() as conn:
            # Check if database 'noted_ai' exists
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
            exists = result.scalar()
            
            if not exists:
                print(f"Database '{db_name}' does not exist. Creating...")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"Database '{db_name}' created successfully.")
            else:
                print(f"Database '{db_name}' already exists.")
                
    except OperationalError as e:
        print(f"\n[ERROR] Unable to connect to PostgreSQL server: {e}")
        print("Please make sure PostgreSQL is running on localhost:5432 with password 'postgres' (or verify DATABASE_URL in your backend/.env).")
        sys.exit(1)
        
    print("\nInitializing database tables...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully:")
        for table_name in Base.metadata.tables.keys():
            print(f" - {table_name}")
            
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {e}")
        sys.exit(1)
        
    print("\nDatabase initialization completed successfully!")

if __name__ == "__main__":
    check_and_init_db()
