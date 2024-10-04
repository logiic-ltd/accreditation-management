import frappe

@frappe.whitelist(allow_guest=True)
def verify_certificate(tracking_number):
    application = frappe.get_doc("Accreditation", {"tracking_number": tracking_number})
    if application and application.workflow_state == "Approved":
        return {
            "school_name": application.school_name,
            "status": application.workflow_state,
            "issue_date": application.modified.strftime("%B %d, %Y"),
            "curriculum": application.curriculum,
            "establishment_year": application.establishment_year,
            "school_email": application.school_email,
            "school_telephone": application.school_telephone,
            "village": application.village,
            "cell": application.cell,
            "sector": application.sector,
            "district": application.district,
            "province": application.province
        }
    return None
