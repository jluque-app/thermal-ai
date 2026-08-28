import os
import json
import time
from deep_translator import GoogleTranslator

languages = ['en', 'de', 'sv', 'nl', 'fr', 'hu', 'pl', 'sk', 'cs', 'no', 'fi', 'it', 'es']

base_texts = {
    "title": "ThermalAI",
    "subtitle": "AI Building-Physics Expertise for Real Estate",
    "description": "From thermal images to structured heat-loss insights. ThermalAI combines specialized AI interpretation with deterministic analysis—designed for professionals who need correctness, transparency, and regulatory awareness.",
    "run_app": "Run ThermalAI App",
    "chat_expert": "Chat ThermalAI Expert",
    "preview_limit": "Preview is limited to 3 questions. For quantitative heat-loss estimates and reporting, use the ThermalAI App.",
    "smart_retrofit": "Make a Smart Retrofit Decision",
    "fast_accurate": "Fast, Transparent, AI-Driven",
    "fast_desc": "Screening-level heat-loss estimates in minutes, with every assumption shown.",
    "drone": "Non-Invasive Drone Imagery",
    "drone_desc": "Screens façades and roofs for residential, logistics, and retail buildings efficiently.",
    "hidden_issues": "Identify Hidden Issues",
    "hidden_desc": "Flag thermal anomalies such as missing insulation and thermal bridges for follow-up inspection.",
    "cost_savings": "Prioritise Retrofit Spend",
    "cost_desc": "Rank buildings so expensive audits and retrofits go where they pay back first.",
    "what_is": "What ThermalAI Is — and Isn't",
    "what_is_desc": "ThermalAI is a professional screening and decision-support tool designed to accelerate early-stage building assessment. It provides directional heat-loss insights for portfolio prioritization, due diligence, and audit planning—not regulatory certification.",
    "provides": "ThermalAI Provides:",
    "prov_1": "Rapid thermal screening for portfolio prioritization",
    "prov_2": "AI-assisted anomaly detection and interpretation",
    "prov_3": "Screening-level heat-loss estimates for planning",
    "prov_4": "Professional documentation for stakeholder communication",
    "prov_5": "Decision support for retrofit investment",
    "not_is": "ThermalAI Is Not:",
    "not_1": "A certified Energy Performance Certificate (EPC)",
    "not_2": "A replacement for on-site energy audits",
    "not_3": "A guarantee of retrofit performance outcomes",
    "not_4": "A regulatory compliance tool",
    "not_5": "A substitute for detailed engineering analysis",
    "use_to": "Use ThermalAI to identify priorities, support investment decisions, and plan detailed assessments—then engage qualified professionals for regulatory certification and implementation.",
    "method_kicker": "Transparent by design",
    "method_title": "How ThermalAI turns two drone images into a retrofit priority",
    "method_sub": "Every step is deterministic and auditable. Each report shows which alignment method was used, an independent alignment score, and any condition that makes the estimate less reliable.",
    "method_s1": "Align",
    "method_s1_d": "The thermal image is matched to the RGB photo using the camera geometry, robust feature matching and sub-pixel refinement. A candidate alignment is only accepted if it verifiably improves on the camera prior.",
    "method_s2": "Isolate the facade",
    "method_s2_d": "A segmentation network separates walls, windows and doors from sky, ground, trees and vehicles, so only the building envelope is analysed.",
    "method_s3": "Flag anomalies",
    "method_s3_d": "The warmest areas inside the facade are flagged relative to the rest of the same facade, never against the whole picture.",
    "method_s4": "Estimate & rank",
    "method_s4_d": "Flagged area, capture-time temperatures and local heating degree-hours give a screening-level annual heat-loss proxy in kWh and euros, with explicit assumptions.",
    "method_pilot": "Tested on real flights",
    "method_pilot_d": "Developed with a UAV pilot on six buildings in Győr and Mosonmagyaróvár (Hungary) flown with a DJI Matrice 300 RTK and Zenmuse H20T dual sensor, and being prepared for peer-reviewed publication.",
    "method_epbd": "Built for the EPBD 2024 recast",
    "method_epbd_d": "Municipalities and portfolio owners must prioritise renovations at scale. ThermalAI is a triage layer that tells you where a certified audit is worth its cost.",
    "method_limits": "Honest about limits",
    "method_limits_d": "Not an EPC, not a U-value measurement, not a substitute for an on-site audit. Read the method & limitations.",
    "method_limits_link": "method & limitations",
    "pricing": "Pricing & Plans",
    "pricing_sub": "Choose the plan that fits your workflow",
    "free": "Free",
    "popular": "POPULAR",
    "scan": "/ scan",
    "custom": "Custom",
    "start_free": "Start Free",
    "choose_project": "Choose Project",
    "contact_sales": "Contact Sales"
}

locales_dir = os.path.join(os.path.dirname(__file__), "src", "locales")
os.makedirs(locales_dir, exist_ok=True)

for lang in languages:
    lang_dir = os.path.join(locales_dir, lang)
    os.makedirs(lang_dir, exist_ok=True)
    translated_texts = {}
    
    print(f"Translating to {lang}...")
    if lang == 'en':
        translated_texts = base_texts
    else:
        translator = GoogleTranslator(source='en', target=lang)
        for key, text in base_texts.items():
            if key in ["title"]:
                translated_texts[key] = text
            else:
                try:
                    translated = translator.translate(text)
                    translated_texts[key] = translated
                except Exception as e:
                    print(f"Error translating {key} to {lang}: {e}")
                    translated_texts[key] = text
                    time.sleep(0.5)
            time.sleep(0.05) # Be nice to the API
            
    out_file = os.path.join(lang_dir, "translation.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(translated_texts, f, ensure_ascii=False, indent=2)

print("Translations generated successfully.")
