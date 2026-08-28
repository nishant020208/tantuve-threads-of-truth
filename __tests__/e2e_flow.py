#!/usr/bin/env python
"""End-to-end flow test for Tantuve - corrected version."""
import httpx, json, sys

BASE = "http://localhost:3000"
client = httpx.Client(base_url=BASE, timeout=30, follow_redirects=True)
RESULTS = []
PRODUCT_ID = None  # Will be set after weaver creates product

def test(name, method, path, headers=None, expect=None, **kwargs):
    try:
        r = getattr(client, method)(path, headers=headers, **kwargs)
        status = r.status_code
        try:
            body = r.json()
        except:
            body = {}
        if expect and status == expect:
            icon = "PASS"
        elif expect and status != expect:
            icon = "FAIL"
        elif status < 400:
            icon = "PASS"
        else:
            icon = "FAIL"
        RESULTS.append((icon, name, status))
        print(f"[{icon}] {name}: {status}")
        if icon == "FAIL":
            print(f"   Body: {json.dumps(body, default=str)[:400]}")
        return r
    except Exception as e:
        RESULTS.append(("ERR", name, str(e)[:100]))
        print(f"[ERR] {name}: {str(e)[:200]}")
        return None

def login(email, password, label):
    r = test(f"POST /api/login ({label})", "post", "/api/login", json={"email": email, "password": password})
    if r and r.status_code == 200:
        data = r.json()
        token = data.get("token")
        user = data.get("user", {})
        role = user.get("role")
        print(f"  -> Role: {role}, Token: {bool(token)}")
        return {"Authorization": f"Bearer {token}"}, role, token
    return None, None, None

# ============================================================
print("=" * 60)
print("PHASE 1: PUBLIC ENDPOINTS")
print("=" * 60)

test("GET /api/stats", "get", "/api/stats")
test("GET /api/explore", "get", "/api/explore")
test("GET /api/marketplace", "get", "/api/marketplace")
test("GET /api/gi-registry", "get", "/api/gi-registry")
test("GET /api/weavers-leaderboard", "get", "/api/weavers-leaderboard")
test("GET /api/map-data", "get", "/api/map-data")

# Get existing product for later tests
r = client.get("/api/explore")
prods = r.json() if r.status_code == 200 else []
if isinstance(prods, dict):
    prods = prods.get("products", prods.get("data", []))
existing_pid = prods[0]["id"] if prods else None

# Verify existing product
if existing_pid:
    r = test(f"GET /api/verify/{existing_pid}", "get", f"/api/verify/{existing_pid}")
    if r and r.status_code == 200:
        vdata = r.json()
        print(f"  -> verified: {vdata.get('verified')}, chain: {len(vdata.get('chain', []))}")

# Disputes with real product
if existing_pid:
    r = test("POST /api/disputes (real product)", "post", "/api/disputes",
             json={"product_id": existing_pid, "reason": "E2E test dispute", "reporter_contact": "test@test.com"})
    dispute_id = r.json().get("id") if r and r.status_code < 400 else None

# Disputes with fake product should fail gracefully (not 500)
r = test("POST /api/disputes (fake product -> 404)", "post", "/api/disputes",
         json={"product_id": "NONEXISTENT", "reason": "test"}, expect=404)

# ============================================================
print()
print("=" * 60)
print("PHASE 2: WEAVER FLOW")
print("=" * 60)

w_headers, w_role, w_token = login("test-weaver@test.com", "TestWeaver123!", "weaver")
if w_headers:
    test("GET /api/me (weaver)", "get", "/api/me", headers=w_headers)
    
    # Create product (field is 'name' per API, not 'full_name')
    r = test("POST /api/weaver/products (create)", "post", "/api/weaver/products",
             headers=w_headers, json={
        "title": "E2E Test Sambalpuri Saree",
        "craft_type": "Sambalpuri Bandha",
        "yarn_source": "Organic cotton from Odisha",
        "lot_id": "LOT-E2E-001"
    })
    
    if r and r.status_code < 400:
        pdata = r.json()
        PRODUCT_ID = pdata.get("productId") or pdata.get("product_id") or pdata.get("id")
        print(f"  -> Product ID: {PRODUCT_ID}")
    
    if PRODUCT_ID:
        test("GET /api/weaver/products (list)", "get", "/api/weaver/products", headers=w_headers)
        test("GET /api/weaver/products/{id} (detail)", "get", f"/api/weaver/products/{PRODUCT_ID}", headers=w_headers)
        
        # Add 4 ledger steps
        steps = [
            {"step_name": "yarn_sourcing", "step_data": {"source": "OD Organic Farm", "fiber": "cotton", "kg": 2.5}},
            {"step_name": "dyeing", "step_data": {"method": "natural indigo", "hours": 8}},
            {"step_name": "weaving", "step_data": {"loom": "pit loom", "pattern": "bandha ikat"}},
            {"step_name": "finishing", "step_data": {"washing": "river wash", "ironing": "hand press"}},
        ]
        all_steps_ok = True
        for i, step in enumerate(steps):
            r = test(f"POST steps ({step['step_name']})", "post",
                     f"/api/weaver/products/{PRODUCT_ID}/steps", headers=w_headers, json=step)
            if r and r.status_code >= 400:
                all_steps_ok = False
                break
        
        # Verify hash chain is intact after steps
        if all_steps_ok:
            r = test(f"GET /api/verify/{PRODUCT_ID} (after steps)", "get", f"/api/verify/{PRODUCT_ID}")
            if r and r.status_code == 200:
                vdata = r.json()
                chain_len = len(vdata.get("chain", []))
                print(f"  -> Chain length: {chain_len}")
                if chain_len > 0:
                    print(f"  -> Hash valid: {vdata.get('hash_valid')}")
        
        test("GET /api/weaver/earnings", "get", "/api/weaver/earnings", headers=w_headers)
        
        # Complete product
        test("POST complete product", "post", f"/api/weaver/products/{PRODUCT_ID}/complete",
             headers=w_headers, json={"price": 4500})
        
        # QR code
        test("GET QR code", "get", f"/api/weaver/products/{PRODUCT_ID}/qr", headers=w_headers)
    else:
        print("  -> CRITICAL: No product_id returned!")
else:
    print("  -> CRITICAL: Cannot login as weaver!")

# ============================================================
print()
print("=" * 60)
print("PHASE 3: RETAILER FLOW")
print("=" * 60)

r_headers, r_role, r_token = login("test-retailer@test.com", "TestRetailer123!", "retailer")
if r_headers:
    test("GET /api/me (retailer)", "get", "/api/me", headers=r_headers)
    
    # Use a completed product
    target_pid = PRODUCT_ID or existing_pid
    if target_pid:
        test("POST /api/retailer/receive", "post", "/api/retailer/receive",
             headers=r_headers, json={"product_id": target_pid, "price": 5200})
        
        test("GET /api/retailer/inventory", "get", "/api/retailer/inventory", headers=r_headers)
        
        test("POST /api/retailer/list-for-sale", "post", "/api/retailer/list-for-sale",
             headers=r_headers, json={"product_id": target_pid, "price": 5200})
        
        # Split (requires retailer role)
        test("POST /api/retailer/split", "post", "/api/retailer/split",
             headers=r_headers, json={"product_id": target_pid, "pieces": 2})
    else:
        print("  -> No product to work with")
else:
    print("  -> CRITICAL: Cannot login as retailer!")

# ============================================================
print()
print("=" * 60)
print("PHASE 4: ADMIN FLOW")
print("=" * 60)

a_headers, a_role, a_token = login("test-admin@test.com", "TestAdmin123!", "admin")
if a_headers:
    test("GET /api/me (admin)", "get", "/api/me", headers=a_headers)
    test("GET /api/admin/dashboard", "get", "/api/admin/dashboard", headers=a_headers)
    test("GET /api/admin/weavers", "get", "/api/admin/weavers", headers=a_headers)
    test("GET /api/admin/retailers", "get", "/api/admin/retailers", headers=a_headers)
    test("GET /api/admin/products", "get", "/api/admin/products", headers=a_headers)
    test("GET /api/admin/analytics", "get", "/api/admin/analytics", headers=a_headers)
    test("GET /api/admin/risk-scores", "get", "/api/admin/risk-scores", headers=a_headers)
    test("GET /api/admin/scan-anomalies", "get", "/api/admin/scan-anomalies", headers=a_headers)
    test("GET /api/admin/disputes", "get", "/api/admin/disputes", headers=a_headers)
    test("GET /api/admin/whitelist", "get", "/api/admin/whitelist", headers=a_headers)
    test("GET /api/admin/registry", "get", "/api/admin/registry", headers=a_headers)
    test("GET /api/admin/registry/custom-fields", "get", "/api/admin/registry/custom-fields", headers=a_headers)
    test("GET /api/admin/scan-history (all)", "get", "/api/admin/scan-history", headers=a_headers)
    
    if existing_pid:
        test(f"GET /api/admin/scan-history/{existing_pid}", "get",
             f"/api/admin/scan-history?product_id={existing_pid}", headers=a_headers)
    
    test("GET /api/admin/spot-checks", "get", "/api/admin/spot-checks", headers=a_headers)
    test("GET /api/admin/flagged", "get", "/api/admin/flagged", headers=a_headers)
    
    # Admin actions - approve pending weaver
    # Get pending weavers
    r = test("GET /api/admin/weavers (pending)", "get", "/api/admin/weavers", headers=a_headers)
    if r and r.status_code == 200:
        weavers = r.json()
        if isinstance(weavers, dict):
            weavers = weavers.get("weavers", weavers.get("data", []))
        pending = [w for w in weavers if w.get("status") == "pending"]
        if pending:
            wid = pending[0]["id"]
            test(f"POST approve weaver {wid[:8]}", "post", f"/api/admin/weavers/{wid}/approve",
                 headers=a_headers, json={"note": "E2E test approval"})
        else:
            print("  -> No pending weavers to approve")
    
    # Admin actions - resolve dispute
    if dispute_id:
        test("POST resolve dispute", "post", f"/api/admin/disputes/{dispute_id}/resolve",
             headers=a_headers, json={"resolution": "E2E test resolution", "status": "resolved"})
else:
    print("  -> CRITICAL: Cannot login as admin!")

# ============================================================
print()
print("=" * 60)
print("PHASE 5: CONSUMER VERIFICATION FLOW")
print("=" * 60)

verify_pid = PRODUCT_ID or existing_pid
if verify_pid:
    r = test(f"GET /api/verify/{verify_pid}", "get", f"/api/verify/{verify_pid}")
    if r and r.status_code == 200:
        vdata = r.json()
        print(f"  -> verified: {vdata.get('verified')}")
        print(f"  -> title: {vdata.get('product', {}).get('title', 'N/A')}")
        print(f"  -> chain length: {len(vdata.get('chain', []))}")
        print(f"  -> hash_valid: {vdata.get('hash_valid')}")
        print(f"  -> ipfs_verified: {vdata.get('ipfs_verified')}")
    
    test("GET reviews", "get", f"/api/verify/{verify_pid}/reviews")
    test("POST review", "post", f"/api/verify/{verify_pid}/reviews",
         json={"rating": 5, "comment": "Excellent quality!", "reviewer_name": "E2E Consumer"})
    test("GET share data", "get", f"/api/verify/{verify_pid}/share")
else:
    print("  -> No product to verify")

# ============================================================
print()
print("=" * 60)
print("PHASE 6: APPLICATION FLOWS")
print("=" * 60)

# apply-weaver uses field 'name' not 'full_name'
r = test("POST /api/apply-weaver", "post", "/api/apply-weaver", json={
    "email": "apply-weaver-e2e@test.com",
    "password": "ApplyWeaver123!",
    "name": "Apply Test Weaver",
    "craft_type": "Patola",
    "region": "Gujarat",
    "bio": "E2E application test"
})

r = test("POST /api/apply-retailer", "post", "/api/apply-retailer", json={
    "email": "apply-retailer-e2e@test.com",
    "password": "ApplyRetailer123!",
    "full_name": "Apply Test Retailer",
    "business_name": "E2E Retail",
    "location": "Delhi"
})

# ============================================================
print()
print("=" * 60)
print("PHASE 7: SPECIAL ENDPOINTS")
print("=" * 60)

if a_headers:
    test("POST /api/sms-simulator", "post", "/api/sms-simulator",
         headers=a_headers, json={
        "phone": "+919876543210",
        "product_id": verify_pid or "TNT-TEST",
        "message": "STEP dyeing Natural indigo batch completed"
    })

if a_headers and verify_pid:
    test("POST /api/coop/sign", "post", "/api/coop/sign",
         headers=a_headers, json={
        "product_id": verify_pid,
        "note": "Quality approved by co-op"
    })

# Rate limiting test - hit stats endpoint rapidly
print()
print("--- Rate Limit Test ---")
for i in range(3):
    r = client.get("/api/stats")
    print(f"  Request {i+1}: {r.status_code}")

# ============================================================
# SUMMARY
print()
print("=" * 60)
print("FINAL SUMMARY")
print("=" * 60)
pass_count = sum(1 for i, _, _ in RESULTS if i == "PASS")
fail_count = sum(1 for i, _, _ in RESULTS if i == "FAIL")
err_count = sum(1 for i, _, _ in RESULTS if i == "ERR")
total = len(RESULTS)
print(f"Total: {total} | PASS: {pass_count} | FAIL: {fail_count} | ERR: {err_count}")
print()
if fail_count > 0 or err_count > 0:
    print("FAILURES:")
    for icon, name, detail in RESULTS:
        if icon in ("FAIL", "ERR"):
            print(f"  [{icon}] {name} -> {detail}")
else:
    print("ALL TESTS PASSED!")
