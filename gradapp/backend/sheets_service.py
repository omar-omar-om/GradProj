import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import pandas as pd
import logging
import json

# Set up logging
logger = logging.getLogger(__name__)

# Path to the service account key file
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), '..', 'model-part2', 'csv-predictor-453016-e7b55da4e792.json')

# Google Sheets API scopes
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_sheets_service():
    """Get an authorized Google Sheets service"""
    try:
        logger.info(f"Attempting to load service account file from: {SERVICE_ACCOUNT_FILE}")
        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            logger.error(f"Service account file not found at: {SERVICE_ACCOUNT_FILE}")
            raise FileNotFoundError(f"Service account file not found at: {SERVICE_ACCOUNT_FILE}")
            
        # Read and validate the service account file
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            service_account_info = json.load(f)
            logger.info(f"Service account email: {service_account_info.get('client_email', 'Not found')}")
            
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=credentials)
        logger.info("Successfully created Google Sheets service")
        return service
    except Exception as e:
        logger.error(f"Error creating sheets service: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

def create_user_sheet(user_id: str) -> str:
    """Create a new Google Sheet for a user"""
    try:
        logger.info(f"Creating new sheet for user: {user_id}")
        service = get_sheets_service()
        
        # Create the sheet
        sheet_metadata = {
            'properties': {
                'title': f'Predictions for User {user_id}'
            }
        }
        logger.info("Attempting to create new spreadsheet...")
        try:
            sheet = service.spreadsheets().create(body=sheet_metadata).execute()
            spreadsheet_id = sheet.get('spreadsheetId')
            logger.info(f"Created sheet with ID: {spreadsheet_id}")
        except HttpError as error:
            logger.error(f"HTTP error creating sheet: {error}")
            logger.error(f"Error details: {error.content}")
            logger.error(f"Error status code: {error.resp.status}")
            logger.error(f"Error headers: {error.resp.headers}")
            raise
        
        # Set up header row
        header_row = ['ID', 'Prediction', 'Confidence', 'Timestamp']
        body = {
            'values': [header_row]
        }
        logger.info("Setting up header row...")
        try:
            result = service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range='A1:D1',
                valueInputOption='RAW',
                body=body
            ).execute()
            logger.info(f"Updated header row: {result.get('updatedRows')} rows updated")
        except HttpError as error:
            logger.error(f"HTTP error updating header row: {error}")
            logger.error(f"Error details: {error.content}")
            logger.error(f"Error status code: {error.resp.status}")
            logger.error(f"Error headers: {error.resp.headers}")
            raise
        
        return spreadsheet_id
        
    except HttpError as error:
        logger.error(f"HTTP error in create_user_sheet: {error}")
        logger.error(f"Error details: {error.content}")
        logger.error(f"Error status code: {error.resp.status}")
        logger.error(f"Error headers: {error.resp.headers}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_user_sheet: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

def append_predictions(spreadsheet_id: str, results_df: pd.DataFrame):
    """Append prediction results to the specified Google Sheet"""
    try:
        logger.info(f"Appending predictions to sheet: {spreadsheet_id}")
        logger.info(f"Results DataFrame shape: {results_df.shape}")
        logger.info(f"Results DataFrame columns: {results_df.columns.tolist()}")
        
        service = get_sheets_service()
        
        # Convert timestamps to strings
        results_df['Timestamp'] = results_df['Timestamp'].astype(str)
        
        # Convert DataFrame to list of lists
        values = results_df.values.tolist()
        logger.info(f"Converting {len(values)} rows to sheet format")
        
        body = {
            'values': values
        }
        
        logger.info("Attempting to append data to sheet...")
        result = service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range='A:D',
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body=body
        ).execute()
        
        logger.info(f"Appended {result.get('updates', {}).get('updatedRows', 0)} rows")
        
    except HttpError as error:
        logger.error(f"HTTP error appending predictions: {error}")
        logger.error(f"Error details: {error.content}")
        raise
    except Exception as e:
        logger.error(f"Error appending predictions: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise 