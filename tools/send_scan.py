"""Stand-in for the scanner: sends one fake board to ThingSpeak.  pip install requests
Usage: python send_scan.py WRITE_KEY "A x B" 520 40 20 650   (cross hatched unhatched dead lux)"""
import sys, requests
key, cross, h, u, d, lux = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
t = h + u + d
r = requests.get("https://api.thingspeak.com/update.json", params={"api_key": key, "field1": h, "field2": u, "field3": d,
    "field4": round(h/t*100, 1), "field5": round(d/t*100, 1), "field6": round(u/t*100, 1), "field7": lux, "field8": 1, "status": cross})
print("entry id:", r.text, "(0 means wait 15 s and retry)")
