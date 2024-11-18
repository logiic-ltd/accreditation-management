import frappe
from frappe import _
import json
from datetime import datetime, timedelta

def get_recent_self_assessment(school_code):
    """Get the most recent self assessment within the last 6 months"""
    six_months_ago = datetime.now() - timedelta(days=180)
    
    assessment = frappe.get_list(
        "Self Assessment",
        filters={
            "school_code": school_code,
            "creation": [">=", six_months_ago]
        },
        order_by="creation desc",
        limit=1
    )
    
    return assessment[0].name if assessment else None

def get_school_identification(school_code):
    """Get the school identification document"""
    identification = frappe.get_list(
        "School Identification",
        filters={"school_code": school_code},
        limit=1
    )
    
    return identification[0].name if identification else None

@frappe.whitelist(allow_guest=True)
def validate_prerequisites(school_code):
    try:
        # Check for school identification
        school_id = get_school_identification(school_code)
        if not school_id:
            return {
                "success": False,
                "error": _("Please complete school identification first")
            }
            
        # Check for recent self assessment
        assessment_id = get_recent_self_assessment(school_code)
        if not assessment_id:
            return {
                "success": False,
                "error": _("Please complete a self assessment within the last 6 months before applying")
            }
            
        # Get self assessment score
        assessment = frappe.get_doc("Self Assessment", assessment_id)
        if assessment.overall_score < 60:  # Minimum required score
            return {
                "success": False,
                "error": _("Your self assessment score does not meet minimum requirements")
            }
            
        return {
            "success": True,
            "self_assessment": assessment_id,
            "school_identification": school_id
        }
        
    except Exception as e:
        frappe.logger().error(f"Error validating prerequisites: {str(e)}")
        return {
            "success": False,
            "error": _("Error validating prerequisites. Please try again.")
        }

@frappe.whitelist(allow_guest=True)
def get_prerequisites_summary(school_code):
    try:
        # Get school identification summary
        school_id = get_school_identification(school_code)
        id_summary = {}
        if school_id:
            doc = frappe.get_doc("School Identification", school_id)
            id_summary = {
                "registration_date": frappe.utils.format_date(doc.creation),
                "license_number": doc.name,
                "status": doc.status
            }

        # Get recent self assessment summary
        assessment_id = get_recent_self_assessment(school_code)
        assessment_summary = {}
        if assessment_id:
            doc = frappe.get_doc("Self Assessment", assessment_id)
            assessment_summary = {
                "date": frappe.utils.format_date(doc.creation),
                "overall_score": doc.overall_score,
                "provisional_ranking": doc.provisional_ranking
            }

        return {
            "identification": id_summary,
            "assessment": assessment_summary
        }
    except Exception as e:
        frappe.logger().error(f"Error getting prerequisites summary: {str(e)}")
        return None

@frappe.whitelist(allow_guest=True)
def submit_application(form_data):
    frappe.logger().info(f"Received form data: {form_data}")
    try:
        # Parse the form data
        data = json.loads(form_data)
        frappe.logger().info(f"Parsed data: {data}")
        
        # Validate prerequisites again as a security measure
        prereq_check = validate_prerequisites(data.get("school_code"))
        if not prereq_check["success"]:
            frappe.throw(prereq_check["error"])
        
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
            "owner_telephone": data.get("owner_telephone"),
            # Add the link fields
            "self_assessment": prereq_check["self_assessment"],
            "school_identification": prereq_check["school_identification"]
        })
        
        frappe.logger().info(f"Created doc: {doc.as_dict()}")
        doc.insert(ignore_permissions=True)
        frappe.logger().info(f"Inserted doc with tracking number: {doc.tracking_number}")
        
        # Return the tracking number
        return doc.tracking_number
    except Exception as e:
        frappe.logger().error(f"Error submitting accreditation application: {str(e)}")
        frappe.throw(_("An error occurred while submitting the application. Please try again."))
