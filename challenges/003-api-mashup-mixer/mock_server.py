#!/usr/bin/env python3
"""
API Mashup Mixer - Mock API Server
Simulates Weather, News, and Quotes APIs for testing.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import random
import time
import urllib.parse
import argparse

# Mock data
WEATHER_DATA = {
    "tokyo": {"temperature_c": 12, "condition": "Partly Cloudy", "humidity": 65},
    "new york": {"temperature_c": 5, "condition": "Snowy", "humidity": 80},
    "london": {"temperature_c": 8, "condition": "Rainy", "humidity": 90},
    "sydney": {"temperature_c": 28, "condition": "Sunny", "humidity": 45},
    "paris": {"temperature_c": 10, "condition": "Overcast", "humidity": 75},
}

NEWS_DATA = {
    "technology": [
        {"title": "AI Agents Transform Software Development", "source": "TechDaily", "url": "https://example.com/1"},
        {"title": "New Quantum Computing Breakthrough", "source": "ScienceNews", "url": "https://example.com/2"},
        {"title": "Crypto Markets See Record Volumes", "source": "CryptoWatch", "url": "https://example.com/3"},
        {"title": "Major Cloud Provider Announces Price Cuts", "source": "CloudBeat", "url": "https://example.com/4"},
        {"title": "Open Source Project Reaches 100K Stars", "source": "DevNews", "url": "https://example.com/5"},
    ],
    "business": [
        {"title": "Markets Rally on Economic Data", "source": "FinanceDaily", "url": "https://example.com/6"},
        {"title": "Startup Raises $500M Series D", "source": "VentureNews", "url": "https://example.com/7"},
        {"title": "Major Merger Announced", "source": "BusinessWeek", "url": "https://example.com/8"},
    ],
    "sports": [
        {"title": "Championship Finals Set for Weekend", "source": "SportsNet", "url": "https://example.com/9"},
        {"title": "Star Player Signs Record Contract", "source": "AthleticNews", "url": "https://example.com/10"},
    ],
}

QUOTES_DATA = {
    "motivation": [
        {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
        {"text": "Innovation distinguishes between a leader and a follower.", "author": "Steve Jobs"},
        {"text": "Stay hungry, stay foolish.", "author": "Steve Jobs"},
    ],
    "wisdom": [
        {"text": "The unexamined life is not worth living.", "author": "Socrates"},
        {"text": "I think, therefore I am.", "author": "René Descartes"},
    ],
    "humor": [
        {"text": "I'm not superstitious, but I am a little stitious.", "author": "Michael Scott"},
    ],
}


class MockAPIHandler(BaseHTTPRequestHandler):
    mode = "happy"  # happy, chaos, or rate_limit
    request_count = 0
    
    def log_message(self, format, *args):
        pass  # Suppress logging
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_GET(self):
        MockAPIHandler.request_count += 1
        
        # Parse URL
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)
        
        # Chaos mode effects
        if MockAPIHandler.mode == "chaos":
            if random.random() < 0.2:
                time.sleep(6)  # Timeout
                return
            if random.random() < 0.1:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Internal Server Error")
                return
            if random.random() < 0.1:
                self.send_json({"malformed": True, "data": None})  # Missing expected fields
                return
        
        # Rate limit mode
        if MockAPIHandler.mode == "rate_limit" and MockAPIHandler.request_count > 3:
            self.send_json({"error": "Rate limit exceeded"}, status=429)
            return
        
        # Route handling
        if path == "/api/weather":
            city = params.get("city", ["unknown"])[0].lower()
            if city in WEATHER_DATA:
                self.send_json({"city": city, **WEATHER_DATA[city]})
            else:
                self.send_json({"error": f"City '{city}' not found"}, status=404)
        
        elif path == "/api/news":
            topic = params.get("topic", ["general"])[0].lower()
            limit = int(params.get("limit", [5])[0])
            articles = NEWS_DATA.get(topic, [])[:limit]
            self.send_json({"topic": topic, "articles": articles})
        
        elif path == "/api/quotes":
            category = params.get("category", ["motivation"])[0].lower()
            quotes = QUOTES_DATA.get(category, QUOTES_DATA["motivation"])
            quote = random.choice(quotes)
            self.send_json({"category": category, "quote": quote})
        
        else:
            self.send_json({"error": "Not found"}, status=404)


def run_server(port=8080, mode="happy"):
    MockAPIHandler.mode = mode
    server = HTTPServer(('localhost', port), MockAPIHandler)
    print(f"Mock API server running on http://localhost:{port} (mode: {mode})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mock API Server")
    parser.add_argument("--port", type=int, default=8080, help="Port to run on")
    parser.add_argument("--mode", choices=["happy", "chaos", "rate_limit"], default="happy",
                        help="Server mode: happy (normal), chaos (random errors), rate_limit (429 after 3 requests)")
    args = parser.parse_args()
    run_server(port=args.port, mode=args.mode)
