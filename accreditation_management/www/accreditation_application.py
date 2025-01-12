import frappe
from frappe import _
import json
from datetime import datetime, timedelta

def get_self_assessments(school_code):
    """Get all self assessments for the school"""
    assessments = frappe.get_list(
        "Self Assessment",
        filters={"school_code": school_code},
        fields=["name", "creation", "type_of_request", "overall_score", "provisional_ranking", "provisional_accreditation_years"],
        order_by="creation desc"
    )
    
    return assessments

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
            
        # Check for self assessment
        assessments = get_self_assessments(school_code)
        if not assessments:
            return {
                "success": False,
                "error": _("Please complete a self assessment before applying")
            }
            
        # Get most recent self assessment score
        assessment = frappe.get_doc("Self Assessment", assessments[0].name)
        if assessment.overall_score < 60:  # Minimum required score
            return {
                "success": False,
                "error": _("Your self assessment score does not meet minimum requirements")
            }
            
        return {
            "success": True,
            "self_assessment": assessments[0].name,
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
                "registration_number": doc.name,
                "status": doc.status
            }

        # Get all self assessments
        assessments = get_self_assessments(school_code)
        assessment_summaries = []
        for assessment in assessments:
            assessment_summaries.append({
                "id": assessment.name,
                "date": frappe.utils.format_date(assessment.creation),
                "type_of_request": assessment.type_of_request,
                "overall_score": assessment.overall_score,
                "provisional_ranking": assessment.provisional_ranking,
                "provisional_years": assessment.provisional_accreditation_years
            })

        # Check prerequisites status
        has_identification = bool(school_id)
        has_assessment = bool(assessments)
        
        # Use most recent assessment ID if exists
        assessment_id = assessments[0].name if assessments else None
        
        # Store the actual document IDs
        return {
            "identification": id_summary if has_identification else {},
            "assessment": assessment_summaries if has_assessment else [],
            "prerequisites_met": has_identification and has_assessment,
            "school_id": school_id,
            "assessment_id": assessment_id
        }
    except Exception as e:
        frappe.logger().error(f"Error getting prerequisites summary: {str(e)}")
        return None

# This function is no longer needed as we're using frappe.client.insert directly
# Keeping the file for other utility functions

@frappe.whitelist(allow_guest=True)
def create_school(school_data):
    """Create a new school record"""
    try:
        # Parse the school data if it's a string
        if isinstance(school_data, str):
            school_data = json.loads(school_data)
            
        # Create new school doc
        school = frappe.get_doc({
            "doctype": "School",
            "school_name": school_data.get("schoolName"),
            "province": school_data.get("province"),
            "district": school_data.get("district"),
            "sector": school_data.get("sector"),
            "cell": school_data.get("cell"),
            "village": school_data.get("village"),
            "status": school_data.get("schoolStatus"),
            "school_owner": school_data.get("schoolOwner"),
            "latitude": school_data.get("latitude"),
            "longitude": school_data.get("longitude"),
            "day": school_data.get("day"),
            "boarding": school_data.get("boarding"),
            "school_email": school_data.get("schoolEmail")
        })
        
        school.insert()
        
        return {
            "success": True,
            "message": _("School registered successfully"),
            "school_code": school.name
        }
        
    except Exception as e:
        frappe.logger().error(f"Error creating school: {str(e)}")
        return {
            "success": False,
            "message": _("Failed to register school. Please try again.")
        }
