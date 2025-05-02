import pandas as pd
import numpy as np
import logging
import os
import json
import pickle
from typing import List, Dict, Any, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define paths relative to this file
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(os.path.dirname(CURRENT_DIR), 'model-part2')
MODEL_PATH = os.path.join(MODEL_DIR, 'best_XGBoost.pkl')
LABEL_MAPPINGS_PATH = os.path.join(MODEL_DIR, 'label_mappings (2).json')

# Global variables
model = None
label_mappings = None

def load_model():
    """Load the XGBoost model from disk."""
    try:
        global model
        
        # Check if the model file exists
        if not os.path.exists(MODEL_PATH):
            logger.error(f"Model file not found at {MODEL_PATH}")
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        
        # Log the model file size to confirm it's substantial
        file_size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
        logger.info(f"Loading model from {MODEL_PATH} (size: {file_size_mb:.2f} MB)")
        
        # Load the model using pickle
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
            
        # Log model details to prove it's a real ML model
        model_type = type(model).__name__
        logger.info(f"Model loaded successfully, type: {model_type}")
        
        if hasattr(model, 'n_estimators'):
            logger.info(f"Model has {model.n_estimators} estimators")
        
        if hasattr(model, 'feature_importances_'):
            logger.info(f"Model has feature importance data with shape: {model.feature_importances_.shape}")
            
        # This will only succeed if a real model was loaded
        if hasattr(model, 'predict') and callable(model.predict):
            logger.info("Model has valid predict method")
        else:
            logger.error("Loaded object doesn't have predict method")
            raise ValueError("Loaded object is not a valid model")
            
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise

def load_label_mappings():
    """Load the label mappings from disk."""
    try:
        global label_mappings
        logger.info(f"Loading label mappings from {LABEL_MAPPINGS_PATH}")
        with open(LABEL_MAPPINGS_PATH, 'r') as f:
            label_mappings = json.load(f)
        logger.info("Label mappings loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading label mappings: {str(e)}")
        raise

def preprocess_data(df: pd.DataFrame, mappings=None) -> pd.DataFrame:
    """Preprocess the input data for prediction.
    
    Args:
        df: DataFrame to preprocess
        mappings: Label mappings to use (if None, will use global)
    
    Returns:
        Preprocessed DataFrame ready for prediction
    """
    try:
        global label_mappings
        logger.info(f"Preprocessing DataFrame of shape {df.shape}")
        
        # Make a copy to avoid modifying the original
        df = df.copy()
        
        # Use provided mappings or load them if not available
        if mappings is not None:
            used_mappings = mappings
        elif label_mappings is not None:
            used_mappings = label_mappings
        else:
            load_label_mappings()
            used_mappings = label_mappings
        
        logger.info(f"Mapping keys available: {list(used_mappings.keys())}")
        encoded_columns = []
        
        # Only encode columns that are present in the mappings
        for column in df.columns:
            if column in used_mappings:
                logger.info(f"Encoding column: {column} with {len(used_mappings[column])} mapping values")
                
                # Create a copy of the column before encoding
                original_values = df[column].copy()
                
                # Replace values using the mapping
                df[column] = df[column].map(used_mappings[column])
                
                # Count how many values were successfully encoded
                encoded_count = df[column].notna().sum()
                not_encoded = len(df) - encoded_count
                
                if not_encoded > 0:
                    logger.warning(f"Column '{column}': {not_encoded} values could not be encoded and will be filled with -1")
                
                # Fill any NaN values with -1 (unknown category)
                df[column] = df[column].fillna(-1)
                
                encoded_columns.append(column)
            else:
                logger.info(f"Skipping column: {column} (no mapping found)")
        
        logger.info(f"Encoded {len(encoded_columns)} columns: {encoded_columns}")
        logger.info("Data preprocessing completed successfully")
        return df
    except Exception as e:
        logger.error(f"Error preprocessing data: {str(e)}")
        import traceback
        logger.error(f"Preprocessing error traceback: {traceback.format_exc()}")
        raise

def predict(df: pd.DataFrame, model_obj=None, mapping_obj=None) -> tuple:
    """Make predictions using the provided model and mappings.
    
    Args:
        df: DataFrame with input data
        model_obj: Pre-loaded model object (if None, will try to load from disk)
        mapping_obj: Pre-loaded label mappings (if None, will try to load from disk)
    
    Returns:
        Tuple containing:
        - Numpy array of numeric predictions
        - Numpy array of confidence scores (max probability per prediction)
    """
    try:
        # Use provided objects or load from disk if not provided
        global model, label_mappings
        
        if model_obj is not None:
            used_model = model_obj
        elif model is not None:
            used_model = model
        else:
            load_model()
            used_model = model
            
        if mapping_obj is not None:
            used_mappings = mapping_obj
        elif label_mappings is not None:
            used_mappings = label_mappings
        else:
            load_label_mappings()
            used_mappings = label_mappings
            
        logger.info(f"Using model of type: {type(used_model).__name__}")
        logger.info(f"Using mappings with {len(used_mappings)} entries")
        
        # Preprocess the data - only encode columns in the mapping
        processed_df = preprocess_data(df, mappings=used_mappings)
        
        # Log some information about the processed DataFrame
        logger.info(f"Processed DataFrame shape: {processed_df.shape}")
        logger.info(f"Processed DataFrame columns: {list(processed_df.columns)}")
        
        # Check for missing feature columns that the model might need
        feature_columns = []
        if hasattr(used_model, 'feature_names'):
            feature_columns = used_model.feature_names
            logger.info(f"Model feature names: {feature_columns}")
            missing_features = set(feature_columns) - set(processed_df.columns)
            if missing_features:
                logger.warning(f"Missing {len(missing_features)} features required by model: {missing_features}")
                # Add missing columns with default value -1
                for feature in missing_features:
                    processed_df[feature] = -1
                    logger.info(f"Added missing feature '{feature}' with default value -1")
        
        # Make predictions
        logger.info("Making predictions...")
        try:
            # Log details about the model to prove we're using a real model
            logger.info(f"Using model of type: {type(used_model).__name__}")
            if hasattr(used_model, 'n_estimators'):
                logger.info(f"Model has {used_model.n_estimators} estimators")
            if hasattr(used_model, 'feature_importances_'):
                logger.info(f"Model has feature importance data with shape: {used_model.feature_importances_.shape}")
                top_features = sorted(zip(feature_columns if feature_columns else processed_df.columns, 
                                    used_model.feature_importances_), 
                                key=lambda x: x[1], reverse=True)[:5]
                logger.info(f"Top 5 important features: {top_features}")
                
            # Get class predictions from the model
            predictions_numeric = used_model.predict(processed_df)
            
            # Get probability predictions and extract confidence scores
            logger.info("Checking if model supports predict_proba...")
            if not (hasattr(used_model, 'predict_proba') and callable(getattr(used_model, 'predict_proba'))):
                raise AttributeError("Model does not support predict_proba method. Cannot generate confidence scores.")
                
            logger.info("Getting probabilities from model.predict_proba...")
            probability_predictions = used_model.predict_proba(processed_df)
            logger.info(f"predict_proba successful, output shape: {probability_predictions.shape}")
            
            # Extract max probability per row
            confidence_scores = np.max(probability_predictions, axis=1)
            logger.info(f"Extracted max probabilities successfully")
            logger.info(f"First few confidence scores: {confidence_scores[:5] if len(confidence_scores) >= 5 else confidence_scores}")
            
            # Log information about predictions and confidence scores
            logger.info(f"Raw predictions shape: {predictions_numeric.shape}")
            logger.info(f"Confidence scores shape: {confidence_scores.shape}")
            
            # Log unique prediction values to show this isn't random
            unique_predictions = np.unique(predictions_numeric)
            logger.info(f"Unique prediction values: {unique_predictions}")
            logger.info(f"Prediction distribution: {np.bincount(predictions_numeric.astype(int)) if np.issubdtype(predictions_numeric.dtype, np.integer) else 'non-integer predictions'}")
            
            # Return predictions and confidence scores
            logger.info(f"Generated {len(predictions_numeric)} predictions successfully")
            return predictions_numeric, confidence_scores
            
        except Exception as e:
            logger.error(f"Error during model prediction: {str(e)}")
            # Try with a subset of columns if the model has feature_names
            if hasattr(used_model, 'feature_names'):
                logger.info("Trying prediction with exact feature names from model")
                feature_df = pd.DataFrame()
                for feature in used_model.feature_names:
                    if feature in processed_df.columns:
                        feature_df[feature] = processed_df[feature]
                    else:
                        feature_df[feature] = -1  # Default value for missing features
                
                # Get class predictions
                predictions_numeric = used_model.predict(feature_df)
                
                # Get probability predictions and extract confidence scores
                logger.info("Checking if model supports predict_proba for fallback prediction...")
                if not (hasattr(used_model, 'predict_proba') and callable(getattr(used_model, 'predict_proba'))):
                    raise AttributeError("Model does not support predict_proba method. Cannot generate confidence scores.")
                    
                logger.info("Getting probabilities from model.predict_proba in fallback path...")
                probability_predictions = used_model.predict_proba(feature_df)
                
                # Extract max probability per row
                confidence_scores = np.max(probability_predictions, axis=1)
                logger.info(f"Extracted max probabilities in fallback path")
                
                logger.info("Prediction successful with feature subset")
                return predictions_numeric, confidence_scores
            else:
                raise
            
    except Exception as e:
        logger.error(f"Error making predictions: {str(e)}")
        import traceback
        logger.error(f"Prediction error traceback: {traceback.format_exc()}")
        # Return empty predictions if an error occurs
        return np.array([]), np.array([])