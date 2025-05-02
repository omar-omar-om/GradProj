from sheets_service import create_user_sheet, append_predictions
import pandas as pd
import numpy as np

def test_sheets_integration():
    """Test the Google Sheets integration"""
    try:
        # Test user data
        user_id = "test_user_123"
        
        # Create a new sheet for the user
        print("Creating new sheet...")
        spreadsheet_id = create_user_sheet(user_id)
        print(f"Created sheet with ID: {spreadsheet_id}")
        
        # Create test data
        test_data = pd.DataFrame({
            'ID': range(1, 6),
            'Prediction': ['Class A', 'Class B', 'Class A', 'Class C', 'Class B'],
            'Confidence': [95.5, 88.2, 92.1, 85.7, 90.3],
            'Timestamp': pd.Timestamp.now()
        })
        
        # Test adding predictions
        print("\nAdding test predictions...")
        append_predictions(spreadsheet_id, test_data)
        print("Successfully added predictions!")
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")

if __name__ == "__main__":
    test_sheets_integration() 