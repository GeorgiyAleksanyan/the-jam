# API Mashup Mixer Solution
# Implement your solution here

"""
Usage: python mashup.py request.json
Outputs: briefing.json, briefing.md
"""

import sys
import json

API_BASE = "http://localhost:8080"

def fetch_weather(city: str) -> dict:
    """Fetch weather data for a city."""
    # TODO: Implement with error handling
    pass

def fetch_news(topic: str, limit: int = 5) -> list:
    """Fetch news headlines for a topic."""
    # TODO: Implement with error handling
    pass

def fetch_quote(category: str) -> dict:
    """Fetch a quote by category."""
    # TODO: Implement with error handling
    pass

def generate_synthesis(weather: dict, headlines: list, quote: dict) -> str:
    """Generate a creative synthesis paragraph."""
    # TODO: Implement creative synthesis
    pass

def main(request_path: str):
    """Main entry point."""
    # Read request
    with open(request_path) as f:
        request = json.load(f)
    
    errors = []
    
    # TODO: Fetch all data with error handling
    # TODO: Generate synthesis
    # TODO: Write briefing.json
    # TODO: Write briefing.md

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python mashup.py request.json")
        sys.exit(1)
    
    main(sys.argv[1])
