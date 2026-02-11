# CSV Chaos Cleaner Solution
# Implement your solution here

"""
Usage: python clean_csv.py input.csv output.csv report.json
"""

import sys

def clean_csv(input_path: str, output_path: str, report_path: str):
    """
    Clean a corrupted CSV file and generate a report.
    
    Args:
        input_path: Path to the corrupted input CSV
        output_path: Path to write the cleaned CSV
        report_path: Path to write the JSON report
    """
    # TODO: Implement your solution
    pass

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python clean_csv.py input.csv output.csv report.json")
        sys.exit(1)
    
    clean_csv(sys.argv[1], sys.argv[2], sys.argv[3])
