#!/usr/bin/env python3
"""
CSV Chaos Cleaner - Test Data Generator
Generates corrupted CSV files for testing agent solutions.
"""

import csv
import random
import string
from datetime import datetime, timedelta
import json

def generate_corrupted_csv(output_path: str, rows: int = 100, seed: int = None):
    """Generate a corrupted CSV file with various data quality issues."""
    if seed:
        random.seed(seed)
    
    # Define columns
    columns = ['id', 'first_name', 'last_name', 'email', 'signup_date', 'balance', 'is_active', 'country']
    
    # Corruption options
    delimiters = [',', ';', '\t', ',']  # weighted toward comma
    encodings_to_simulate = ['utf-8', 'latin-1', 'utf-8', 'utf-8']  # weighted toward utf-8
    
    # Generate data
    data = []
    
    # Corrupt headers
    header_corruptions = [
        columns,  # normal
        [c.upper() for c in columns],  # uppercase
        [c.replace('_', ' ').title() for c in columns],  # Title Case with spaces
        ['ID', 'FirstName', 'LastName', 'Email', 'SignupDate', 'Balance', 'IsActive', 'Country'],  # CamelCase
    ]
    headers = random.choice(header_corruptions)
    
    first_names = ['John', 'Jane', 'María', 'François', 'Müller', '山田', 'Олег', 'محمد']
    last_names = ['Smith', 'Doe', 'García', 'Müller', 'Tanaka', 'Иванов', 'علي', "O'Brien"]
    countries = ['USA', 'UK', 'Germany', 'Japan', 'France', 'Russia', 'Brazil', 'NULL', 'N/A', '']
    
    for i in range(rows):
        row = {
            'id': i + 1,
            'first_name': random.choice(first_names),
            'last_name': random.choice(last_names),
            'email': f"user{i}@example.com",
            'signup_date': (datetime.now() - timedelta(days=random.randint(0, 365))).strftime(
                random.choice(['%Y-%m-%d', '%m/%d/%Y', '%d.%m.%Y', '%Y/%m/%d'])
            ),
            'balance': str(random.uniform(0, 10000)).replace('.', random.choice(['.', ','])),
            'is_active': random.choice(['true', 'True', 'TRUE', '1', 'yes', 'Yes', 'false', 'False', '0', 'no']),
            'country': random.choice(countries),
        }
        
        # Add whitespace corruption
        if random.random() < 0.2:
            row['first_name'] = '  ' + row['first_name'] + '  '
        
        # Add empty rows
        if random.random() < 0.05:
            data.append({k: '' for k in row.keys()})
        
        data.append(row)
        
        # Add duplicates
        if random.random() < 0.05:
            data.append(row.copy())
    
    # Shuffle to mix duplicates/empties
    random.shuffle(data)
    
    # Write with random delimiter
    delimiter = random.choice(delimiters)
    
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        # Sometimes skip header
        if random.random() > 0.1:
            f.write(delimiter.join(headers) + '\n')
        
        for row in data:
            values = [str(row.get(c.lower().replace(' ', '_'), '')) for c in columns]
            f.write(delimiter.join(values) + '\n')
    
    # Generate expected output
    expected = {
        'original_rows': len(data) + (1 if random.random() > 0.1 else 0),  # +1 for header
        'unique_data_rows': len(set(tuple(d.items()) for d in data if any(d.values()))),
    }
    
    return expected

def generate_expected_output(input_data: list, output_path: str):
    """Generate the expected clean output."""
    # Remove empty and duplicate rows
    seen = set()
    clean_data = []
    
    for row in input_data:
        if not any(row.values()):
            continue
        row_tuple = tuple(sorted(row.items()))
        if row_tuple in seen:
            continue
        seen.add(row_tuple)
        
        # Clean the row
        clean_row = {}
        for k, v in row.items():
            # Normalize key
            clean_key = k.lower().replace(' ', '_')
            # Clean value
            clean_val = str(v).strip()
            if clean_val.upper() in ('NULL', 'N/A', 'NA', 'NONE'):
                clean_val = ''
            clean_row[clean_key] = clean_val
        
        clean_data.append(clean_row)
    
    return clean_data

if __name__ == '__main__':
    import sys
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'input.csv'
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else None
    result = generate_corrupted_csv(output_file, rows=100, seed=seed)
    print(json.dumps(result, indent=2))
