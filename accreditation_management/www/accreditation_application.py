import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def submit_application(form_data):
    try:
        # Parse the form data
        data = frappe.parse_json(form_data)
        
        # Create a new Accreditation document
        doc = frappe.get_doc({
            "doctype": "Accreditation",
            "school_name": data.get("school_name"),
            "mission": data.get("mission"),
            "objective": data.get("objective"),
            "curriculum": data.get("curriculum"),
            "establishment_year": data.get("establishment_year"),
            "school_email": data.get("school_email"),
            "school_telephone": data.get("school_telephone"),
            "village": data.get("village"),
            "cell": data.get("cell"),
            "sector": data.get("sector"),
            "district": data.get("district"),
            "province": data.get("province")
        })
        
        doc.insert(ignore_permissions=True)
        
        # Return the tracking number
        return doc.tracking_number
    except Exception as e:
        frappe.log_error(f"Error submitting accreditation application: {str(e)}")
        frappe.throw(_("An error occurred while submitting the application. Please try again."))
