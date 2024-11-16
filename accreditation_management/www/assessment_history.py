import frappe
from frappe import _
from accreditation_management.www.self_assessment import search_schools

@frappe.whitelist(allow_guest=True)
def get_school_history(school_code):
    school = frappe.get_doc("School Identification", {"school_code": school_code})
    if not school:
        return None

    assessments = frappe.get_all(
        "Self Assessment",
        filters={"school_name": school.school_name},
        fields=["name", "submission_date as date", "overall_score", "provisional_ranking as ranking"],
        order_by="submission_date desc"
    )

    accreditations = frappe.get_all(
        "Accreditation",
        filters={"school_name": school.school_name},
        fields=["name", "application_date as date", "status", "accreditation_decision as decision"],
        order_by="application_date desc"
    )

    return {
        "school_name": school.school_name,
        "assessments": assessments,
        "accreditations": accreditations
    }
