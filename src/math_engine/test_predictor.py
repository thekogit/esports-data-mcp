import json
import pytest
import subprocess
import os

# Get the path to the predictor script
PREDICTOR_PATH = os.path.join(os.path.dirname(__file__), "predictor.py")

def test_predictor_basic():
    """Test the predictor with basic valid input."""
    input_data = {
        "hero_winrates": {"hero1": 0.6, "hero2": 0.45},
        "map_stats": {"map1": 0.55},
        "player_performance": {"player1": 1.2}
    }
    
    # Run the predictor via subprocess to test the CLI interface
    process = subprocess.Popen(
        ["python", PREDICTOR_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate(input=json.dumps(input_data))
    
    assert process.returncode == 0, f"Predictor failed with stderr: {stderr}"
    
    result = json.loads(stdout)
    assert "probability" in result
    assert "confidence_interval" in result
    assert 0 <= result["probability"] <= 1
    assert len(result["confidence_interval"]) == 2
    assert result["confidence_interval"][0] <= result["confidence_interval"][1]

def test_predictor_empty_data():
    """Test the predictor with empty data structures."""
    input_data = {
        "hero_winrates": {},
        "map_stats": {},
        "player_performance": {}
    }
    
    process = subprocess.Popen(
        ["python", PREDICTOR_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate(input=json.dumps(input_data))
    
    assert process.returncode == 0
    result = json.loads(stdout)
    assert "probability" in result

def test_predictor_invalid_json():
    """Test the predictor with invalid JSON input."""
    process = subprocess.Popen(
        ["python", PREDICTOR_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate(input="not a json")
    
    # The script should print an error JSON and exit with 1
    assert process.returncode == 1
    result = json.loads(stdout)
    assert "error" in result
