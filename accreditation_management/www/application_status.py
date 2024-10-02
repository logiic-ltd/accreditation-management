import frappe

@frappe.whitelist(allow_guest=True)
def get_application_status(tracking_number):
    application = frappe.get_doc("Accreditation", {"tracking_number": tracking_number})
    if application:
        return {
            "status": application.status,
            "school_name": application.school_name,
            "creation": application.creation.strftime("%Y-%m-%d %H:%M:%S")
        }
    return None
