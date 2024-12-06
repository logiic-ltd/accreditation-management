import frappe
import json
from frappe import _

@frappe.whitelist(allow_guest=True)
def submit_claim(form_data):
    try:
        # Create new School Claim document
        claim = frappe.get_doc({
            "doctype": "School Claim",
            "school_code": form_data.get('school_code'),
            "school_name": form_data.get('school_name'),
            "claim_type": form_data.get('claim_type'),
            "claim_description": form_data.get('claim_description'),
            "claimant_name": form_data.get('claimant_name'),
            "claimant_email": form_data.get('claimant_email'),
            "claimant_phone": form_data.get('claimant_phone'),
            "claimant_role": form_data.get('claimant_role'),
            "status": "Draft"
        })
        
        # Handle file attachments
        if form_data.get('attachments'):
            for file_obj in form_data.get('attachments'):
                file_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": file_obj.filename,
                    "content": file_obj.stream.read(),
                    "attached_to_doctype": "School Claim",
                    "attached_to_name": claim.name,
                    "is_private": 1
                })
                file_doc.insert()
        
        claim.insert(ignore_permissions=True)
        
        return {
            "success": True,
            "message": "Claim submitted successfully",
            "claim_id": claim.name
        }
        
    except Exception as e:
        frappe.log_error(f"Error submitting claim: {str(e)}")
        frappe.throw(_("Error submitting claim. Please try again."))
