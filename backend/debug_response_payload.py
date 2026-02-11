
# debug_response_payload.py
import sys
from report_builder import build_report

def test_integration():
    # Mock data structure matching app_improved.py output
    mock_totals = {
        "annual_kwh_delta": 17174.0,   # Old Hotspot Value
        "annual_cost_delta": 2061.0,   # Old Cost
        "annual_kwh_theoretical": 135475.2, # New Theoretical Value
        "annual_cost_theoretical": 16257.0  # New Theoretical Cost
    }
    
    components = {
        "wall": {"annual_kwh_total_loss": 100000.0},
        "window": {"annual_kwh_total_loss": 35475.2}
    }
    
    mock_response = {
        "results": {
            "totals": mock_totals,
            "components": components
        },
        "inputs": {
            "fuel_price_eur_per_kwh": 0.12
        }
    }
    
    # Call report builder
    print("Calling report_builder.build_report()...")
    report = build_report(mock_response)
    
    headline = report.get("headline", {})
    loss = headline.get("estimated_annual_heat_loss_kwh")
    cost = headline.get("estimated_annual_cost_eur")
    
    print(f"Report Headline Loss: {loss}")
    print(f"Report Headline Cost: {cost}")
    
    if loss == 135475.2:
        print("✅ SUCCESS: Report Builder is using THEORETICAL TOTALS.")
    elif loss == 17174.0:
        print("❌ FAIL: Report Builder is using HOTSPOT DELTA (Old Logic).")
    else:
        print(f"❌ FAIL: Unknown value {loss}")

if __name__ == "__main__":
    test_integration()
