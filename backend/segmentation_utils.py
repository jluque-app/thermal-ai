# segmentation_utils.py
#
# Loads your existing DeepLabV3 model (Model.pth) and exposes facade component masks.
# Class indices (per MachineLearningUtils.py):
#   1 = Wall
#   3 = Door
#   8 = Windows

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict
import numpy as np
import torch
from PIL import Image

from sources.MachineLearningUtils import init_deeplab, label_image


@dataclass
class SegmentationResult:
    indexed: np.ndarray      # uint8 (H,W)
    wall_mask: np.ndarray    # bool
    window_mask: np.ndarray  # bool
    door_mask: np.ndarray    # bool
    counts: Dict[str, int]


class SegmentationModel:
    def __init__(self, model_path: str, device: Optional[str] = None, num_classes: int = 9):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = init_deeplab(num_classes)

        # Load weights (robust to different checkpoint formats)
        ckpt = torch.load(model_path, map_location=self.device)
        if isinstance(ckpt, dict) and "state_dict" in ckpt:
            ckpt = ckpt["state_dict"]

        self.model.load_state_dict(ckpt)
        self.model.to(self.device)
        self.model.eval()

    def predict_masks(self, rgb_img: Image.Image) -> SegmentationResult:
        arr = np.array(rgb_img.convert("RGB"))

        # Critical for memory: no grad graph kept in RAM
        with torch.inference_mode():
            indexed = label_image(self.model, arr, self.device)  # (H,W) uint8

        wall = indexed == 1
        door = indexed == 3
        window = indexed == 8

        counts = {
            "wall_pixels": int(wall.sum()),
            "door_pixels": int(door.sum()),
            "window_pixels": int(window.sum()),
            "total_pixels": int(indexed.size),
        }
        return SegmentationResult(
            indexed=indexed,
            wall_mask=wall,
            window_mask=window,
            door_mask=door,
            counts=counts,
        )


class MockSegmentationModel:
    """Fallback model for local development when weights are missing."""
    def __init__(self, *args, **kwargs):
        print("MockSegmentationModel initialized.")

    def predict_masks(self, rgb_img: Image.Image) -> SegmentationResult:
        w, h = rgb_img.size
        # Create dummy masks (center of image is window, rest is wall)
        indexed = np.ones((h, w), dtype=np.uint8) # 1 = Wall by default
        
        # Make a center rectangle "Window" (class 8)
        cw, ch = w // 2, h // 2
        dw, dh = w // 4, h // 4
        indexed[ch-dh:ch+dh, cw-dw:cw+dw] = 8
        
        # Make a small door at bottom (class 3)
        indexed[h-dh:h, cw-dw//2:cw+dw//2] = 3

        wall = indexed == 1
        door = indexed == 3
        window = indexed == 8

        counts = {
            "wall_pixels": int(wall.sum()),
            "door_pixels": int(door.sum()),
            "window_pixels": int(window.sum()),
            "total_pixels": int(indexed.size),
        }
        return SegmentationResult(
            indexed=indexed,
            wall_mask=wall,
            window_mask=window,
            door_mask=door,
            counts=counts,
        )
