import frappe
import json
from frappe import _
from frappe.utils import now

@frappe.whitelist()
def submit_application(data):
    """
    Handle the submission of the complete accreditation application
    """
    try:
        # Parse the JSON data
        form_data = json.loads(data)
        
        # Create School Identification
        school_id = create_school_identification(form_data)
        
        # Create Self Assessment
        assessment_id = create_self_assessment(form_data, school_id)
        
        # Create Accreditation Application
        accreditation = create_accreditation(form_data, school_id, assessment_id)
        
        return {
            "success": True,
            "message": "Application submitted successfully",
            "tracking_number": accreditation.name
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Accreditation Wizard Error")
        frappe.throw(_("Error submitting application: {0}").format(str(e)))

def create_school_identification(data):
    """Create school identification document"""
    school = frappe.get_doc({
        "doctype": "School Identification",
        "school_name": data.get("school_name"),
        "school_code": data.get("school_code"),
        "status": data.get("status"),
        "type_of_school": data.get("type_of_school"),
        "year_of_establishment": data.get("year_of_establishment"),
        "number_of_boys": data.get("number_of_boys"),
        "number_of_girls": data.get("number_of_girls"),
        "number_of_male_teachers": data.get("number_of_male_teachers"),
        "number_of_female_teachers": data.get("number_of_female_teachers")
    })
    school.insert()
    return school.name

def create_self_assessment(data, school_id):
    """Create self assessment document"""
    assessment = frappe.get_doc({
        "doctype": "Self Assessment",
        "school": school_id,
        "date": now(),
        # Add other assessment fields based on the form data
    })
    assessment.insert()
    return assessment.name

def create_accreditation(data, school_id, assessment_id):
    """Create accreditation application"""
    accreditation = frappe.get_doc({
        "doctype": "Accreditation",
        "school_identification": school_id,
        "self_assessment": assessment_id,
        "type_of_request": data.get("type_of_request"),
        "applicant_name": data.get("applicant_name"),
        "applicant_role": data.get("applicant_role"),
        "applicant_email": data.get("applicant_email"),
        "applicant_telephone": data.get("applicant_telephone"),
        "national_id": data.get("national_id")
    })
    accreditation.insert()
    return accreditation
