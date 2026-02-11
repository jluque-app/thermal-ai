
import requests
import os

# Configuration
API_URL = "https://thermal-ai.onrender.com/analyze"
# Use local test images (assuming they exist in root or scratch)
RGB_PATH = "9026 Gyor, Egyetem ter 1_K0_Facade_West_Facade_0_Z.jpg"
THERMAL_PATH = "9026 Gyor, Egyetem ter 1_K0_Facade_West_Facade_0_T.JPG"

def test_live():
    if not os.path.exists(RGB_PATH) or not os.path.exists(THERMAL_PATH):
        print("❌ Test images not found in current directory.")
        return

    print(f"Testing Live API: {API_URL}")
    
    files = {
        'rgb_image': open(RGB_PATH, 'rb'),
        'thermal_image': open(THERMAL_PATH, 'rb')
    }
    
    data = {
        'city': 'Gyor',
        'country': 'Hungary',
        'facade_area_m2': '1680',
        'fuel_price_eur_per_kwh': '0.12',
        't_outside': '3',
        't_inside': '22',
        'heating_base_temp_c': '13',
        # Force include raw to check meta
        'include_rgb_base64': 'false', 
        'include_thermal_base64': 'false'
    }
    
    try:
        resp = requests.post(API_URL, files=files, data=data, timeout=60)
        
        if resp.status_code != 200:
            print(f"❌ API Error: {resp.status_code}")
            print(resp.text[:500])
            return
            
        json_resp = resp.json()
        report = json_resp.get('report', {})
        headline = report.get('headline', {})
        meta = report.get('meta', {})
        
        loss_kwh = headline.get('estimated_annual_heat_loss_kwh')
        cost_eur = headline.get('estimated_annual_cost_eur')
        version = meta.get('version', 'Unknown')
        
        print("-" * 30)
        print(f"Version Stamp: {version}")
        print(f"Annual Loss: {loss_kwh:,.0f} kWh")
        print(f"Annual Cost: {cost_eur:,.0f} EUR")
        print("-" * 30)
        
        if "TotalLossFix" in version:
            print("✅ Server is running UPDATED code.")
        else:
            print("❌ Server is running OLD code (Version stamp missing).")
            
        if cost_eur > 10000:
            print("✅ Calculation seems correct (~16k).")
        else:
            print(f"❌ Calculation is LOW (Hotspot only?). Expected ~16k, got {cost_eur}")

    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_live()
