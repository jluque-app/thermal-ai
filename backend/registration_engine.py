"""
registration_engine.py
======================
Multi-modal (RGB / LWIR) image registration engine for ThermalAI.

Version 2.0 (audit-integration branch, 28 Aug 2026).

Pipeline
--------
Tier 1  Sensor prior H0.  Built from the EXIF 35 mm-equivalent focal lengths of
        the two images (or a per-camera table when EXIF is missing).  When both
        images have identical pixel dimensions they are treated as co-registered
        exports (e.g. DJI Thermal Analysis Tool output) and H0 is the identity.
        Otherwise H0 is a centred scale: the thermal frame covers the central
        part of the wide RGB frame in proportion to the focal-length ratio.
Tier 2  SIFT on polarity-invariant gradient maps + USAC-MAGSAC homography.
        Matching runs in a canonical canvas *after* the sensor prior is applied
        to the RGB image, so that both modalities are at comparable scale.
Tier 3  Inverse-direction Gaussian-pyramid ECC refinement of the Tier-2 candidate.
Tier 4  Fallback to H0 with an explicit reliability flag.

Every candidate must pass (a) a projective-domain check (no projective pole on or
inside the source frame), (b) a plausibility gate relative to the sensor prior
(scale, anisotropy, perspective, translation bounds) and (c) an *independent*
alignment-score test: the candidate is only accepted if the normalised
cross-correlation of the RGB and warped-thermal gradient maps is not worse than
the score obtained with the sensor prior alone.  The score is reported in the
metadata so that downstream consumers can show it; it is NOT a ground-truth
registration error.

All randomness is seeded (cv2.setRNGSeed) so that a given input pair yields the
same result on every run.
"""

from __future__ import annotations

import os
import math
from dataclasses import dataclass, field
from typing import Optional, Tuple, Dict, Any, List, Union

import cv2
import numpy as np
from PIL import Image

ENGINE_VERSION = "2.0.0"

# 35 mm-equivalent focal lengths for known dual-sensor payloads, used only when the
# EXIF FocalLengthIn35mmFilm tag is missing.  Values are the manufacturer's nominal
# figures and can be extended by the operator.
KNOWN_SENSOR_F35_MM: Dict[str, Dict[str, float]] = {
    # DJI Zenmuse H20T: thermal 640x512 (58 mm eq.), wide 4056x3040 (24 mm eq.)
    "ZH20T": {"thermal": 58.0, "wide": 24.0},
    # DJI Mavic 3T: thermal 640x512 (40 mm eq.), wide 4000x3000 (24 mm eq.)
    "M3T": {"thermal": 40.0, "wide": 24.0},
    # DJI Matrice 30T
    "M30T": {"thermal": 40.0, "wide": 24.0},
}


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


# --------------------------------------------------------------------------- #
# Geometry helpers
# --------------------------------------------------------------------------- #
def resize_pixel_map(src_wh: Tuple[int, int], dst_wh: Tuple[int, int]) -> np.ndarray:
    """Source -> destination pixel-centre map for cv2.resize with linear sampling."""
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
    """Normalise a 3x3 homography so that H[2, 2] = 1 and verify invertibility."""
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
    Reject projective poles on or inside the source frame: all four corner
    denominators d_i = h20*x + h21*y + h22 must share the same sign.
    Returns the projected corners.
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


def homography_shape_stats(H: np.ndarray, src_wh: Tuple[int, int]) -> Dict[str, float]:
    """Scale / anisotropy / perspective / translation descriptors of a homography."""
    H = normalized_homography(H)
    sv = np.linalg.svd(H[:2, :2], compute_uv=False)
    w, h = float(src_wh[0]), float(src_wh[1])
    centre = H @ np.array([w / 2.0, h / 2.0, 1.0])
    centre = centre[:2] / centre[2]
    return {
        "scale": float(math.sqrt(sv[0] * sv[1])),
        "anisotropy": float(sv[0] / max(sv[1], 1e-12)),
        "perspective": float(max(abs(H[2, 0]) * w, abs(H[2, 1]) * h)),
        "centre_x": float(centre[0]),
        "centre_y": float(centre[1]),
    }


def plausibility_check(
    H: np.ndarray,
    H_prior: np.ndarray,
    src_wh: Tuple[int, int],
    dst_wh: Tuple[int, int],
    scale_tolerance: float = 0.35,
    max_anisotropy: float = 1.15,
    max_perspective: float = 0.20,
    max_centre_shift_frac: float = 0.35,
) -> Dict[str, Any]:
    """
    Compare a candidate homography with the sensor prior.  A candidate that
    changes the scale by more than `scale_tolerance` (relative), is strongly
    anisotropic, has large perspective terms, or moves the image centre by more
    than `max_centre_shift_frac` of the destination frame is implausible for a
    rigidly mounted dual-sensor payload and is rejected.
    """
    s_c = homography_shape_stats(H, src_wh)
    s_p = homography_shape_stats(H_prior, src_wh)
    rel_scale = s_c["scale"] / max(s_p["scale"], 1e-9)
    shift = math.hypot(s_c["centre_x"] - s_p["centre_x"], s_c["centre_y"] - s_p["centre_y"])
    shift_frac = shift / max(1.0, float(max(dst_wh)))
    reasons = []
    if not (1.0 - scale_tolerance <= rel_scale <= 1.0 + scale_tolerance):
        reasons.append(f"scale ratio vs prior {rel_scale:.3f} outside ±{scale_tolerance:.0%}")
    if s_c["anisotropy"] > max_anisotropy:
        reasons.append(f"anisotropy {s_c['anisotropy']:.3f} > {max_anisotropy}")
    if s_c["perspective"] > max_perspective:
        reasons.append(f"perspective term {s_c['perspective']:.3f} > {max_perspective}")
    if shift_frac > max_centre_shift_frac:
        reasons.append(f"centre shift {shift_frac:.2%} of frame > {max_centre_shift_frac:.0%}")
    return {"plausible": not reasons, "reasons": reasons, "rel_scale": rel_scale,
            "anisotropy": s_c["anisotropy"], "perspective": s_c["perspective"], "centre_shift_frac": shift_frac}


# --------------------------------------------------------------------------- #
# Image helpers
# --------------------------------------------------------------------------- #
def polarity_invariant_edges(gray: np.ndarray) -> np.ndarray:
    """
    Unsigned Sobel gradient magnitude, scaled to its 99.5th percentile and then
    CLAHE-equalised.  Invariant to global contrast inversion between modalities.
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


def alignment_score(rgb_edges: np.ndarray, thermal_edges_warped: np.ndarray, support: np.ndarray) -> float:
    """
    Independent alignment quality proxy: zero-mean normalised cross-correlation of
    the two gradient maps inside the valid support.  Range [-1, 1]; higher is
    better.  Not used to *estimate* the transform, only to *verify* it.
    """
    m = support.astype(bool)
    if m.sum() < 100:
        return float("nan")
    a = rgb_edges.astype(np.float32)[m]
    b = thermal_edges_warped.astype(np.float32)[m]
    a = a - a.mean()
    b = b - b.mean()
    den = float(np.sqrt((a * a).sum() * (b * b).sum()))
    if den < 1e-9:
        return float("nan")
    return float((a * b).sum() / den)


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
    Hierarchical Gaussian-pyramid ECC refinement.  cv2.findTransformECC estimates
    the warp template->input, i.e. RGB->thermal, so it is initialised with
    inv(H_th_to_rgb) and the result is inverted back to thermal->RGB.
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
            W_init = normalized_homography(np.linalg.inv(H_level)).astype(np.float32)
            cc, W = cv2.findTransformECC(
                rs[level], ts[level], W_init.copy(), cv2.MOTION_HOMOGRAPHY, criteria, masks[level], 5
            )
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
    """Warp with bilinear interpolation and return a strict binary support mask."""
    H = normalized_homography(H_th_to_rgb)
    validate_homography_domain(H, (image_bgr.shape[1], image_bgr.shape[0]))
    warped_bgr = cv2.warpPerspective(image_bgr, H, dst_wh, flags=cv2.INTER_LINEAR,
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    ones_mask = np.ones((image_bgr.shape[0], image_bgr.shape[1]), dtype=np.float32)
    warped_weights = cv2.warpPerspective(ones_mask, H, dst_wh, flags=cv2.INTER_LINEAR,
                                         borderMode=cv2.BORDER_CONSTANT, borderValue=0.0)
    valid_support = warped_weights >= 0.99
    return warped_bgr, valid_support


# --------------------------------------------------------------------------- #
# Aligner
# --------------------------------------------------------------------------- #
class MultiModalImageAligner:
    """
    Tier 1: EXIF / camera-table sensor prior
    Tier 2: SIFT on polarity-invariant gradients + USAC-MAGSAC (in prior-aligned canvas)
    Tier 3: Multi-scale pyramid ECC refinement (inverse-direction formulation)
    Tier 4: Sensor-prior fallback with explicit reliability flag
    """

    def __init__(
        self,
        canvas_width: int = 1280,
        canvas_height: int = 960,
        sift_features: int = 6000,
        magsac_threshold: float = 4.0,
        min_inliers: int = 12,
        ecc_levels: int = 3,
        ecc_iterations: int = 200,
        random_seed: int = 12345,
        score_tolerance: float = 0.01,
    ):
        self.canvas_w = canvas_width
        self.canvas_h = canvas_height
        self.sift_features = sift_features
        self.magsac_thresh = magsac_threshold
        self.min_inliers = min_inliers
        self.ecc_levels = ecc_levels
        self.ecc_iterations = ecc_iterations
        self.random_seed = random_seed
        self.score_tolerance = score_tolerance

    # ------------------------------------------------------------------ EXIF
    @staticmethod
    def _safe_float(val: Any) -> Optional[float]:
        """Convert float, int, IFDRational or (num, den) tuple to float safely."""
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
        """Camera model, dimensions and (nested IFD) focal lengths."""
        meta = {"width": None, "height": None, "focal_length_mm": None, "focal_length_35mm": None, "model": None}
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
                if 37386 in tags:
                    meta["focal_length_mm"] = self._safe_float(tags[37386])
                if 41989 in tags:
                    meta["focal_length_35mm"] = self._safe_float(tags[41989])
                if 272 in tags:
                    meta["model"] = str(tags[272]).strip()
        except Exception:
            pass
        return meta

    # ------------------------------------------------------------- Tier 1
    def sensor_prior(
        self,
        rgb_wh: Tuple[int, int],
        th_wh: Tuple[int, int],
        rgb_meta: Dict[str, Any],
        th_meta: Dict[str, Any],
    ) -> Tuple[np.ndarray, str]:
        """
        Build H0 (thermal pixels -> RGB pixels).

        * identical dimensions            -> identity (co-registered exports)
        * both f35 known (EXIF or table)  -> centred scale s = W_rgb*f35_rgb / (W_th*f35_th)
        * otherwise                       -> plain rescale (least informative)
        """
        W_rgb, H_rgb = float(rgb_wh[0]), float(rgb_wh[1])
        W_th, H_th = float(th_wh[0]), float(th_wh[1])
        if rgb_wh == th_wh:
            return np.eye(3, dtype=np.float64), "identity_same_dims"

        f_rgb = rgb_meta.get("focal_length_35mm")
        f_th = th_meta.get("focal_length_35mm")
        source = "exif_f35"
        if not f_rgb or not f_th:
            model = (th_meta.get("model") or rgb_meta.get("model") or "").upper()
            table = KNOWN_SENSOR_F35_MM.get(model)
            if table:
                f_rgb = f_rgb or table["wide"]
                f_th = f_th or table["thermal"]
                source = f"camera_table:{model}"
        if f_rgb and f_th and f_rgb > 0 and f_th > 0:
            s = (W_rgb / W_th) * (float(f_rgb) / float(f_th))
            H0 = np.array([
                [s, 0.0, (W_rgb - s * W_th) / 2.0],
                [0.0, s, (H_rgb - s * H_th) / 2.0],
                [0.0, 0.0, 1.0]
            ], dtype=np.float64)
            return H0, source

        sx, sy = W_rgb / W_th, H_rgb / H_th
        H0 = np.array([[sx, 0.0, (sx - 1.0) / 2.0], [0.0, sy, (sy - 1.0) / 2.0], [0.0, 0.0, 1.0]], dtype=np.float64)
        return H0, "plain_rescale_no_prior"

    # ------------------------------------------------------------- register
    def register(
        self,
        rgb_image: Union[Image.Image, np.ndarray, str],
        thermal_image: Union[Image.Image, np.ndarray, str],
        rgb_path: Optional[str] = None,
        thermal_path: Optional[str] = None,
    ) -> RegistrationResult:
        cv2.setRNGSeed(int(self.random_seed))

        # ---- load
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
        rgb_meta = self.extract_exif_metadata(rgb_path or rgb_image)
        th_meta = self.extract_exif_metadata(thermal_path or thermal_image)

        # ---- Tier 1: sensor prior (thermal -> RGB, full resolution)
        H0, prior_source = self.sensor_prior((W_rgb, H_rgb), (W_th, H_th), rgb_meta, th_meta)

        # ---- canonical canvas: thermal frame resized to canvas; RGB warped by inv(H0)
        cw, ch = self.canvas_w, self.canvas_h
        C_th = resize_pixel_map((W_th, H_th), (cw, ch))          # thermal px -> canvas px
        gray_rgb = cv2.cvtColor(img_rgb, cv2.COLOR_BGR2GRAY)
        gray_th = cv2.cvtColor(img_th, cv2.COLOR_BGR2GRAY)
        # RGB px -> canvas px  =  C_th @ inv(H0)
        A_rgb = normalized_homography(C_th @ np.linalg.inv(H0))
        canvas_rgb = cv2.warpPerspective(gray_rgb, A_rgb, (cw, ch), flags=cv2.INTER_LINEAR)
        canvas_th = cv2.resize(gray_th, (cw, ch), interpolation=cv2.INTER_LINEAR)
        edges_rgb = polarity_invariant_edges(canvas_rgb)
        edges_th = polarity_invariant_edges(canvas_th)
        # canvas support of the RGB image (it may not cover the whole canvas when the prior crops)
        rgb_support = cv2.warpPerspective(np.ones(gray_rgb.shape, np.float32), A_rgb, (cw, ch)) >= 0.99

        # In canvas coordinates the prior is the identity.  Candidates below are
        # canvas-thermal -> canvas-RGB homographies (H_c); full-res H = inv(A_rgb) @ H_c @ C_th.
        def to_full(H_c: np.ndarray) -> np.ndarray:
            return normalized_homography(np.linalg.inv(A_rgb) @ H_c @ C_th)

        def canvas_score(H_c: np.ndarray) -> float:
            warped = cv2.warpPerspective(edges_th, H_c, (cw, ch), flags=cv2.INTER_LINEAR)
            sup = cv2.warpPerspective(np.ones(edges_th.shape, np.float32), H_c, (cw, ch)) >= 0.99
            return alignment_score(edges_rgb, warped, sup & rgb_support)

        H_c = np.eye(3, dtype=np.float64)
        score_prior = canvas_score(H_c)
        method_used = "sensor_prior" if prior_source != "plain_rescale_no_prior" else "rescale_fallback"
        is_reliable = False
        confidence = 0.40 if prior_source == "plain_rescale_no_prior" else 0.55
        inliers = 0
        ecc_diagnostics: List[Dict[str, Any]] = []
        ecc_completed = 0
        rejection_log: List[str] = []
        score_final = score_prior

        # ---- Tier 2: SIFT + USAC-MAGSAC
        sift = cv2.SIFT_create(nfeatures=self.sift_features, contrastThreshold=0.01, edgeThreshold=12)
        kp_rgb, des_rgb = sift.detectAndCompute(edges_rgb, None)
        kp_th, des_th = sift.detectAndCompute(edges_th, None)
        H_cand = None
        if des_rgb is not None and des_th is not None and len(kp_rgb) >= 15 and len(kp_th) >= 15:
            flann = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=50))
            matches = flann.knnMatch(des_th, des_rgb, k=2)
            good = [m for m, n in (p for p in matches if len(p) == 2) if m.distance < 0.82 * n.distance]
            if len(good) >= self.min_inliers:
                pts_th = np.float32([kp_th[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
                pts_rgb = np.float32([kp_rgb[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
                H_m, inl_mask = cv2.findHomography(pts_th, pts_rgb, cv2.USAC_MAGSAC,
                                                   ransacReprojThreshold=self.magsac_thresh,
                                                   maxIters=5000, confidence=0.995)
                if H_m is not None and inl_mask is not None:
                    n_inl = int(np.sum(inl_mask))
                    if n_inl >= self.min_inliers:
                        try:
                            H_try = normalized_homography(H_m)
                            validate_homography_domain(H_try, (cw, ch))
                            pl = plausibility_check(H_try, np.eye(3), (cw, ch), (cw, ch))
                            if not pl["plausible"]:
                                rejection_log.append("sift_magsac: " + "; ".join(pl["reasons"]))
                            else:
                                H_cand = H_try
                                inliers = n_inl
                        except ValueError as exc:
                            rejection_log.append(f"sift_magsac: {exc}")
                    else:
                        rejection_log.append(f"sift_magsac: only {n_inl} inliers (< {self.min_inliers})")
            else:
                rejection_log.append(f"sift_magsac: only {len(good)} ratio-test matches")
        else:
            rejection_log.append("sift_magsac: insufficient keypoints")

        # ---- Tier 3: pyramid ECC on the SIFT candidate
        stage_label = None
        if H_cand is not None:
            stage_label = "sift_magsac"
            try:
                H_ref, diag = refine_ecc_pyramid(edges_rgb, edges_th, H_cand,
                                                 levels=self.ecc_levels, iterations=self.ecc_iterations)
                ecc_diagnostics = diag
                ecc_completed = sum(1 for d in diag if d.get("converged"))
                if ecc_completed > 0:
                    validate_homography_domain(H_ref, (cw, ch))
                    pl = plausibility_check(H_ref, np.eye(3), (cw, ch), (cw, ch))
                    if pl["plausible"]:
                        H_cand = H_ref
                        stage_label = "sift_ecc_pyramid"
                    else:
                        rejection_log.append("ecc refinement discarded: " + "; ".join(pl["reasons"]))
            except Exception as exc:
                rejection_log.append(f"ecc: {exc}")

        # ---- independent verification: candidate must not be worse than the prior
        if H_cand is not None:
            s_cand = canvas_score(H_cand)
            if np.isnan(s_cand) or (not np.isnan(score_prior) and s_cand < score_prior - self.score_tolerance):
                rejection_log.append(f"{stage_label}: alignment score {s_cand:.3f} < prior {score_prior:.3f}")
                H_cand = None
            else:
                H_c = H_cand
                score_final = s_cand
                method_used = stage_label
                is_reliable = True
                confidence = round(min(1.0, float(inliers) / 30.0), 4)

        # ---- compose full-resolution transform
        try:
            H_full = to_full(H_c)
            validate_homography_domain(H_full, (W_th, H_th))
        except Exception as exc:
            rejection_log.append(f"full-resolution composition failed: {exc}")
            H_full = normalized_homography(H0)
            method_used = "sensor_prior" if prior_source != "plain_rescale_no_prior" else "rescale_fallback"
            is_reliable = False
            score_final = score_prior

        aligned_th_bgr, valid_mask = warp_with_validity_mask(img_th, H_full, (W_rgb, H_rgb))
        aligned_th_pil = Image.fromarray(cv2.cvtColor(aligned_th_bgr, cv2.COLOR_BGR2RGB))
        shape = homography_shape_stats(H_full, (W_th, H_th))

        return RegistrationResult(
            aligned_thermal_bgr=aligned_th_bgr,
            aligned_thermal_pil=aligned_th_pil,
            homography_matrix=H_full,
            method_used=method_used,
            confidence_score=confidence,
            is_reliable=is_reliable,
            target_registration_error=None,   # only measurable against ground-truth landmarks
            inlier_count=inliers,
            valid_support_mask=valid_mask,
            metadata={
                "engine_version": ENGINE_VERSION,
                "rgb_size": (W_rgb, H_rgb),
                "thermal_size": (W_th, H_th),
                "rgb_model": rgb_meta.get("model"),
                "thermal_model": th_meta.get("model"),
                "rgb_focal_35mm": rgb_meta.get("focal_length_35mm"),
                "thermal_focal_35mm": th_meta.get("focal_length_35mm"),
                "prior_source": prior_source,
                "prior_scale": float(homography_shape_stats(H0, (W_th, H_th))["scale"]),
                "final_scale": shape["scale"],
                "final_anisotropy": shape["anisotropy"],
                "alignment_score_prior": None if np.isnan(score_prior) else round(score_prior, 4),
                "alignment_score_final": None if np.isnan(score_final) else round(score_final, 4),
                "alignment_gain": None if (np.isnan(score_prior) or np.isnan(score_final)) else round(score_final - score_prior, 4),
                "support_coverage": round(float(valid_mask.mean()), 4),
                "ecc_diagnostics": ecc_diagnostics,
                "ecc_completed_levels": ecc_completed,
                "rejections": rejection_log,
                "random_seed": self.random_seed,
            }
        )
