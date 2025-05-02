from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
import pandas as pd
import os
import json
import pickle
import sys
import logging
import io
from fastapi.responses import JSONResponse
from pathlib import Path
import random
from datetime import datetime
from firebase_helper import get_user_stats, update_user_stats, store_prediction_file, get_user_prediction_files

# Ensure the backend directory is in the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import after setting path
from predictor import predict, load_model, load_label_mappings
from csv_validator import validate_csv, CSVValidationError

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # This will output to terminal
        logging.FileHandler('logs/app.log')  # This will output to file
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BACKEND_DIR = Path(__file__).resolve().parent
MODEL_DIR = BACKEND_DIR.parent / 'model-part2'
CSV_FILE_PATHS = [
    str(MODEL_DIR / 'output_part1.csv'),
    str(MODEL_DIR / 'output_part2.csv'),
    str(MODEL_DIR / 'output_part3.csv')
]
LABEL_MAPPINGS_PATH = str(MODEL_DIR / 'label_mappings (2).json')
MODEL_PATH = str(MODEL_DIR / 'best_XGBoost.pkl')

# Global state to track system readiness
is_system_ready = False

# Load model and label mappings at startup
model = None
label_mappings = None

# User statistics (in-memory storage)
user_stats = {}

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_model():
    """Load the prediction model"""
    global model
    
    try:
        if not os.path.exists(MODEL_PATH):
            logger.error(f"Model file not found at {MODEL_PATH}")
            print(f"Error: Model file not found at {MODEL_PATH}")
            return False
        
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
            
        print(f"Model loaded successfully: {type(model).__name__}")
        logger.info(f"Model loaded successfully: {type(model).__name__}")
        return True
        
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        print(f"Error loading model: {str(e)}")
        return False

@app.get("/api/status")
async def get_status():
    """Check if the system is ready"""
    try:
        # Check if CSV files exist and are readable
        csv_status = {}
        all_files_exist = True
        for path in CSV_FILE_PATHS:
            exists = os.path.exists(path)
            if not exists:
                all_files_exist = False
            csv_status[os.path.basename(path)] = {
                "exists": exists,
                "size_mb": os.path.getsize(path) / (1024*1024) if exists else 0
            }
        
        # Check if model is loaded
        model_loaded = model is not None
        
        # Check if label mappings are loaded
        mappings_loaded = label_mappings is not None
        
        # System is ready if all components are available
        is_ready = all_files_exist and model_loaded and mappings_loaded
        
        # Update global ready state
        global is_system_ready
        is_system_ready = is_ready
        
        # Include database_ready field for backward compatibility with frontend
        status = {
            "ready": is_ready,
            "database_ready": is_ready,  # For backward compatibility
            "csv_files": csv_status,
            "model_loaded": model_loaded,
            "mappings_loaded": mappings_loaded,
            "details": {
                "model_path": str(MODEL_PATH),
                "csv_dir": str(MODEL_DIR)
            }
        }
        
        logger.info(f"Status check: system ready = {is_ready}")
        return status
        
    except Exception as e:
        logger.error(f"Error checking status: {str(e)}")
        return {
            "ready": False,
            "database_ready": False,
            "error": str(e)
        }

@app.get("/api/debug/system")
async def debug_system():
    """Debug endpoint to check system status"""
    try:
        csv_info = []
        total_size = 0
        
        # Check CSV files
        for path in CSV_FILE_PATHS:
            if os.path.exists(path):
                size_mb = os.path.getsize(path) / (1024*1024)
                total_size += size_mb
                
                # Read first few rows to verify structure
                df = pd.read_csv(path, nrows=5)
                
                csv_info.append({
                    "file": os.path.basename(path),
                    "exists": True,
                    "size_mb": size_mb,
                    "columns": list(df.columns),
                    "sample_rows": len(df)
                })
            else:
                csv_info.append({
                    "file": os.path.basename(path),
                    "exists": False,
                    "error": "File not found"
                })
        
        return {
            "csv_files": csv_info,
            "total_size_mb": total_size,
            "model_loaded": model is not None,
            "model_type": str(type(model)) if model is not None else None,
            "mappings_loaded": label_mappings is not None,
            "mappings_count": len(label_mappings) if label_mappings is not None else 0,
            "system_ready": is_system_ready
        }
        
    except Exception as e:
        logger.error(f"Error in system debug: {str(e)}")
        return {
            "error": str(e)
        }

def get_columns_from_csv():
    """Get columns from reference CSV files"""
    try:
        # Read first CSV file to get columns (they should all match)
        df = pd.read_csv(CSV_FILE_PATHS[0])
        return list(df.columns)
    except Exception as e:
        logger.error(f"Error getting columns: {str(e)}")
        return []

def search_values_in_csv(column: str, query: str, limit: int = 100) -> List[str]:
    """Search for values in CSV files"""
    try:
        unique_values = set()
        for path in CSV_FILE_PATHS:
            df = pd.read_csv(path)
            if column in df.columns:
                # Convert values to strings and find matches
                values = df[column].astype(str).str.strip()
                matches = values[values.str.contains(query, case=False, na=False)]
                unique_values.update(matches.unique())
                
                if len(unique_values) >= limit:
                    break
        
        return list(unique_values)[:limit]
    except Exception as e:
        logger.error(f"Error searching values: {str(e)}")
        return []

@app.get("/api/search/column")
async def search_columns(query: str):
    """Search for columns matching the query"""
    if not is_system_ready:
        raise HTTPException(status_code=503, detail="System is not ready yet. Please wait for initialization.")
    
    try:
        columns = get_columns_from_csv()
        matching_columns = [col for col in columns if query.lower() in col.lower()]
        logger.info(f"Found {len(matching_columns)} matching columns")
        return matching_columns
    except Exception as e:
        logger.error(f"Error searching columns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search/value")
async def search_values(column: str, query: str, limit: int = 100):
    """Search for values in a specific column"""
    if not is_system_ready:
        raise HTTPException(status_code=503, detail="System is not ready yet. Please wait for initialization.")
    
    try:
        results = search_values_in_csv(column, query, limit)
        logger.info(f"Found {len(results)} matching values")
        return results
    except Exception as e:
        logger.error(f"Error searching values: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/column/values")
async def get_column_values_endpoint(
    column: str,
    limit: Optional[int] = 1000
) -> List:
    """Get all unique values in a column"""
    if not is_system_ready:
        raise HTTPException(status_code=503, detail="System is not ready yet. Please wait for initialization.")
    
    try:
        # First verify column exists
        columns = get_columns_from_csv()
        if column not in columns:
            raise HTTPException(status_code=404, detail=f"Column '{column}' not found")
        
        # Get unique values from all CSV files
        unique_values = set()
        for path in CSV_FILE_PATHS:
            df = pd.read_csv(path)
            if column in df.columns:
                values = df[column].astype(str).str.strip()
                unique_values.update(values.unique())
                
                if len(unique_values) >= limit:
                    break
        
        return list(unique_values)[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_or_create_user_stats(user_id: str) -> dict:
    """Get user statistics from Firebase, or create default if not exists"""
    try:
        # Get stats from Firebase
        stats = get_user_stats(user_id)
        logger.info(f"Found stats for user {user_id}: searches={stats.get('searches', 0)}, uploads={stats.get('uploads', 0)}, last_updated={stats.get('last_activity')}")
        return stats
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        # Return default stats if there's an error
        return {
            "searches": 0,
            "uploads": 0,
            "last_activity": None
        }

@app.get("/api/user/stats")
async def get_stats(user_id: str):
    """Get user statistics"""
    try:
        stats = get_or_create_user_stats(user_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/search")
async def record_search(user_id: str):
    """Record a search action for a user"""
    try:
        # Get current stats
        stats = get_or_create_user_stats(user_id)
        
        # Update values
        stats["searches"] += 1
        stats["last_activity"] = pd.Timestamp.now().isoformat()
        
        # Save to Firebase
        success = update_user_stats(user_id, stats)
        
        if success:
            return {"message": "Search recorded successfully"}
        else:
            return {"message": "Failed to record search in Firebase, but processed"}
    except Exception as e:
        logger.error(f"Error recording search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/upload")
async def record_upload(user_id: str):
    """Record an upload action for a user"""
    try:
        # Get current stats
        stats = get_or_create_user_stats(user_id)
        
        # Update values
        stats["uploads"] += 1
        stats["last_activity"] = pd.Timestamp.now().isoformat()
        
        # Save to Firebase
        success = update_user_stats(user_id, stats)
        
        if success:
            return {"message": "Upload recorded successfully"}
        else:
            return {"message": "Failed to record upload in Firebase, but processed"}
    except Exception as e:
        logger.error(f"Error recording upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/prediction-files")
async def get_prediction_files(user_id: str):
    """Get all prediction files for a user"""
    try:
        logger.info(f"Fetching prediction files for user: {user_id}")
        files = get_user_prediction_files(user_id)
        logger.info(f"Found {len(files)} prediction files for user {user_id}")
        return files
    except Exception as e:
        logger.error(f"Error getting prediction files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Load necessary files when the application starts"""
    global is_system_ready, model, label_mappings
    
    print("\n" + "="*50)
    print("Starting application initialization")
    print("="*50)
    
    is_system_ready = False  # Start with system not ready
    logger.info("Beginning system initialization")
    
    try:
        # Step 1: Check if reference CSV files exist
        print("\nStep 1: Checking reference CSV files...")
        logger.info("Checking reference CSV files")
        all_files_exist = True
        total_size = 0
        
        for path in CSV_FILE_PATHS:
            if os.path.exists(path):
                size_mb = os.path.getsize(path) / (1024*1024)
                total_size += size_mb
                print(f"Found: {os.path.basename(path)} ({size_mb:.1f} MB)")
                logger.info(f"Found: {os.path.basename(path)} ({size_mb:.1f} MB)")
            else:
                print(f"Missing: {path}")
                logger.error(f"Missing reference CSV file: {path}")
                all_files_exist = False
        
        if not all_files_exist:
            print("\nError: Some reference CSV files are missing")
            logger.error("Some reference CSV files are missing, system not ready")
            is_system_ready = False
            return
        
        print(f"\nTotal size of CSV files: {total_size:.1f} MB")
        logger.info(f"Total size of CSV files: {total_size:.1f} MB")
        
        # Step 2: Load model
        print("\nStep 2: Loading model...")
        logger.info("Loading model")
        if not load_model():
            print("Failed to load model")
            logger.error("Failed to load model, system not ready")
            is_system_ready = False
            return
        
        # Step 3: Load label mappings
        print("\nStep 3: Loading label mappings...")
        logger.info("Loading label mappings")
        if not os.path.exists(LABEL_MAPPINGS_PATH):
            print(f"Error: Label mappings file not found at {LABEL_MAPPINGS_PATH}")
            logger.error(f"Label mappings file not found at {LABEL_MAPPINGS_PATH}")
            is_system_ready = False
            return
            
        try:
            with open(LABEL_MAPPINGS_PATH, 'r') as f:
                label_mappings = json.load(f)
            print(f"Label mappings loaded successfully. Found {len(label_mappings)} mappings")
            logger.info(f"Label mappings loaded successfully. Found {len(label_mappings)} mappings")
        except Exception as e:
            print(f"Error loading label mappings: {str(e)}")
            logger.error(f"Error loading label mappings: {str(e)}")
            is_system_ready = False
            return
        
        # Step 4: Verify CSV files can be loaded
        print("\nStep 4: Verifying CSV files can be loaded...")
        logger.info("Verifying CSV files can be loaded")
        try:
            # Try to load and validate structure of CSV files
            required_columns = None
            for path in CSV_FILE_PATHS:
                df = pd.read_csv(path)
                if required_columns is None:
                    required_columns = list(df.columns)
                elif list(df.columns) != required_columns:
                    print(f"Error: Column mismatch in {path}")
                    logger.error(f"Column mismatch in {path}")
                    is_system_ready = False
                    return
                print(f"Verified structure of: {os.path.basename(path)}")
                logger.info(f"Verified structure of: {os.path.basename(path)}")
            print(f"All CSV files have matching columns: {len(required_columns)} columns found")
            logger.info(f"All CSV files have matching columns: {len(required_columns)} columns found")
        except Exception as e:
            print(f"Error verifying CSV files: {str(e)}")
            logger.error(f"Error verifying CSV files: {str(e)}")
            is_system_ready = False
            return
        
        # All checks passed
        is_system_ready = True
        print("\nAll initialization checks passed")
        logger.info("All initialization checks passed - SYSTEM IS READY")
        
    except Exception as e:
        print(f"Error during startup: {str(e)}")
        logger.error(f"Error during startup: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        is_system_ready = False
        return
    
    print("\n" + "="*50)
    print("Application initialization complete")
    print(f"System ready: {is_system_ready}")
    logger.info(f"Application initialization complete. System ready: {is_system_ready}")
    print("="*50 + "\n")

@app.post("/api/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    user_id: Optional[str] = None
):
    """
    Upload a CSV file, validate it, make predictions and return results
    """
    try:
        logger.info(f"Received CSV upload from user_id: {user_id}")
        
        # Check if system is ready
        if not is_system_ready:
            logger.error("System not ready, rejecting CSV upload")
            return JSONResponse(
                status_code=503,
                content={
                    "error": "System not ready. Please wait for initialization to complete."
                }
            )
        
        # Step 1: Read the uploaded file into a DataFrame
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents))
            logger.info(f"Successfully read CSV with shape: {df.shape}")
        except Exception as e:
            logger.error(f"Error reading CSV: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Invalid CSV file format",
                    "details": str(e)
                }
            )
        
        # Step 2: Validate the CSV
        try:
            logger.info("Starting CSV validation...")
            validation_result = validate_csv(df)
            
            # Debug validation result
            logger.info(f"Validation result type: {type(validation_result)}")
            logger.info(f"Validation result keys: {list(validation_result.keys())}")
            logger.info(f"Full validation result: {validation_result}")
            
            # Very defensive approach to handle any key naming issues
            is_valid = False
            errors = []
            warnings = []
            
            if 'valid' in validation_result:
                is_valid = validation_result['valid']
            elif 'is_valid' in validation_result:
                is_valid = validation_result['is_valid']
            elif 'Valid' in validation_result:
                is_valid = validation_result['Valid']
            else:
                logger.error("No validity flag found in validation result")
                
            if 'errors' in validation_result:
                errors = validation_result['errors']
            elif 'Errors' in validation_result:
                errors = validation_result['Errors']
            else:
                logger.warning("No errors key found in validation result")
            
            if 'warnings' in validation_result:
                warnings = validation_result['warnings']
                
            logger.info(f"Extracted validation values - is_valid: {is_valid}, errors: {errors}, warnings: {warnings}")
            
            if not is_valid:
                logger.error(f"CSV validation failed: {errors}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "CSV validation failed",
                        "details": errors
                    }
                )
            logger.info("CSV validation successful")
        except Exception as e:
            logger.error(f"Error during validation: {str(e)}")
            import traceback
            logger.error(f"Validation error traceback: {traceback.format_exc()}")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Error during CSV validation",
                    "details": str(e)
                }
            )
        
        # Step 3: Make predictions
        try:
            logger.info("Making predictions...")
            # Keep a copy of original data before encoding
            original_df = df.copy()
            
            # Check if there's already an ID column in the input
            has_id_column = "ID" in original_df.columns
            logger.info(f"Input CSV has ID column: {has_id_column}")
            
            # Create a copy for model input, excluding the ID column if it exists
            model_input_df = df.copy()
            if has_id_column:
                # Store the original ID column temporarily
                original_ids = original_df["ID"].copy()
                # Remove ID column from data going to the model
                model_input_df = model_input_df.drop(columns=["ID"])
                logger.info("Preserved original ID column and removed it from model input")
            
            try:
                # Get predictions and confidence scores
                predictions, confidence_scores = predict(model_input_df, model, label_mappings)
                logger.info(f"Predictions made successfully, count: {len(predictions)}")
                logger.info(f"Confidence scores received, count: {len(confidence_scores)}")
                logger.info(f"Confidence scores type: {type(confidence_scores)}")
                logger.info(f"First few confidence values: {confidence_scores[:5]}")
            except AttributeError as attr_err:
                # Handle the case where predict_proba is not supported
                logger.error(f"Model confidence error: {str(attr_err)}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Model does not support confidence scores",
                        "details": str(attr_err)
                    }
                )
            except Exception as e:
                logger.error(f"Error during prediction: {str(e)}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "Model prediction error",
                        "details": str(e)
                    }
                )
            
            # Create a results DataFrame with original values and enhanced prediction data
            results_df = original_df.copy()
            
            # Add ID column if it doesn't exist
            if not has_id_column:
                results_df.insert(0, "ID", range(1, len(results_df) + 1))
                logger.info("Added sequential ID column to results")
            
            # Add prediction column
            results_df["prediction"] = predictions
            logger.info(f"Added prediction column to results dataframe")
            
            # Add confidence column (rounded to 4 decimal places)
            results_df["confidence"] = [round(float(score), 4) for score in confidence_scores]
            logger.info(f"Added confidence scores to results dataframe")
            logger.info(f"First few rows with confidence: {results_df[['prediction', 'confidence']].head(3).to_dict()}")
            
            # Add timestamp column
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            results_df["timestamp"] = current_time
            
            logger.info(f"Enhanced results dataframe with ID, prediction, confidence and timestamp, shape: {results_df.shape}")
            
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            import traceback
            logger.error(f"Prediction error traceback: {traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Error making predictions",
                    "details": str(e)
                }
            )
        
        # Step 4: Record the upload for the user if provided
        if user_id:
            try:
                # Update user stats for this upload
                stats = get_or_create_user_stats(user_id)
                stats["uploads"] += 1
                stats["last_activity"] = pd.Timestamp.now().isoformat()
                logger.info(f"Recorded upload for user_id: {user_id}")
                
                # Save updated stats to Firebase
                update_success = update_user_stats(user_id, stats)
                if not update_success:
                    logger.warning("Failed to update user stats in Firebase")
                
                # Store prediction file information in Firebase
                file_info = {
                    "filename": file.filename,
                    "rows": len(results_df),
                    "columns": len(results_df.columns),
                    "upload_number": stats["uploads"]
                }
                
                store_success = store_prediction_file(user_id, file_info)
                if not store_success:
                    logger.warning("Failed to store prediction file information in Firebase")
                    
            except Exception as e:
                logger.warning(f"Failed to record upload for user: {str(e)}")
                # Continue even if recording fails
        
        # Step 5: Return the results as a CSV file
        try:
            # Log final DataFrame info before export
            logger.info(f"Final DataFrame columns before CSV export: {list(results_df.columns)}")
            
            # Verify confidence values are present
            logger.info(f"Sample confidence values: {results_df['confidence'].head(3).tolist()}")
            
            # Create string buffer for CSV
            output = io.StringIO()
            
            # Log the first few rows of the dataframe to check data
            logger.info(f"First few rows of results dataframe before CSV conversion:")
            for idx, row in results_df.head(3).iterrows():
                logger.info(f"Row {idx}: {dict(row)}")
            
            # Ensure ID, prediction, and confidence are at the beginning for visibility
            all_columns = list(results_df.columns)
            ordered_columns = []
            for col in ["ID", "prediction", "confidence"]:
                if col in all_columns:
                    ordered_columns.append(col)
                    all_columns.remove(col)
            
            # Add remaining columns
            ordered_columns.extend(all_columns)
            logger.info(f"Columns being written to CSV (in order): {ordered_columns}")
            
            # Write to CSV with explicit column order
            results_df.to_csv(output, index=False, columns=ordered_columns)
            
            # Preview the CSV content
            csv_content = output.getvalue()
            logger.info(f"CSV content sample (first 500 chars): {csv_content[:500]}")
            
            # Double-check that confidence appears in the header
            header = csv_content.split('\n')[0] if '\n' in csv_content else csv_content
            logger.info(f"CSV header: {header}")
            if "confidence" not in header:
                logger.error("Confidence column not found in CSV header!")
            
            logger.info("Created response CSV file successfully")
            
            filename = f"predictions_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
            
        except Exception as e:
            logger.error(f"Error creating response file: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Error creating response file",
                    "details": str(e)
                }
            )
        
    except Exception as e:
        logger.error(f"Error processing CSV: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error processing CSV file",
                "details": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 