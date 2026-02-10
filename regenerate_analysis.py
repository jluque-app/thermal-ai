import os
import sys
import json
import base64
import requests
from pathlib import Path

# Configuration
BACKEND_URL = "http://127.0.0.1:8000"
PUBLIC_DIR = Path("frontend/public")
GYOR_PILOT_DIR = PUBLIC_DIR / "gyor_pilot"

# Project Definitions
PROJECTS = [
    {
        "id": "building_1",
        "rgb_path": GYOR_PILOT_DIR / "building_1/rgb.jpg",
        "thermal_path": GYOR_PILOT_DIR / "building_1/thermal.jpg",
        "output_dir": GYOR_PILOT_DIR / "building_1"
    },
    {
        "id": "building_student",
        "rgb_path": GYOR_PILOT_DIR / "building_student/rgb_v2.jpg",
        "thermal_path": GYOR_PILOT_DIR / "building_student/thermal_v2.jpg",
        "output_dir": GYOR_PILOT_DIR / "building_student"
    }
]

def encode_image(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def save_image(b64_str, output_path):
    if not b64_str:
        print(f"Warning: No data for {output_path}")
        return
    
    # Strip prefix if present
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    
    with open(output_path, "wb") as f:
        f.write(base64.b64decode(b64_str))
    print(f"Saved: {output_path}")

def process_project(proj):
    print(f"Processing {proj['id']}...")
    
    if not proj["rgb_path"].exists() or not proj["thermal_path"].exists():
        print(f"Skipping {proj['id']}: Missing input images")
        return

    # Prepare multipart/form-data
    files = {
        'rgb_image': ('rgb.jpg', open(proj["rgb_path"], 'rb'), 'image/jpeg'),
        'thermal_image': ('thermal.jpg', open(proj["thermal_path"], 'rb'), 'image/jpeg')
    }
    
    data = {
        'include_overlay_base64': 'true',
        'auto_register': 'true',
        'city': 'Gyor',
        'country': 'Hungary'
    }

    try:
        response = requests.post(f"{BACKEND_URL}/analyze", files=files, data=data)
        
        # Close files
        for f in files.values():
            f[1].close()
            
        response.raise_for_status()
        resp_json = response.json()
        
        # Access artifacts from response
        # Structure might be: { "status": "success", "raw": { "artifacts": ... } }
        artifacts = resp_json.get("raw", {}).get("artifacts", {})
        
        if not artifacts:
            print(f"Warning: No artifacts returned for {proj['id']}")
            # Fallback check
            artifacts = resp_json.get("artifacts", {})

        # Save images
        save_image(artifacts.get("overlay_image_base64_png"), proj["output_dir"] / "overlay.jpg")
        save_image(artifacts.get("boxed_rgb_image_base64_png"), proj["output_dir"] / "boxed.jpg")
        
        print(f"Successfully processed {proj['id']}")
        
    except Exception as e:
        print(f"Error processing {proj['id']}: {e}")
        if 'response' in locals() and response.status_code == 400:
             print(f"Response: {response.text}")

if __name__ == "__main__":
    print("Starting analysis regeneration...")
    for p in PROJECTS:
        process_project(p)
    print("Done.")
