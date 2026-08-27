"""
Easy Expense — Backend regression tests (Indonesian restructure iteration).

Covers:
  - Categories CRUD (add / rename / duplicate / delete) + rename propagation
  - Projects CRUD (aggregates work_order_count / total / expense_count, cascade delete)
  - Work Orders CRUD (project validation, filter by project_id, detach on delete)
  - Expenses CRUD w/ project + work_order + category filters
  - /api/scan multipart JPEG -> AI extraction (vendor/amount/date/category/notes) + file serving
  - /api/reports/summary (week/month/quarter/year) — no total_tax field
  - /api/reports/export CSV — Indonesian headers + integer amounts
  - /api/projects/{id}/pdf — valid %PDF-1.4 header
"""
import io
import csv
import pytest

STATE = {}


# ---------------- Health ----------------
def test_health(api_client, base_url):
    r = api_client.get(f"{base_url}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------------- Categories ----------------
def test_list_categories_defaults(api_client, base_url):
    r = api_client.get(f"{base_url}/api/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and len(cats) >= 6
    names = {c["name"] for c in cats}
    for expected in ["Makan", "Minum", "Entertain", "Fuel", "Toll", "Office Supplies"]:
        assert expected in names, f"Missing default category: {expected}"
    sample = cats[0]
    for k in ("id", "name", "icon", "color"):
        assert k in sample
    STATE["default_makan_id"] = next(c["id"] for c in cats if c["name"] == "Makan")


def test_create_category_and_duplicate(api_client, base_url):
    r = api_client.post(f"{base_url}/api/categories", json={"name": "TEST_Konsultasi"})
    assert r.status_code == 200, r.text
    c = r.json()
    assert c["name"] == "TEST_Konsultasi"
    STATE["cat_id"] = c["id"]
    # duplicate should be rejected
    r2 = api_client.post(f"{base_url}/api/categories", json={"name": "TEST_Konsultasi"})
    assert r2.status_code == 400


def test_rename_category_propagates(api_client, base_url):
    # create an expense using the category, then rename and verify propagation
    exp_payload = {"vendor": "TEST_PropVendor", "amount": 12345,
                   "category": "TEST_Konsultasi", "date": "2026-01-10"}
    er = api_client.post(f"{base_url}/api/expenses", json=exp_payload)
    assert er.status_code == 200, er.text
    eid = er.json()["id"]
    STATE["prop_expense_id"] = eid

    up = api_client.put(f"{base_url}/api/categories/{STATE['cat_id']}",
                        json={"name": "TEST_KonsultasiRenamed"})
    assert up.status_code == 200
    assert up.json()["name"] == "TEST_KonsultasiRenamed"

    # verify propagation
    ge = api_client.get(f"{base_url}/api/expenses/{eid}")
    assert ge.json()["category"] == "TEST_KonsultasiRenamed"


def test_delete_category(api_client, base_url):
    # cleanup propagation expense
    api_client.delete(f"{base_url}/api/expenses/{STATE['prop_expense_id']}")
    r = api_client.delete(f"{base_url}/api/categories/{STATE['cat_id']}")
    assert r.status_code == 200
    # deleting again -> 404
    r2 = api_client.delete(f"{base_url}/api/categories/{STATE['cat_id']}")
    assert r2.status_code == 404


# ---------------- Projects ----------------
def test_create_project(api_client, base_url):
    r = api_client.post(f"{base_url}/api/projects",
                        json={"name": "TEST_Proyek Alpha", "client": "PT ABC", "color": "#123456"})
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["name"] == "TEST_Proyek Alpha"
    assert p["client"] == "PT ABC"
    STATE["project_id"] = p["id"]


def test_get_project(api_client, base_url):
    r = api_client.get(f"{base_url}/api/projects/{STATE['project_id']}")
    assert r.status_code == 200
    assert r.json()["id"] == STATE["project_id"]


def test_rename_project(api_client, base_url):
    r = api_client.put(f"{base_url}/api/projects/{STATE['project_id']}",
                       json={"name": "TEST_Proyek Alpha v2"})
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_Proyek Alpha v2"


def test_list_projects_aggregates(api_client, base_url):
    r = api_client.get(f"{base_url}/api/projects")
    assert r.status_code == 200
    ours = next((p for p in r.json() if p["id"] == STATE["project_id"]), None)
    assert ours is not None
    for k in ("work_order_count", "total", "expense_count"):
        assert k in ours, f"missing aggregate {k}"


# ---------------- Work Orders ----------------
def test_create_work_order_invalid_project(api_client, base_url):
    r = api_client.post(f"{base_url}/api/work-orders",
                        json={"project_id": "does-not-exist", "name": "TEST_WO"})
    assert r.status_code == 404


def test_create_work_order(api_client, base_url):
    r = api_client.post(f"{base_url}/api/work-orders",
                        json={"project_id": STATE["project_id"], "name": "TEST_WO-001"})
    assert r.status_code == 200, r.text
    w = r.json()
    assert w["project_id"] == STATE["project_id"]
    STATE["wo_id"] = w["id"]


def test_list_work_orders_by_project(api_client, base_url):
    r = api_client.get(f"{base_url}/api/work-orders",
                       params={"project_id": STATE["project_id"]})
    assert r.status_code == 200
    ids = [w["id"] for w in r.json()]
    assert STATE["wo_id"] in ids
    sample = next(w for w in r.json() if w["id"] == STATE["wo_id"])
    assert "total" in sample and "expense_count" in sample


def test_rename_work_order(api_client, base_url):
    r = api_client.put(f"{base_url}/api/work-orders/{STATE['wo_id']}",
                       json={"name": "TEST_WO-001b"})
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_WO-001b"


# ---------------- Expenses ----------------
def test_create_expense_with_hierarchy(api_client, base_url):
    payload = {
        "vendor": "TEST_Warung Kita",
        "amount": 235000,
        "date": "2026-01-10",
        "category": "Makan",
        "project_id": STATE["project_id"],
        "work_order_id": STATE["wo_id"],
        "notes": "Test lunch",
        "is_billable": True,
    }
    r = api_client.post(f"{base_url}/api/expenses", json=payload)
    assert r.status_code == 200, r.text
    e = r.json()
    assert e["vendor"] == "TEST_Warung Kita"
    assert e["amount"] == 235000
    assert e["project_id"] == STATE["project_id"]
    assert e["work_order_id"] == STATE["wo_id"]
    # ensure legacy fields are absent
    assert "tax" not in e
    assert "currency" not in e
    STATE["expense_id"] = e["id"]


def test_list_expenses_filters(api_client, base_url):
    # by category
    r = api_client.get(f"{base_url}/api/expenses", params={"category": "Makan"})
    assert r.status_code == 200
    assert all(x["category"] == "Makan" for x in r.json())
    # by project
    r = api_client.get(f"{base_url}/api/expenses",
                       params={"project_id": STATE["project_id"]})
    assert r.status_code == 200
    assert all(x["project_id"] == STATE["project_id"] for x in r.json())
    # by work order
    r = api_client.get(f"{base_url}/api/expenses",
                       params={"work_order_id": STATE["wo_id"]})
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert STATE["expense_id"] in ids
    # search
    r = api_client.get(f"{base_url}/api/expenses", params={"search": "Warung"})
    assert any(x["id"] == STATE["expense_id"] for x in r.json())
    # "Semua" should return everything
    r = api_client.get(f"{base_url}/api/expenses", params={"category": "Semua"})
    assert r.status_code == 200


def test_update_expense(api_client, base_url):
    eid = STATE["expense_id"]
    r = api_client.put(f"{base_url}/api/expenses/{eid}",
                       json={"amount": 260000, "notes": "updated"})
    assert r.status_code == 200
    assert r.json()["amount"] == 260000
    g = api_client.get(f"{base_url}/api/expenses/{eid}")
    assert g.json()["notes"] == "updated"


# ---------------- Scan (AI) ----------------
def test_scan_receipt(api_client, base_url, receipt_jpeg_bytes):
    files = {"file": ("receipt.jpg", receipt_jpeg_bytes, "image/jpeg")}
    r = api_client.post(f"{base_url}/api/scan", files=files, timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("receipt_path")
    ex = d["extracted"]
    for k in ("vendor", "amount", "date", "category", "notes"):
        assert k in ex, f"missing key {k}"
    # legacy fields must be absent
    assert "tax" not in ex
    assert "currency" not in ex
    STATE["receipt_path"] = d["receipt_path"]
    STATE["scan_failed"] = d.get("extraction_failed", False)


def test_get_uploaded_file(api_client, base_url):
    if "receipt_path" not in STATE:
        pytest.skip("scan didn't run")
    r = api_client.get(f"{base_url}/api/files/{STATE['receipt_path']}")
    assert r.status_code == 200
    assert r.headers.get("Content-Type", "").startswith("image/")
    assert len(r.content) > 100


# ---------------- Reports ----------------
@pytest.mark.parametrize("period", ["week", "month", "quarter", "year"])
def test_reports_summary(api_client, base_url, period):
    r = api_client.get(f"{base_url}/api/reports/summary", params={"period": period})
    assert r.status_code == 200
    d = r.json()
    for k in ("period", "total", "count", "by_category", "by_project", "trend"):
        assert k in d, f"missing {k}"
    assert "total_tax" not in d, "total_tax must be removed"
    assert d["period"] == period
    assert isinstance(d["by_category"], list)
    assert isinstance(d["by_project"], list)
    assert isinstance(d["trend"], list) and len(d["trend"]) == 6


def test_reports_export_csv_indonesian(api_client, base_url):
    r = api_client.get(f"{base_url}/api/reports/export")
    assert r.status_code == 200
    assert r.headers.get("Content-Type", "").startswith("text/csv")
    reader = csv.reader(io.StringIO(r.text))
    rows = list(reader)
    assert rows[0] == ["Tanggal", "Vendor", "Kategori", "Proyek",
                       "Work Order", "Jumlah (Rp)", "Billable", "Catatan"]
    # our test expense present
    ours = [row for row in rows[1:] if row[1] == "TEST_Warung Kita"]
    assert ours, "expense not in CSV"
    # amount must be integer (no decimals)
    assert ours[0][5].isdigit(), f"amount is not integer: {ours[0][5]}"
    assert ours[0][6] in ("Ya", "Tidak")


def test_project_pdf_export(api_client, base_url):
    r = api_client.get(f"{base_url}/api/projects/{STATE['project_id']}/pdf")
    assert r.status_code == 200
    assert r.headers.get("Content-Type", "").startswith("application/pdf")
    assert r.content.startswith(b"%PDF-"), "invalid PDF header"
    assert len(r.content) > 500


# ---------------- Cleanup / cascades ----------------
def test_delete_work_order_detaches(api_client, base_url):
    r = api_client.delete(f"{base_url}/api/work-orders/{STATE['wo_id']}")
    assert r.status_code == 200
    # expense should still exist but with work_order_id=None
    g = api_client.get(f"{base_url}/api/expenses/{STATE['expense_id']}")
    assert g.status_code == 200
    assert g.json()["work_order_id"] is None


def test_delete_project_cascades(api_client, base_url):
    r = api_client.delete(f"{base_url}/api/projects/{STATE['project_id']}")
    assert r.status_code == 200
    # expense project_id should now be None (detached)
    g = api_client.get(f"{base_url}/api/expenses/{STATE['expense_id']}")
    assert g.status_code == 200
    assert g.json()["project_id"] is None
    # project GET should be 404
    gp = api_client.get(f"{base_url}/api/projects/{STATE['project_id']}")
    assert gp.status_code == 404


def test_final_cleanup_expense(api_client, base_url):
    r = api_client.delete(f"{base_url}/api/expenses/{STATE['expense_id']}")
    assert r.status_code == 200
    g = api_client.get(f"{base_url}/api/expenses/{STATE['expense_id']}")
    assert g.status_code == 404
