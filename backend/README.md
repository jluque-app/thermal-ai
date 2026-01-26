THERMALAI – CLEAN BACKEND PACKAGE
================================

This folder contains the COMPLETE backend needed to run the improved ThermalAI engine,
refactored from your original thermal2.py.

--------------------------------
FOLDER STRUCTURE (THIS ZIP)
--------------------------------

thermalai_backend/
│
├── app_improved.py              # MAIN API ENTRYPOINT (run this)
├── thermal_core_improved.py     # Core heat-loss + annualisation logic
├── segmentation_utils.py        # Loads your DeepLab facade model
├── climate_data_improved.py     # City + climate annualisation (ΔT method)
├── report_template_improved.py  # Gamma / PDF report generator
├── requirements.txt             # Python dependencies
└── README.md                    # This file

--------------------------------
FILES YOU MUST ADD MANUALLY
--------------------------------

Because of size limits, the ML model is NOT included.

Create this folder structure:

thermalai_backend/
└── models/
    └── Model.pth

Where:
- Model.pth is EXACTLY the same file you used in thermal2.py
- No retraining is required

Also copy your original folder:

thermalai_backend/
└── sources/
    └── MachineLearningUtils.py
    └── (any other files it imports)

--------------------------------
HOW TO RUN
--------------------------------

1) Create a virtual environment (recommended)
   python -m venv venv
   source venv/bin/activate   (Mac/Linux)
   venv\Scripts\activate    (Windows)

2) Install dependencies
   pip install -r requirements.txt

3) Run the API
   uvicorn app_improved:app --reload --port 8000

4) Test
   Open browser:
   http://localhost:8000/docs

--------------------------------
WHAT THIS BACKEND DOES
--------------------------------

✔ Uses your DeepLab model to segment:
  - wall / window / door

✔ Detects thermal hotspots from the thermal image

✔ Computes heat loss using TWO METHODS:
  A) ΔT proxy method (your original idea, no U-values needed)
     - instantaneous W
     - annual kWh using city-specific degree-hours

  B) U-value + HDD method (optional comparison)

✔ Outputs:
  - Per-component (wall/window/door) results
  - Whole façade totals
  - Overlay image (base64)
  - Gamma-ready PDF payload

--------------------------------
DESIGN PHILOSOPHY
--------------------------------

This backend:
- Preserves the SCIENTIFIC IDEA of thermal2.py
- Removes GUI/Tkinter complexity
- Is API-first and web-ready
- Is climate-aware (Cordoba ≠ Salamanca)
- Does NOT require U-values unless user wants them

--------------------------------
NEXT OPTIONAL STEP
--------------------------------

Frontend (Base44 / Bubble / custom React):
- Upload images
- Collect user inputs
- Call POST /analyze
- Render overlay + tables
- Send gamma_payload to Gamma API to generate PDF

--------------------------------
CONTACT NOTE
--------------------------------

If something breaks:
- 90% of issues are missing Model.pth or sources/
- Check paths in segmentation_utils.py

You can now COPY–PASTE this folder into your laptop and start working.