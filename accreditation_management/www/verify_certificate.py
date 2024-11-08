import frappe

@frappe.whitelist(allow_guest=True)
def verify_certificate(tracking_number):
    application = frappe.get_doc("Accreditation", {"tracking_number": tracking_number})
    if application:
        if application.status == "Approved" and application.certificate_generated:
            return {
                "school_name": application.school_name,
                "status": application.status,
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
        elif application.status != "Approved":
            return {"error": "The application is still in progress."}
    return {"error": "Invalid or expired certificate."}
