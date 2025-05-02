import pandas as pd
import os
from typing import Dict, List, Tuple, Union, Any
import logging
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

# Get the absolute path to the backend directory
BACKEND_DIR = Path(__file__).resolve().parent
MODEL_DIR = BACKEND_DIR.parent / 'model-part2'

# Paths to the reference CSV files
REFERENCE_CSV_FILES = [
    str(MODEL_DIR / 'output_part1.csv'),
    str(MODEL_DIR / 'output_part2.csv'),
    str(MODEL_DIR / 'output_part3.csv')
]

class CSVValidationError(Exception):
    """Custom exception for CSV validation errors"""
    pass

def load_reference_data() -> Tuple[List[str], Dict[str, set]]:
    """
    Load reference CSV files and create sets of valid values for each column
    Returns:
        Tuple[List[str], Dict[str, set]]: (required_columns, valid_values_by_column)
    """
    try:
        logger.info("Loading reference CSV files...")
        
        # Initialize valid values dictionary
        valid_values = {}
        required_columns = None
        
        # Load each reference file
        for file_path in REFERENCE_CSV_FILES:
            logger.info(f"Loading reference file: {file_path}")
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Reference file not found: {file_path}")
            
            # Read the CSV file
            df = pd.read_csv(file_path)
            
            # On first file, set the required columns
            if required_columns is None:
                required_columns = list(df.columns)
                # Initialize sets for each column
                for column in required_columns:
                    valid_values[column] = set()
            
            # Verify columns match across all files
            if list(df.columns) != required_columns:
                raise CSVValidationError(f"Column mismatch in {file_path}")
            
            # Add values to valid_values sets
            for column in df.columns:
                # Convert to strings and remove any leading/trailing whitespace
                values = df[column].astype(str).str.strip()
                valid_values[column].update(values.unique())
            
            logger.info(f"Processed {len(df)} rows from {file_path}")
        
        # Log summary
        for column in valid_values:
            logger.info(f"Found {len(valid_values[column])} unique valid values for column '{column}'")
        
        return required_columns, valid_values
        
    except Exception as e:
        logger.error(f"Error loading reference data: {str(e)}")
        raise CSVValidationError(f"Failed to load reference data: {str(e)}")

def validate_csv(uploaded_data: Union[str, pd.DataFrame]) -> Dict[str, Any]:
    """
    Validate the uploaded CSV file against reference data
    Args:
        uploaded_data: Either a file path (str) or a pandas DataFrame
    Returns:
        Dict with keys:
        - valid: bool
        - errors: List[str]
    """
    try:
        # Load reference data
        logger.info("Loading reference data for validation...")
        required_columns, valid_values = load_reference_data()
        
        # Load uploaded data
        if isinstance(uploaded_data, str):
            logger.info(f"Loading uploaded CSV file: {uploaded_data}")
            try:
                uploaded_df = pd.read_csv(uploaded_data)
                if len(uploaded_df) == 0:
                    raise ValueError("Your CSV file is empty. Please provide a file with data.")
            except pd.errors.EmptyDataError:
                raise ValueError("Your CSV file is empty. Please provide a file with data.")
            except Exception as e:
                if "You might have extra columns not present in original" in str(e):
                    raise ValueError("Your CSV file appears to be empty or corrupted. Please check your file and try again.")
                raise
        else:
            logger.info("Using provided DataFrame")
            uploaded_df = uploaded_data
            if len(uploaded_df) == 0:
                raise ValueError("Your data is empty. Please provide data to process.")
        
        error_messages = []
        warning_messages = []
        
        # Check for missing required columns
        missing_columns = set(required_columns) - set(uploaded_df.columns)
        if missing_columns:
            error_msg = f"Missing these required columns: {', '.join(missing_columns)}"
            logger.error(error_msg)
            error_messages.append(error_msg)
        
        # Check for extra columns
        extra_columns = set(uploaded_df.columns) - set(required_columns)
        if extra_columns and "ID" not in extra_columns:  # Allow ID column as an exception
            extra_columns_without_id = [col for col in extra_columns if col != "ID"]
            if extra_columns_without_id:
                error_msg = f"These extra columns are not allowed: {', '.join(extra_columns_without_id)}"
                logger.error(error_msg)
                error_messages.append(error_msg)
        
        # If column structure is fundamentally invalid, return early
        if missing_columns:
            return {
                'valid': False,
                'errors': error_messages
            }
        
        # Validate values in each column
        for column in set(uploaded_df.columns).intersection(set(required_columns)):
            # Convert values to strings and remove whitespace
            values = uploaded_df[column].astype(str).str.strip()
            unique_values = set(values.dropna())
            
            # Find invalid values
            invalid_values = unique_values - valid_values[column]
            if invalid_values:
                # Show only first 5 invalid values to avoid huge error messages
                sample_invalids = list(invalid_values)[:5]
                error_msg = f"Column '{column}' has these invalid values: {', '.join(sample_invalids)}"
                if len(invalid_values) > 5:
                    error_msg += f" and {len(invalid_values) - 5} more..."
                logger.error(error_msg)
                error_messages.append(error_msg)
            
            # Check for empty values
            empty_count = values.isna().sum()
            if empty_count > 0:
                error_msg = f"Column '{column}' has {empty_count} empty values"
                logger.error(error_msg)
                error_messages.append(error_msg)
        
        is_valid = len(error_messages) == 0
        logger.info(f"Validation complete. Valid: {is_valid}")
        
        if warning_messages:
            logger.warning(f"Validation warnings found: {warning_messages}")
            
        if not is_valid:
            logger.warning(f"Validation errors found: {error_messages}")
        
        return {
            'valid': is_valid,
            'errors': error_messages,
            'warnings': warning_messages
        }
        
    except Exception as e:
        logger.error(f"Error during validation: {str(e)}")
        return {
            'valid': False,
            'errors': [f"Validation failed: {str(e)}"]
        }

def get_column_info() -> Dict[str, Dict]:
    """Get information about valid columns and their values"""
    try:
        ref_df, valid_values = load_reference_data()
        
        column_info = {}
        for column in ref_df.columns:
            column_info[column] = {
                'valid_values': sorted(list(valid_values[column])),
                'total_values': len(valid_values[column]),
                'sample_values': sorted(list(valid_values[column]))[:5]  # First 5 values as sample
            }
        
        return column_info
    except Exception as e:
        logger.error(f"Error getting column info: {str(e)}")
        raise CSVValidationError(f"Failed to get column info: {str(e)}") 