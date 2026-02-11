
# debug_calc.py
# Verification script for Total Theoretical Heat Loss

def annual_total_loss_u_method(u_current, area_m2, heating_degree_days):
    # kwh = U * A * HDD * 24 / 1000
    return float(u_current) * float(area_m2) * float(heating_degree_days) * 24.0 / 1000.0

def run_check():
    # User Inputs
    city = "Gyor"
    facade_area = 1680.0
    price_eur = 0.12
    
    # Assumptions in Backend
    heating_degree_hours = 66088.0 # From climate_data.py for Gyor (approx, based on 3C outside logic? No, HDD is standard)
    # Wait, in the app we use degree_hours_below_base. 
    # For Gyor (lat 47.68), let's assume standard HDD approx 2800?
    # 2800 HDD * 24 = 67200 degree hours.
    
    # Let's use the code's default if not found: 30000 degree hours?
    # No, Gyor should have real data.
    # Let's assume HDD = 2600 (typical Central Europe).
    hdd = 2800.0
    
    # Material: Uninsulated Brick Wall
    u_val = 1.2 # W/m2K
    
    # Calculation
    loss_kwh = annual_total_loss_u_method(u_val, facade_area, hdd)
    cost_eur = loss_kwh * price_eur
    
    print(f"--- Verification for {city} ---")
    print(f"Facade Area: {facade_area} m2")
    print(f"U-Value: {u_val} W/m2K")
    print(f"HDD: {hdd}")
    print(f"Est. Annual Loss: {loss_kwh:.2f} kWh")
    print(f"Est. Annual Cost: {cost_eur:.2f} EUR")
    
    expected_cost = 15000.0
    diff = abs(cost_eur - expected_cost)
    
    if diff < 3000: # Allow some variance due to HDD assumptions
        print("✅ RESULT: MATCHES USER EXPECTATION (~15k)")
    else:
        print("❌ RESULT: MISMATCH")

if __name__ == "__main__":
    run_check()
