import sqlite3
import pandas as pd
from typing import List, Optional, Dict
import os
import logging
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

# Get the absolute path to the backend directory
BACKEND_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BACKEND_DIR / "database.db"

def init_db():
    """Initialize the database and create the table if it doesn't exist"""
    logger.info(f"Initializing database at: {DATABASE_PATH}")
    
    # Remove data.db if it exists (old database)
    old_db = BACKEND_DIR / "data.db"
    if old_db.exists():
        logger.info(f"Removing old database file: {old_db}")
        os.remove(old_db)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # First create all tables
        logger.info("Creating tables...")
        
        # Create user_stats table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_stats (
                user_id TEXT PRIMARY KEY,
                search_count INTEGER DEFAULT 0,
                upload_count INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        logger.info("Created user_stats table")
        
        # Create csv_data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS csv_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT,
                column_name TEXT,
                value TEXT,
                UNIQUE(file_name, column_name, value)
            )
        ''')
        logger.info("Created csv_data table")
        
        # Commit the table creation
        conn.commit()
        
        # Now create indices
        logger.info("Creating indices...")
        try:
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_column_name ON csv_data(column_name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_value ON csv_data(value)')
            logger.info("Created indices successfully")
        except sqlite3.OperationalError as e:
            logger.error(f"Error creating indices: {e}")
            # Continue even if indices fail - they can be created later
        
        conn.commit()
        logger.info("Database tables and indices created successfully")
        
    except sqlite3.Error as e:
        logger.error(f"SQLite error during initialization: {e}")
        raise
    finally:
        conn.close()
    
    logger.info("Database initialized successfully")

def get_user_stats(user_id: str) -> dict:
    """Get user statistics"""
    logger.info(f"Getting stats for user: {user_id}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # First check if user exists
        cursor.execute('SELECT search_count, upload_count, last_updated FROM user_stats WHERE user_id = ?', (user_id,))
        result = cursor.fetchone()
        
        if result:
            logger.info(f"Found stats for user {user_id}: searches={result[0]}, uploads={result[1]}, last_updated={result[2]}")
            return {
                "searchCount": result[0],
                "uploadCount": result[1],
                "lastUpdated": result[2]
            }
        else:
            logger.info(f"No stats found for user {user_id}, creating new record")
            # Create new record if user doesn't exist
            cursor.execute('''
                INSERT INTO user_stats (user_id, search_count, upload_count, last_updated)
                VALUES (?, 0, 0, CURRENT_TIMESTAMP)
            ''', (user_id,))
            conn.commit()
            logger.info(f"Created new record for user {user_id}")
            return {"searchCount": 0, "uploadCount": 0, "lastUpdated": None}
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        return {"searchCount": 0, "uploadCount": 0, "lastUpdated": None}
    finally:
        conn.close()

def increment_user_search(user_id: str) -> bool:
    """Increment user's search count"""
    logger.info(f"Incrementing search count for user: {user_id}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # First check if user exists
        cursor.execute('SELECT search_count FROM user_stats WHERE user_id = ?', (user_id,))
        result = cursor.fetchone()
        
        if result:
            # Update existing user
            new_count = result[0] + 1
            cursor.execute('''
                UPDATE user_stats 
                SET search_count = ?, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (new_count, user_id))
            logger.info(f"Updated search count for user {user_id} to {new_count}")
        else:
            # Create new user record
            cursor.execute('''
                INSERT INTO user_stats (user_id, search_count, upload_count, last_updated)
                VALUES (?, 1, 0, CURRENT_TIMESTAMP)
            ''', (user_id,))
            logger.info(f"Created new record for user {user_id} with search count 1")
        
        conn.commit()
        logger.info(f"Successfully committed search increment for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error incrementing search count: {str(e)}")
        return False
    finally:
        conn.close()

def increment_user_upload(user_id: str) -> bool:
    """Increment user's upload count"""
    logger.info(f"Incrementing upload count for user: {user_id}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # First check if user exists
        cursor.execute('SELECT upload_count FROM user_stats WHERE user_id = ?', (user_id,))
        result = cursor.fetchone()
        
        if result:
            # Update existing user
            new_count = result[0] + 1
            cursor.execute('''
                UPDATE user_stats 
                SET upload_count = ?, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (new_count, user_id))
            logger.info(f"Updated upload count for user {user_id} to {new_count}")
        else:
            # Create new user record
            cursor.execute('''
                INSERT INTO user_stats (user_id, search_count, upload_count, last_updated)
                VALUES (?, 0, 1, CURRENT_TIMESTAMP)
            ''', (user_id,))
            logger.info(f"Created new record for user {user_id} with upload count 1")
        
        conn.commit()
        logger.info(f"Successfully committed upload increment for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error incrementing upload count: {str(e)}")
        return False
    finally:
        conn.close()

def load_csv_to_db(csv_path: str) -> bool:
    """Load a CSV file into the database"""
    try:
        logger.info(f"Loading CSV file: {csv_path}")
        file_size = os.path.getsize(csv_path)
        file_size_mb = file_size / (1024*1024)
        logger.info(f"File size: {file_size_mb:.2f} MB")
        
        # First count total rows
        logger.info("Counting total rows...")
        total_rows = sum(1 for _ in open(csv_path)) - 1  # subtract header row
        logger.info(f"Total rows to process: {total_rows:,}")
        
        # Read CSV in chunks to handle large files
        chunk_size = 5000  # Smaller chunks to handle memory better
        chunks = pd.read_csv(csv_path, chunksize=chunk_size)
        processed_rows = 0
        last_progress = 0
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        try:
            # Get the base filename without path
            file_name = os.path.basename(csv_path)
            logger.info(f"Processing file: {file_name}")
            
            # Get existing columns to avoid duplicates
            cursor.execute("SELECT DISTINCT column_name FROM csv_data WHERE file_name = ?", (file_name,))
            existing_columns = {row[0] for row in cursor.fetchall()}
            if existing_columns:
                logger.info(f"Found {len(existing_columns)} existing columns for this file")
            
            for i, chunk in enumerate(chunks, 1):
                # Process each column in the chunk
                for column in chunk.columns:
                    if column in existing_columns:
                        continue
                    
                    # Get unique values in this chunk
                    unique_values = chunk[column].dropna().unique()
                    
                    # Insert values in batches
                    batch_size = 1000
                    for j in range(0, len(unique_values), batch_size):
                        batch = unique_values[j:j+batch_size]
                        values = [(file_name, column, str(value)) for value in batch]
                        cursor.executemany(
                            'INSERT OR IGNORE INTO csv_data (file_name, column_name, value) VALUES (?, ?, ?)',
                            values
                        )
                
                processed_rows += len(chunk)
                progress = (processed_rows / total_rows) * 100
                
                # Log progress every 5% or when committing
                if progress - last_progress >= 5 or i % 10 == 0:
                    conn.commit()  # Commit periodically
                    logger.info(f"Progress: {progress:.1f}% ({processed_rows:,}/{total_rows:,} rows)")
                    last_progress = progress
            
            conn.commit()
            logger.info(f"Successfully loaded {processed_rows:,} rows from {file_name}")
            return True
            
        except sqlite3.Error as e:
            logger.error(f"SQLite error loading {csv_path}: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"Error loading CSV file {csv_path}: {e}")
        return False

def search_column(query: str) -> List[str]:
    """Search for columns matching the query"""
    logger.info(f"Searching for columns matching: {query}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Get distinct column names from the csv_data table
        cursor.execute("SELECT DISTINCT column_name FROM csv_data")
        columns = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found {len(columns)} total columns")
        
        # Filter columns that contain the query (case-insensitive)
        matching_columns = [
            col for col in columns 
            if query.lower() in col.lower()
        ]
        logger.info(f"Found {len(matching_columns)} matching columns")
        return matching_columns
    except Exception as e:
        logger.error(f"Error searching columns: {str(e)}")
        return []
    finally:
        conn.close()

def search_value(column: str, query: str, limit: Optional[int] = 100) -> List[dict]:
    """Search for exact value matches in a specific column"""
    logger.info(f"Searching for values in column '{column}' matching: {query}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Use exact matching (=) instead of LIKE for exact matches only
        sql = f'''
            SELECT DISTINCT "{column}" 
            FROM csv_data 
            WHERE LOWER("{column}") = LOWER(?)
            LIMIT ?
        '''
        cursor.execute(sql, (query, limit))
        
        results = cursor.fetchall()
        values = [row[0] for row in results]
        
        logger.info(f"Found {len(values)} matching values")
        return values
    
    except sqlite3.OperationalError as e:
        logger.error(f"Database error: {str(e)}")
        return []
    finally:
        conn.close()

def get_column_values(column: str, limit: Optional[int] = 1000) -> List:
    """Get all unique values in a column"""
    logger.info(f"Getting unique values for column: {column}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        sql = f'SELECT DISTINCT "{column}" FROM csv_data LIMIT ?'
        cursor.execute(sql, (limit,))
        results = cursor.fetchall()
        values = [row[0] for row in results]
        logger.info(f"Found {len(values)} unique values")
        return values
    
    except sqlite3.OperationalError as e:
        logger.error(f"Database error: {str(e)}")
        return []
    finally:
        conn.close()

def store_user_sheet_id(user_id: str, sheet_id: str) -> bool:
    """Store the Google Sheet ID for a user"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sheets (
                user_id TEXT PRIMARY KEY,
                sheet_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert or update sheet ID
        cursor.execute('''
            INSERT OR REPLACE INTO user_sheets (user_id, sheet_id)
            VALUES (?, ?)
        ''', (user_id, sheet_id))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error storing user sheet ID: {str(e)}")
        return False

def get_user_sheet_id(user_id: str) -> Optional[str]:
    """Get the Google Sheet ID for a user"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT sheet_id FROM user_sheets WHERE user_id = ?', (user_id,))
        result = cursor.fetchone()
        
        conn.close()
        return result[0] if result else None
    except Exception as e:
        logger.error(f"Error getting user sheet ID: {str(e)}")
        return None

# Remove the automatic initialization
# init_db()  # This line is removed 