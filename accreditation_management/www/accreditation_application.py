import frappe
from frappe import _
import json

@frappe.whitelist(allow_guest=True)
def submit_application(form_data):
    frappe.logger().info(f"Received form data: {form_data}")
    try:
        # Parse the form data
        data = json.loads(form_data)
        frappe.logger().info(f"Parsed data: {data}")
        
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
            "province": data.get("province"),
            "owner_name": data.get("owner_name"),
            "owner_email": data.get("owner_email"),
            "owner_telephone": data.get("owner_telephone")
        })
        
        frappe.logger().info(f"Created doc: {doc.as_dict()}")
        doc.insert(ignore_permissions=True)
        frappe.logger().info(f"Inserted doc with tracking number: {doc.tracking_number}")
        
        # Return the tracking number
        return doc.tracking_number
    except Exception as e:
        frappe.logger().error(f"Error submitting accreditation application: {str(e)}")
        frappe.throw(_("An error occurred while submitting the application. Please try again."))
