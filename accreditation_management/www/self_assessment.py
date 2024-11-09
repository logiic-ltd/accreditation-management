import frappe
from frappe import _
import requests
from accreditation_management.config.api_config import SCHOOL_SEARCH_ENDPOINT

@frappe.whitelist(allow_guest=True)
def search_schools(search_term):
    try:
        response = requests.get(SCHOOL_SEARCH_ENDPOINT, params={"name": search_term})
        response.raise_for_status()
        schools = response.json().get('content', [])
        return [
            {
                "name": school.get("schoolName"),
                "code": school.get("schoolCode"),
                "address": f"{school.get('village', '')}, {school.get('cell', '')}, {school.get('sector', '')}, {school.get('district', '')}, {school.get('province', '')}",
                "owner": school.get("schoolOwner")
            }
            for school in schools
        ]
    except requests.RequestException as e:
        frappe.log_error(f"Error searching schools: {str(e)}")
        return []

@frappe.whitelist(allow_guest=True)
def start_self_assessment(school):
    if isinstance(school, str):
        school = frappe.parse_json(school)
    
    school_doc = frappe.get_doc({
        "doctype": "School",
        "school_name": school.get("name"),
        "school_code": school.get("code"),
        "address": school.get("address"),
        "school_owner": school.get("owner")
    })
    school_doc.insert(ignore_permissions=True)

    assessment = frappe.get_doc({
        "doctype": "Self Assessment",
        "school": school_doc.name,
        "status": "In Progress"
    })
    assessment.insert(ignore_permissions=True)

    return f"/self-assessment/{assessment.name}"
