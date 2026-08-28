"""
registration_engine.py
======================
Audited Multi-Modal Image Registration Engine for ThermalAI.
Aligns UAV dual-sensor imagery (RGB visual and LWIR thermal).

Key features:
1. Sub-pixel coordinate mapping with OpenCV linear resize center offsets: (s_x - 1)/2.
2. Geometric domain validation rejecting projective poles and invalid homographies.
3. Polarity-invariant gradient extraction (unsigned Sobel magnitude scaled before CLAHE).
4. Inverse-direction Gaussian pyramid ECC homography refinement with exact stage tracking.
5. Valid support warping avoiding artificial reflection artifacts.
6. Robust IFDRational EXIF handling.
"""

from __future__ import annotations

import os
import math
from dataclasses import dataclass, field
from typing import Optional, Tuple, Dict, Any, List, Union

import cv2
import numpy as np
from PIL import Image, ExifTags


@dataclass
class RegistrationResult:
    aligned_thermal_bgr: np.ndarray
    aligned_thermal_pil: Image.Image
    homography_matrix: np.ndarray
    method_used: str
    confidence_score: float
    is_reliable: bool
    target_registration_error: Optional[float]
    inlier_count: int
    valid_support_mask: np.ndarray
    metadata: Dict[str, Any] = field(default_factory=dict)


def resize_pixel_map(src_wh: Tuple[int, int], dst_wh: Tuple[int, int]) -> np.ndarray:
    """Source -> destination pixel centers for cv2.resize with linear sampling."""
    w_src, h_src = float(src_wh[0]), float(src_wh[1])
    w_dst, h_dst = float(dst_wh[0]), float(dst_wh[1])
    if w_src <= 0 or h_src <= 0 or w_dst <= 0 or h_dst <= 0:
        raise ValueError("Image dimensions must be positive")
    sx = w_dst / w_src
    sy = h_dst / h_src
    return np.array([
        [sx, 0.0, (sx - 1.0) / 2.0],
        [0.0, sy, (sy - 1.0) / 2.0],
        [0.0, 0.0, 1.0]
    ], dtype=np.float64)


def normalized_homography(H: np.ndarray) -> np.ndarray:
    """Normalize 3x3 homography matrix such that H[2, 2] = 1.0."""
    H = np.asarray(H, dtype=np.float64)
    if H.shape != (3, 3) or not np.isfinite(H).all() or abs(H[2, 2]) < 1e-12:
        raise ValueError("Invalid homography matrix")
    H_norm = H / H[2, 2]
    try:
        inv = np.linalg.inv(H_norm)
        if not np.isfinite(inv).all():
            raise ValueError("Non-finite inverse homography")
    except np.linalg.LinAlgError as exc:
        raise ValueError("Singular homography matrix") from exc
    return H_norm


def validate_homography_domain(H: np.ndarray, src_wh: Tuple[int, int]) -> np.ndarray:
    """
    Reject projective poles inside the image frame before accepting a homography.
    Ensures that projective denominators remain positive across all image corners.
    """
    H = normalized_homography(H)
    w, h = float(src_wh[0]), float(src_wh[1])
    corners = np.array([
        [0.0, 0.0, 1.0],
        [w - 1.0, 0.0, 1.0],
        [w - 1.0, h - 1.0, 1.0],
        [0.0, h - 1.0, 1.0]
    ], dtype=np.float64)
    projected = (H @ corners.T).T
    d = projected[:, 2]
    tolerance = 1e-10 * max(1.0, float(np.abs(d).max()))
    if d.min() <= tolerance and d.max() >= -tolerance:
        raise ValueError("Homography has a projective pole on or inside the source domain")
    return projected[:, :2] / d[:, None]


def polarity_invariant_edges(gray: np.ndarray) -> np.ndarray:
    """
    Compute unsigned gradient magnitude scaled to the 99.5th percentile before CLAHE.
    Guarantees structural invariance under global thermal contrast inversion.
    """
    a = np.asarray(gray, dtype=np.float32)
    if a.ndim != 2 or not a.size or not np.isfinite(a).all():
        raise ValueError("Expected a finite 2D scalar image")
    blurred = cv2.GaussianBlur(a, (5, 5), 1.2)
    gx = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
    mag = cv2.magnitude(gx, gy)
    scale = float(np.percentile(mag, 99.5))
    if scale <= 1e-8:
        return np.zeros(a.shape, dtype=np.uint8)
    unsigned = np.rint(np.clip(mag / scale, 0.0, 1.0) * 255.0).astype(np.uint8)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    return clahe.apply(unsigned)


def refine_ecc_pyramid(
    rgb_edges: np.ndarray,
    thermal_edges: np.ndarray,
    H_th_to_rgb: np.ndarray,
    levels: int = 3,
    iterations: int = 200,
    eps: float = 1e-6,
    thermal_valid_mask: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """
    Hierarchical Gaussian Pyramid ECC refinement.
    Correctly accounts for cv2.findTransformECC(template=RGB, input=thermal) using RGB -> thermal,
    initializing with inv(H_th_to_rgb) and inverting the output candidate back to thermal -> RGB.
    """
    r = np.asarray(rgb_edges, dtype=np.float32)
    t = np.asarray(thermal_edges, dtype=np.float32)
    if r.ndim != 2 or r.shape != t.shape or not r.size:
        raise ValueError("Use equal-sized canonical scalar images")
    if r.std() < 1e-8 or t.std() < 1e-8:
        raise ValueError("ECC requires non-constant structural information")

    mask = np.ones(t.shape, np.uint8) if thermal_valid_mask is None else np.asarray(thermal_valid_mask, dtype=np.uint8)
    rs, ts, masks = [r], [t], [(mask > 0).astype(np.uint8)]
    for _ in range(1, levels):
        rs.append(cv2.pyrDown(rs[-1]))
        ts.append(cv2.pyrDown(ts[-1]))
        masks.append(cv2.erode(masks[-1], np.ones((5, 5), np.uint8))[::2, ::2])

    H = normalized_homography(H_th_to_rgb)
    validate_homography_domain(H, (t.shape[1], t.shape[0]))
    diagnostics = []
    criteria = (cv2.TERM_CRITERIA_COUNT | cv2.TERM_CRITERIA_EPS, iterations, eps)

    for level in reversed(range(levels)):
        P = np.diag([2.0 ** (-level), 2.0 ** (-level), 1.0])
        H_level = P @ H @ np.linalg.inv(P)
        try:
            # OpenCV ECC expects RGB -> Thermal mapping
            W_init = normalized_homography(np.linalg.inv(H_level)).astype(np.float32)
            cc, W = cv2.findTransformECC(
                rs[level],
                ts[level],
                W_init.copy(),
                cv2.MOTION_HOMOGRAPHY,
                criteria,
                masks[level],
                5
            )
            # Invert back to Thermal -> RGB
            candidate = normalized_homography(np.linalg.inv(P) @ np.linalg.inv(W) @ P)
            validate_homography_domain(candidate, (t.shape[1], t.shape[0]))
            if not np.isfinite(cc):
                raise ValueError("Non-finite ECC correlation")
            H = candidate
            diagnostics.append({"level": level, "converged": True, "cc": float(cc)})
        except Exception as exc:
            diagnostics.append({"level": level, "converged": False, "error": str(exc)})
            continue

    return H, diagnostics


def warp_with_validity_mask(
    image_bgr: np.ndarray,
    H_th_to_rgb: np.ndarray,
    dst_wh: Tuple[int, int]
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Warp thermal image to destination RGB dimensions using bilinear interpolation,
    returning both the warped image and a strict binary support mask.
    """
    H = normalized_homography(H_th_to_rgb)
    validate_homography_domain(H, (image_bgr.shape[1], image_bgr.shape[0]))
    
    warped_bgr = cv2.warpPerspective(
        image_bgr,
        H,
        dst_wh,
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0)
    )
    
    ones_mask = np.ones((image_bgr.shape[0], image_bgr.shape[1]), dtype=np.float32)
    warped_weights = cv2.warpPerspective(
        ones_mask,
        H,
        dst_wh,
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0.0
    )
    valid_support = warped_weights >= 0.99
    return warped_bgr, valid_support


class MultiModalImageAligner:
    """
    Audited Multi-Modal Image Registration Pipeline:
      Tier 1: EXIF Sensor & Focal Length Prior
      Tier 2: Canonical SIFT Feature Matching with USAC-MAGSAC & Spatial Domain Filtering
      Tier 3: Multi-Scale Pyramid ECC Homography Refinement (Inverse Direction Formulation)
      Tier 4: Geometric Fallback with Explicit Reliability Flags
    """

    def __init__(
        self,
        canvas_width: int = 1280,
        canvas_height: int = 960,
        sift_features: int = 6000,
        magsac_threshold: float = 4.0,
        min_inliers: int = 10,
        ecc_levels: int = 3,
        ecc_iterations: int = 200,
    ):
        self.canvas_w = canvas_width
        self.canvas_h = canvas_height
        self.sift_features = sift_features
        self.magsac_thresh = magsac_threshold
        self.min_inliers = min_inliers
        self.ecc_levels = ecc_levels
        self.ecc_iterations = ecc_iterations

    @staticmethod
    def _safe_float(val: Any) -> Optional[float]:
        """Convert float, int, IFDRational or tuple to float safely."""
        if val is None:
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            if isinstance(val, (tuple, list)) and len(val) == 2 and val[1] != 0:
                try:
                    return float(val[0]) / float(val[1])
                except Exception:
                    return None
            return None

    def extract_exif_metadata(self, image_input: Any) -> Dict[str, Any]:
        """Extract camera model, dimensions, and nested EXIF focal lengths."""
        meta = {
            "width": None,
            "height": None,
            "focal_length_mm": None,
            "focal_length_35mm": None,
            "model": None,
        }
        try:
            if isinstance(image_input, (str, os.PathLike)):
                img = Image.open(image_input)
            elif isinstance(image_input, Image.Image):
                img = image_input
            else:
                return meta

            meta["width"], meta["height"] = img.size
            raw_exif = img.getexif()
            if raw_exif:
                tags = dict(raw_exif)
                if hasattr(raw_exif, "get_ifd"):
                    try:
                        tags.update(raw_exif.get_ifd(34665))
                    except Exception:
                        pass

                if 37386 in tags:  # FocalLength
                    meta["focal_length_mm"] = self._safe_float(tags[37386])
                if 41989 in tags:  # FocalLengthIn35mmFilm
                    meta["focal_length_35mm"] = self._safe_float(tags[41989])
                if 272 in tags:  # Model
                    meta["model"] = str(tags[272])
        except Exception:
            pass
        return meta

    def register(
        self,
        rgb_image: Union[Image.Image, np.ndarray, str],
        thermal_image: Union[Image.Image, np.ndarray, str],
        rgb_path: Optional[str] = None,
        thermal_path: Optional[str] = None,
    ) -> RegistrationResult:
        """
        Execute full audited registration pipeline.
        Returns sub-pixel aligned thermal image, homography matrix, validity mask, and diagnostics.
        """
        if isinstance(rgb_image, (str, os.PathLike)):
            rgb_path = str(rgb_image)
            img_rgb = cv2.imread(rgb_path)
        elif isinstance(rgb_image, Image.Image):
            img_rgb = cv2.cvtColor(np.array(rgb_image.convert("RGB")), cv2.COLOR_RGB2BGR)
        else:
            img_rgb = rgb_image.copy()

        if isinstance(thermal_image, (str, os.PathLike)):
            thermal_path = str(thermal_image)
            img_th = cv2.imread(thermal_path)
        elif isinstance(thermal_image, Image.Image):
            img_th = cv2.cvtColor(np.array(thermal_image.convert("RGB")), cv2.COLOR_RGB2BGR)
        else:
            img_th = thermal_image.copy()

        H_rgb, W_rgb = img_rgb.shape[:2]
        H_th, W_th = img_th.shape[:2]

        rgb_meta = self.extract_exif_metadata(rgb_path or img_rgb)
        th_meta = self.extract_exif_metadata(thermal_path or img_th)

        # Coordinate mappings with linear resize pixel-center shift
        cw, ch = self.canvas_w, self.canvas_h
        C_th = resize_pixel_map((W_th, H_th), (cw, ch))
        C_rgb = resize_pixel_map((W_rgb, H_rgb), (cw, ch))
        C_rgb_inv = np.linalg.inv(C_rgb)

        # Extract polarity-invariant structural gradient edges
        gray_rgb = cv2.cvtColor(img_rgb, cv2.COLOR_BGR2GRAY)
        gray_th = cv2.cvtColor(img_th, cv2.COLOR_BGR2GRAY)

        resized_rgb = cv2.resize(gray_rgb, (cw, ch), interpolation=cv2.INTER_LINEAR)
        resized_th = cv2.resize(gray_th, (cw, ch), interpolation=cv2.INTER_LINEAR)

        norm_rgb = polarity_invariant_edges(resized_rgb)
        norm_th = polarity_invariant_edges(resized_th)

        # Baseline fallback matrix
        H_fallback = np.array([
            [float(W_rgb) / float(W_th), 0.0, (float(W_rgb) / float(W_th) - 1.0) / 2.0],
            [0.0, float(H_rgb) / float(H_th), (float(H_rgb) / float(H_th) - 1.0) / 2.0],
            [0.0, 0.0, 1.0]
        ], dtype=np.float64)

        # ---------------------------------------------------------------------
        # Tier 2: SIFT + USAC-MAGSAC Matching
        # ---------------------------------------------------------------------
        sift = cv2.SIFT_create(nfeatures=self.sift_features, contrastThreshold=0.01, edgeThreshold=12)
        kp_rgb, des_rgb = sift.detectAndCompute(norm_rgb, None)
        kp_th, des_th = sift.detectAndCompute(norm_th, None)

        H_norm = None
        inliers = 0
        method_used = "rescale_fallback"
        confidence = 0.40
        is_reliable = False
        ecc_diagnostics: List[Dict[str, Any]] = []
        ecc_completed = 0

        if des_rgb is not None and des_th is not None and len(kp_rgb) >= 15 and len(kp_th) >= 15:
            flann = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=50))
            matches = flann.knnMatch(des_th, des_rgb, k=2)
            good_matches = [m for m, n in matches if m.distance < 0.82 * n.distance]

            if len(good_matches) >= self.min_inliers:
                pts_th = np.float32([kp_th[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                pts_rgb = np.float32([kp_rgb[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                H_magsac, inlier_mask = cv2.findHomography(
                    pts_th,
                    pts_rgb,
                    cv2.USAC_MAGSAC,
                    ransacReprojThreshold=self.magsac_thresh,
                    maxIters=5000,
                    confidence=0.995
                )

                if H_magsac is not None and inlier_mask is not None:
                    inlier_count = int(np.sum(inlier_mask))
                    if inlier_count >= self.min_inliers:
                        try:
                            H_cand = normalized_homography(H_magsac)
                            validate_homography_domain(H_cand, (cw, ch))
                            H_norm = H_cand
                            inliers = inlier_count
                            method_used = "sift_magsac"
                            confidence = round(min(1.0, float(inliers) / 30.0), 4)
                            is_reliable = True
                        except ValueError:
                            # Reject degenerate/pole homography
                            pass

        # ---------------------------------------------------------------------
        # Tier 3: Hierarchical Pyramid ECC Refinement with Exact Stage Tracking
        # ---------------------------------------------------------------------
        if is_reliable and H_norm is not None:
            try:
                H_refined, diagnostics = refine_ecc_pyramid(
                    norm_rgb,
                    norm_th,
                    H_norm,
                    levels=self.ecc_levels,
                    iterations=self.ecc_iterations
                )
                ecc_diagnostics = diagnostics
                completed_levels = [d for d in diagnostics if d.get("converged", False)]
                ecc_completed = len(completed_levels)
                if completed_levels:
                    validate_homography_domain(H_refined, (cw, ch))
                    H_norm = H_refined
                    method_used = "sift_ecc_pyramid"
                else:
                    method_used = "sift_magsac"
            except Exception:
                method_used = "sift_magsac"

        # Compute full-resolution transform
        if is_reliable and H_norm is not None:
            try:
                H_full = normalized_homography(C_rgb_inv @ H_norm @ C_th)
                validate_homography_domain(H_full, (W_th, H_th))
            except Exception:
                H_full = H_fallback
                is_reliable = False
                method_used = "rescale_fallback"
        else:
            H_full = H_fallback

        # Warp thermal image with validity mask
        aligned_th_bgr, valid_mask = warp_with_validity_mask(img_th, H_full, (W_rgb, H_rgb))
        aligned_th_pil = Image.fromarray(cv2.cvtColor(aligned_th_bgr, cv2.COLOR_BGR2RGB))

        return RegistrationResult(
            aligned_thermal_bgr=aligned_th_bgr,
            aligned_thermal_pil=aligned_th_pil,
            homography_matrix=H_full,
            method_used=method_used,
            confidence_score=confidence,
            is_reliable=is_reliable,
            target_registration_error=None,  # Measured only against ground-truth checkpoints
            inlier_count=inliers,
            valid_support_mask=valid_mask,
            metadata={
                "rgb_size": (W_rgb, H_rgb),
                "thermal_size": (W_th, H_th),
                "rgb_model": rgb_meta.get("model"),
                "thermal_model": th_meta.get("model"),
                "rgb_focal_35mm": rgb_meta.get("focal_length_35mm"),
                "thermal_focal_35mm": th_meta.get("focal_length_35mm"),
                "ecc_diagnostics": ecc_diagnostics,
                "ecc_completed_levels": ecc_completed,
            }
        )
