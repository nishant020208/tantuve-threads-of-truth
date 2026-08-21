"""
Tantuve Demo Data Seeder — uses Supabase Auth
Run: cd backend && PYTHONIOENCODING=utf-8 python -m scripts.seed_demo
"""

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from supabase import create_client
from app.core.config import get_settings
from app.services.chain import compute_entry_hash, generate_product_code, verify_chain

DEMO_PASSWORD = "tantu@2008"
DEFAULT_PHOTO_CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"

ADMIN_EMAIL = "admin@gmail.com"

WEAVERS = [
    {"email": "wev1@gmail.com", "name": "Rameshwar Patolawala", "craft_type": "Patola", "region": "Gujarat", "bio": "Fourth-generation Patola weaver from Patan."},
    {"email": "wev2@gmail.com", "name": "Sita Sambalpuri", "craft_type": "Sambalpuri Bandha", "region": "Odisha", "bio": "Master weaver of traditional Sambalpuri bandha textiles."},
    {"email": "wev3@gmail.com", "name": "Arjun Banaraswala", "craft_type": "Banarasi Silk", "region": "Uttar Pradesh", "bio": "Weaving Banarasi silk brocades in Varanasi for 20 years."},
    {"email": "wev4@gmail.com", "name": "Kavitha Kanjeevaram", "craft_type": "Kanjeevaram", "region": "Tamil Nadu", "bio": "Authentic Kanjeevaram silk sarees with temple border motifs."},
    {"email": "wev5@gmail.com", "name": "Prasad Ikatmaster", "craft_type": "Ikat", "region": "Telangana", "bio": "Pochampally ikat weaving with geometric patterns."},
]

RETAILERS = [
    {"email": "ret1@gmail.com", "name": "Heritage Textiles Mumbai", "business_name": "Heritage Textiles", "location": "Mumbai, Maharashtra"},
    {"email": "ret2@gmail.com", "name": "Silk Route Emporium", "business_name": "Silk Route Emporium", "location": "Delhi, NCR"},
    {"email": "ret3@gmail.com", "name": "Weave India Online", "business_name": "Weave India", "location": "Bangalore, Karnataka"},
    {"email": "ret4@gmail.com", "name": "Desi Loom Store", "business_name": "Desi Loom", "location": "Kolkata, West Bengal"},
    {"email": "ret5@gmail.com", "name": "Traditional Threads", "business_name": "Traditional Threads", "location": "Hyderabad, Telangana"},
]


def get_client():
    s = get_settings()
    return create_client(s.SUPABASE_URL, s.SUPABASE_SERVICE_ROLE_KEY)


def create_auth_user(supabase_admin, email, password):
    """Create a user via Supabase Auth and return the user ID."""
    try:
        resp = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        user_id = resp.user.id
        print(f"  + Auth user created: {email} (id={user_id})")
        return user_id
    except Exception as e:
        if "already registered" in str(e).lower() or "already exists" in str(e).lower():
            # User exists, try to get their ID via list_users
            try:
                resp = supabase_admin.auth.admin.list_users()
                for u in resp:
                    if u.email == email:
                        print(f"  - Auth user exists: {email} (id={u.id})")
                        return u.id
            except Exception as list_err:
                print(f"  [WARN] list_users failed: {list_err}")
            # If list_users failed, try getting from profiles by email
            try:
                prof = client.table("profiles").select("id").eq("email", email).execute()
                rows = prof.data if hasattr(prof, "data") else []
                if rows:
                    print(f"  - Auth user exists (from profile): {email} (id={rows[0]['id']})")
                    return rows[0]["id"]
            except Exception:
                pass
            print(f"  - Auth user exists (ID unknown): {email}")
            return None
        print(f"  [WARN] Auth user creation failed: {e}")
        return None


def seed_profile(client, user_id, full_name, email=None):
    """Create or update a profile."""
    existing = client.table("profiles").select("id").eq("id", user_id).execute()
    rows = existing.data if hasattr(existing, "data") else []
    if not rows:
        record = {"id": user_id, "full_name": full_name}
        if email:
            record["email"] = email
        try:
            client.table("profiles").insert(record).execute()
            print(f"  + Profile: {full_name}")
        except Exception as e:
            # Try without email column
            try:
                client.table("profiles").insert({"id": user_id, "full_name": full_name}).execute()
                print(f"  + Profile (no email col): {full_name}")
            except Exception as e2:
                print(f"  [WARN] Profile creation failed: {e2}")
    else:
        print(f"  - Profile exists: {full_name}")


def seed_user_role(client, user_id, role):
    """Create a user_roles entry."""
    existing = client.table("user_roles").select("id").eq("user_id", user_id).execute()
    rows = existing.data if hasattr(existing, "data") else []
    if not rows:
        client.table("user_roles").insert({"user_id": user_id, "role": role}).execute()
        print(f"  + Role: {role}")
    else:
        print(f"  - Role exists: {role}")


def seed_admin(client, supabase_admin):
    print("\n-- Seeding admin account --")
    user_id = create_auth_user(supabase_admin, ADMIN_EMAIL, DEMO_PASSWORD)
    if user_id:
        seed_profile(client, user_id, "GI Authority Admin", ADMIN_EMAIL)
        seed_user_role(client, user_id, "admin")
    return user_id


def seed_weavers(client, supabase_admin):
    print("\n-- Seeding weaver accounts --")
    weaver_ids = []
    for w in WEAVERS:
        user_id = create_auth_user(supabase_admin, w["email"], DEMO_PASSWORD)
        if user_id:
            seed_profile(client, user_id, w["name"], w["email"])
            seed_user_role(client, user_id, "weaver")

            existing = client.table("weavers").select("id").eq("user_id", user_id).limit(1).execute()
            rows = existing.data if hasattr(existing, "data") else []
            if not rows:
                client.table("weavers").insert({
                    "user_id": user_id, "name": w["name"],
                    "craft_type": w["craft_type"], "region": w["region"],
                    "bio": w["bio"], "gi_registered": True,
                    "status": "approved",
                }).execute()
                print(f"  + Weaver: {w['name']} ({w['craft_type']})")
            else:
                client.table("weavers").update({"status": "approved", "gi_registered": True}).eq("user_id", user_id).execute()
                print(f"  - Weaver ensured approved: {w['name']}")

            weaver_ids.append({"email": w["email"], "user_id": user_id, "name": w["name"]})
    return weaver_ids


def seed_retailers(client, supabase_admin):
    print("\n-- Seeding retailer accounts --")
    for r in RETAILERS:
        user_id = create_auth_user(supabase_admin, r["email"], DEMO_PASSWORD)
        if user_id:
            seed_profile(client, user_id, r["name"], r["email"])
            seed_user_role(client, user_id, "retailer")

            existing = client.table("retailers").select("id").eq("user_id", user_id).limit(1).execute()
            rows = existing.data if hasattr(existing, "data") else []
            if not rows:
                # Use only columns that exist in the retailers table
                try:
                    client.table("retailers").insert({
                        "user_id": user_id, "name": r["name"],
                        "location": r["location"],
                    }).execute()
                    print(f"  + Retailer: {r['name']}")
                except Exception as e:
                    print(f"  [WARN] Retailer insert failed: {e}")
            else:
                print(f"  - Retailer exists: {r['name']}")


def create_product(client, weaver_user_id, weaver_name, title, craft_type, yarn_source, steps_data):
    from app.services.ipfs import pin_json

    code = generate_product_code()

    resp = client.table("weavers").select("id, name").eq("user_id", weaver_user_id).limit(1).execute()
    rows = resp.data if hasattr(resp, "data") else []
    if not rows:
        print(f"    [ERROR] Weaver not found")
        return None
    weaver_id = rows[0]["id"]

    client.table("products").insert({
        "id": code, "weaver_id": weaver_id, "title": title,
        "craft_type": craft_type, "yarn_source": yarn_source, "status": "in_progress",
    }).execute()
    print(f"    + Product: {code} - {title}")

    previous_hash = None
    now = datetime.now(timezone.utc)

    for i, step in enumerate(steps_data):
        seq = i + 1
        timestamp = (now - timedelta(hours=len(steps_data) - i)).isoformat()
        entry_hash = compute_entry_hash(code, seq, step["step_name"], step["step_data"], timestamp, previous_hash)

        client.table("ledger_entries").insert({
            "product_id": code, "seq": seq, "step_name": step["step_name"],
            "step_data": step["step_data"], "actor": weaver_name,
            "timestamp": timestamp, "entry_hash": entry_hash,
            "previous_entry_hash": previous_hash,
        }).execute()
        previous_hash = entry_hash
        print(f"    + Step {seq}: {step['step_name']}")

    entries_resp = client.table("ledger_entries").select("*").eq("product_id", code).order("seq").execute()
    entries = entries_resp.data if hasattr(entries_resp, "data") else []
    verification = verify_chain(entries)
    if not verification["valid"]:
        print(f"    [ERROR] Chain verification failed")
        return None

    final_hash = verification["finalHash"]
    ipfs_record = {
        "productId": code, "finalHash": final_hash,
        "weaverId": weaver_id, "weaverName": weaver_name,
        "craftType": craft_type, "timestamp": datetime.now(timezone.utc).isoformat(),
        "entryCount": len(entries), "stepPhotos": [],
    }

    try:
        cid = pin_json(ipfs_record, name=f"tantuve-{code}")
        print(f"    + IPFS: {cid}")
    except Exception as e:
        print(f"    [WARN] IPFS failed: {e}")
        cid = None

    client.table("products").update({"status": "completed"}).eq("id", code).execute()
    if cid:
        try:
            client.table("products").update({"ipfs_cid": cid}).eq("id", code).execute()
        except Exception:
            pass

    import random
    if random.random() < 0.12:
        try:
            client.table("products").update({"spot_check_selected": True, "spot_check_status": "pending"}).eq("id", code).execute()
        except Exception:
            pass

    print(f"    [OK] Completed: {code}")
    return code


def seed_products(client, weaver_ids):
    print("\n-- Seeding completed products --")
    products = [
        {"wi": 0, "title": "Red Patola Double Ikat Saree", "craft_type": "Patola", "yarn_source": "Gujarat organic cotton farm", "steps": [
            {"step_name": "yarn_sourcing", "step_data": {"source": "Gujarat organic cotton farm", "yarn_type": "Cotton", "quantity": "500g"}},
            {"step_name": "dyeing", "step_data": {"method": "Natural dye - madder root", "colors": "Red, maroon, gold", "duration": "3 days"}},
            {"step_name": "weaving", "step_data": {"loom": "Traditional pit loom", "technique": "Double ikat", "duration": "45 days"}},
            {"step_name": "finishing", "step_data": {"washing": "Cold water", "pressing": "Steam iron", "quality": "Premium"}},
        ]},
        {"wi": 1, "title": "Sambalpuri Cotton Bandha Saree", "craft_type": "Sambalpuri Bandha", "yarn_source": "Odisha handspun cotton cooperative", "steps": [
            {"step_name": "yarn_sourcing", "step_data": {"source": "Odisha handspun cotton cooperative", "yarn_type": "Handspun cotton", "quantity": "400g"}},
            {"step_name": "dyeing", "step_data": {"method": "Traditional tie-dye bandha", "colors": "White, indigo, red", "duration": "5 days"}},
            {"step_name": "weaving", "step_data": {"loom": "Frame loom", "technique": "Single ikat bandha", "duration": "30 days"}},
            {"step_name": "finishing", "step_data": {"washing": "River water soak", "pressing": "Hand pressed", "quality": "Standard"}},
        ]},
        {"wi": 2, "title": "Banarasi Gold Zari Silk Saree", "craft_type": "Banarasi Silk", "yarn_source": "Varanasi silk market", "steps": [
            {"step_name": "yarn_sourcing", "step_data": {"source": "Varanasi silk market", "yarn_type": "Pure silk + gold zari", "quantity": "600g"}},
            {"step_name": "dyeing", "step_data": {"method": "Acid dye for silk", "colors": "Royal blue, gold", "duration": "2 days"}},
            {"step_name": "weaving", "step_data": {"loom": "Jacquard loom", "technique": "Brocade weaving", "duration": "60 days"}},
            {"step_name": "finishing", "step_data": {"washing": "Silk-safe wash", "pressing": "Steam press", "quality": "Luxury"}},
        ]},
    ]

    for p in products:
        w = weaver_ids[p["wi"]]
        print(f"\n  Creating product for {w['name']}...")
        code = create_product(client, w["user_id"], w["name"], p["title"], p["craft_type"], p["yarn_source"], p["steps"])
        if code:
            print(f"  -> /verify/{code}")


def main():
    print("=" * 50)
    print("  Tantuve Demo Data Seeder")
    print("=" * 50)

    client = get_client()

    # Create admin client for auth operations
    s = get_settings()
    supabase_admin = create_client(s.SUPABASE_URL, s.SUPABASE_SERVICE_ROLE_KEY)

    admin_id = seed_admin(client, supabase_admin)
    weaver_ids = seed_weavers(client, supabase_admin)
    seed_retailers(client, supabase_admin)
    if weaver_ids:
        seed_products(client, weaver_ids)

    print("\n" + "=" * 50)
    print("  Demo Credentials")
    print("=" * 50)
    print(f"  Admin:     admin@gmail.com / {DEMO_PASSWORD}")
    print(f"  Weavers:   wev1-5@gmail.com / {DEMO_PASSWORD}")
    print(f"  Retailers: ret1-5@gmail.com / {DEMO_PASSWORD}")
    print("=" * 50)


if __name__ == "__main__":
    main()
