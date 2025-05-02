import os
import json
import requests
import logging
from datetime import datetime
from typing import Dict, Any, Optional

# Set up logging
logger = logging.getLogger(__name__)

# Firebase project settings
FIREBASE_PROJECT_ID = "graduation-project-ddfad"
FIREBASE_API_KEY = "AIzaSyCUZwySdJn8PRxX-dWj_O7pp0K11ZVKyEU"

# Base URL for Firebase Firestore API
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"

def update_user_stats(user_id: str, stats: Dict[str, Any]) -> bool:
    """
    Update user statistics in Firebase Firestore
    
    Args:
        user_id: User ID
        stats: Dictionary with stats to update
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        url = f"{FIRESTORE_BASE_URL}/users/{user_id}"
        
        # Format the data for Firestore
        fields = {}
        for key, value in stats.items():
            if key == "searches":
                fields[key] = {"integerValue": value}
            elif key == "uploads":
                fields[key] = {"integerValue": value}
            elif key == "last_activity":
                fields[key] = {"stringValue": value}
            else:
                # Handle other types as needed
                if isinstance(value, int):
                    fields[key] = {"integerValue": value}
                elif isinstance(value, float):
                    fields[key] = {"doubleValue": value}
                elif isinstance(value, bool):
                    fields[key] = {"booleanValue": value}
                else:
                    fields[key] = {"stringValue": str(value)}
        
        data = {"fields": fields}
        
        # Use PATCH to update if document exists, or create if it doesn't
        response = requests.patch(
            url,
            params={"updateMask.fieldPaths": list(stats.keys()), "key": FIREBASE_API_KEY},
            json=data
        )
        
        if response.status_code in (200, 201):
            logger.info(f"Successfully updated stats for user {user_id}")
            return True
        else:
            # If PATCH fails (document doesn't exist), try to create it
            if response.status_code == 404:
                logger.info(f"User document not found, creating new document for {user_id}")
                response = requests.post(
                    f"{FIRESTORE_BASE_URL}/users",
                    params={"documentId": user_id, "key": FIREBASE_API_KEY},
                    json=data
                )
                
                if response.status_code in (200, 201):
                    logger.info(f"Successfully created stats for user {user_id}")
                    return True
            
            logger.error(f"Failed to update user stats: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error updating user stats in Firebase: {str(e)}")
        return False

def get_user_stats(user_id: str) -> Dict[str, Any]:
    """
    Get user statistics from Firebase Firestore
    
    Args:
        user_id: User ID
    
    Returns:
        Dict with user stats or empty dict if not found
    """
    try:
        url = f"{FIRESTORE_BASE_URL}/users/{user_id}"
        response = requests.get(url, params={"key": FIREBASE_API_KEY})
        
        if response.status_code == 200:
            data = response.json()
            
            # Convert from Firestore format to regular dict
            result = {}
            for key, value_obj in data.get("fields", {}).items():
                # Extract the actual value based on its type
                value_type = list(value_obj.keys())[0]  # e.g., "integerValue"
                result[key] = value_obj[value_type]
                
                # Convert numeric types back to their proper type
                if value_type == "integerValue":
                    result[key] = int(result[key])
                elif value_type == "doubleValue":
                    result[key] = float(result[key])
                elif value_type == "booleanValue":
                    result[key] = bool(result[key])
            
            return result
        else:
            logger.warning(f"User stats not found for {user_id}, returning default")
            # Return default stats if document not found
            return {
                "searches": 0,
                "uploads": 0,
                "last_activity": None
            }
            
    except Exception as e:
        logger.error(f"Error getting user stats from Firebase: {str(e)}")
        return {
            "searches": 0,
            "uploads": 0,
            "last_activity": None
        }

def store_prediction_file(user_id: str, file_info: Dict[str, Any]) -> bool:
    """
    Store information about a prediction file in Firebase
    
    Args:
        user_id: User ID
        file_info: Dictionary with file information
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Generate a unique ID for this prediction file entry
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        doc_id = f"{user_id}_{timestamp}"
        
        url = f"{FIRESTORE_BASE_URL}/predictionFiles"
        
        # Format the data for Firestore
        fields = {
            "user_id": {"stringValue": user_id},
            "timestamp": {"stringValue": datetime.now().isoformat()},
            "filename": {"stringValue": file_info.get("filename", "unknown.csv")},
            "rows": {"integerValue": file_info.get("rows", 0)},
            "columns": {"integerValue": file_info.get("columns", 0)},
            "upload_number": {"integerValue": file_info.get("upload_number", 0)}
        }
        
        data = {"fields": fields}
        
        # Create a new document
        response = requests.post(
            url,
            params={"documentId": doc_id, "key": FIREBASE_API_KEY},
            json=data
        )
        
        if response.status_code in (200, 201):
            logger.info(f"Successfully stored prediction file info for user {user_id}")
            return True
        else:
            logger.error(f"Failed to store prediction file info: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error storing prediction file info in Firebase: {str(e)}")
        return False

def get_user_prediction_files(user_id: str) -> list:
    """
    Get all prediction files for a user from Firebase
    
    Args:
        user_id: User ID
    
    Returns:
        List of prediction file info
    """
    try:
        logger.info(f"Getting prediction files for user: {user_id}")
        
        # For testing: If there are issues with Firebase, uncomment to return test data
        # return [
        #     {
        #         "filename": "test_file.csv",
        #         "timestamp": datetime.now().isoformat(),
        #         "rows": 42,
        #         "columns": 15,
        #         "upload_number": 1
        #     }
        # ]
        
        # Create a structured query to find all prediction files for this user
        url = f"{FIRESTORE_BASE_URL}:runQuery"
        logger.info(f"Using Firebase URL: {url}")
        
        query = {
            "structuredQuery": {
                "from": [{"collectionId": "predictionFiles"}],
                "where": {
                    "fieldFilter": {
                        "field": {"fieldPath": "user_id"},
                        "op": "EQUAL",
                        "value": {"stringValue": user_id}
                    }
                },
                "orderBy": [
                    {"field": {"fieldPath": "timestamp"}, "direction": "DESCENDING"}
                ]
            }
        }
        
        logger.info(f"Sending query to Firebase: {query}")
        response = requests.post(url, params={"key": FIREBASE_API_KEY}, json=query)
        logger.info(f"Firebase response status: {response.status_code}")
        
        if response.status_code == 200:
            logger.info(f"Firebase response data: {response.text[:200]}...")
            data = response.json()
            
            # If the response is empty or doesn't contain documents, return empty list
            if not data or all(("document" not in doc) for doc in data):
                logger.info(f"No prediction files found for user {user_id}")
                return []
            
            result = []
            for doc in data:
                if "document" in doc:
                    fields = doc["document"].get("fields", {})
                    
                    # Convert from Firestore format to regular dict
                    file_info = {}
                    for key, value_obj in fields.items():
                        # Extract the actual value based on its type
                        value_type = list(value_obj.keys())[0]
                        file_info[key] = value_obj[value_type]
                        
                        # Convert numeric types back to their proper type
                        if value_type == "integerValue":
                            file_info[key] = int(file_info[key])
                        elif value_type == "doubleValue":
                            file_info[key] = float(file_info[key])
                    
                    result.append(file_info)
            
            logger.info(f"Found {len(result)} prediction files for user {user_id}")
            return result
        else:
            logger.error(f"Failed to query prediction files: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        logger.error(f"Error getting prediction files from Firebase: {str(e)}")
        # Print traceback for debugging
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return [] 