import requests

print("Testing PPT Export...")
resp = requests.post("https://thermal-ai.onrender.com/v1/report/ppt", json={"report": {}, "raw": {}})
print("PPT Status:", resp.status_code)
if resp.status_code != 200:
    print(resp.text[:500])

print("\nTesting PDF Export...")
resp2 = requests.post("https://thermal-ai.onrender.com/v1/report/ppt?format=pdf", json={"report": {}, "raw": {}})
print("PDF Status:", resp2.status_code)
if resp2.status_code != 200:
    print(resp2.text[:500])
