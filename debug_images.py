
import cv2
import numpy as np
import os

base_dir = "frontend/public/gyor_pilot/building_student"
files = ["rgb_v2.jpg", "thermal_v2.jpg", "overlay.jpg", "boxed.jpg"]

print(f"Checking images in {base_dir}")

for f in files:
    path = os.path.join(base_dir, f)
    if not os.path.exists(path):
        print(f"[MISSING] {f}")
        continue
    
    try:
        img = cv2.imread(path)
        if img is None:
            print(f"[ERROR] {f}: Failed to load (None)")
            continue
        
        print(f"[{f}] Shape: {img.shape}, Dtype: {img.dtype}")
        print(f"    Min: {img.min()}, Max: {img.max()}, Mean: {img.mean():.2f}")
        
        if f == "thermal_v2.jpg" and img.max() == 0:
            print("    ALERT: Thermal image is completely BLACK!")
            
    except Exception as e:
        print(f"[EXCEPTION] {f}: {e}")

# Compare overlay and rgb
rgb = cv2.imread(os.path.join(base_dir, "rgb_v2.jpg"))
overlay = cv2.imread(os.path.join(base_dir, "overlay.jpg"))

if rgb is not None and overlay is not None:
    if rgb.shape == overlay.shape:
        diff = cv2.absdiff(rgb, overlay)
        if np.max(diff) == 0:
            print("ALERT: Overlay is IDENTICAL to RGB (No hotspots drawn)")
        else:
            print(f"Overlay differs from RGB. Max diff: {np.max(diff)}")
    else:
        print("Overlay shape differs from RGB shape.")
