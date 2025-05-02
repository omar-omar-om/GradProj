from database import load_csv_to_db
import os

def initialize_database():
    # Define paths to the three CSV files
    csv_paths = [
        os.path.join("..", "model-part2", "output_part1.csv"),
        os.path.join("..", "model-part2", "output_part2.csv"),
        os.path.join("..", "model-part2", "output_part3.csv")
    ]
    
    all_files_exist = all(os.path.exists(path) for path in csv_paths)
    if all_files_exist:
        print("Loading CSV files into database...")
        success = True
        for path in csv_paths:
            print(f"Loading {path}...")
            if not load_csv_to_db(path):
                success = False
                print(f"Failed to load {path}")
                break
        
        if success:
            print("Database initialized successfully!")
        else:
            print("Failed to initialize database.")
    else:
        print("One or more CSV files not found:")
        for path in csv_paths:
            if not os.path.exists(path):
                print(f"- {path}")

if __name__ == "__main__":
    initialize_database() 