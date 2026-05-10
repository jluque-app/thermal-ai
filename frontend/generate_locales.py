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
    "fast_accurate": "Fast, Accurate, AI-Driven",
    "fast_desc": "Get actionable heat loss estimates instantly.",
    "drone": "Non-Invasive Drone Imagery",
    "drone_desc": "Screens façades and roofs for residential, logistics, and retail buildings efficiently.",
    "hidden_issues": "Identify Hidden Issues",
    "hidden_desc": "Detect thermal bridges and air infiltrations accurately.",
    "cost_savings": "Massive Cost Savings",
    "cost_desc": "Evaluate retrofitting costs to maximize your ROI.",
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

os.makedirs("src/locales", exist_ok=True)

for lang in languages:
    os.makedirs(f"src/locales/{lang}", exist_ok=True)
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
                    time.sleep(1)
            time.sleep(0.1) # Be nice to the API
            
    with open(f"src/locales/{lang}/translation.json", "w", encoding="utf-8") as f:
        json.dump(translated_texts, f, ensure_ascii=False, indent=2)

print("Translations generated successfully.")
