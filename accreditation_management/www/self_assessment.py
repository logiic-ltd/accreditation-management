import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def search_schools(search_term):
    schools = frappe.get_all(
        "School",
        filters=[["name", "like", f"%{search_term}%"]],
        fields=["name", "address", "contact_person", "email"]
    )
    return schools

@frappe.whitelist(allow_guest=True)
def start_self_assessment(school):
    if isinstance(school, str):
        school = frappe.parse_json(school)
    
    if frappe.db.exists("School", school.get("name")):
        school_doc = frappe.get_doc("School", school.get("name"))
    else:
        school_doc = frappe.get_doc({
            "doctype": "School",
            "school_name": school.get("name"),
            "address": school.get("address"),
            "contact_person": school.get("contact"),
            "email": school.get("email")
        })
        school_doc.insert(ignore_permissions=True)

    assessment = frappe.get_doc({
        "doctype": "Self Assessment",
        "school": school_doc.name,
        "status": "In Progress"
    })
    assessment.insert(ignore_permissions=True)

    return f"/self-assessment/{assessment.name}"
