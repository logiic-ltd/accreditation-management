import frappe
from frappe import _

def get_context(context):
    context.show_sidebar = True
    context.no_cache = 1
    
def validate_form_data(form_data):
    # Basic validation
    required_fields = [
        'school_name', 'school_code', 'status', 'owner_name',
        'accommodation_status', 'establishment_year', 'village',
        'cell', 'sector', 'district', 'province', 'type_of_school',
        'type_of_request', 'applicant_name', 'applicant_role',
        'applicant_email', 'applicant_telephone'
    ]
    
    for field in required_fields:
        if not form_data.get(field):
            frappe.throw(_("Please fill in {0}").format(field.replace('_', ' ').title()))
            
    # Validate email format
    if not frappe.utils.validate_email_address(form_data.get('applicant_email')):
        frappe.throw(_("Please enter a valid email address"))
        
    # Validate year
    try:
        year = int(form_data.get('establishment_year'))
        if year < 1900 or year > 2100:
            frappe.throw(_("Please enter a valid establishment year"))
    except ValueError:
        frappe.throw(_("Please enter a valid establishment year"))

@frappe.whitelist()
def submit_application(**args):
    try:
        form_data = frappe.form_dict
        
        # Validate form data
        validate_form_data(form_data)
        
        # Create new accreditation document
        doc = frappe.get_doc({
            "doctype": "Accreditation",
            "school_name": form_data.get('school_name'),
            "school_code": form_data.get('school_code'),
            "status": form_data.get('status'),
            "owner_name": form_data.get('owner_name'),
            "accommodation_status": form_data.get('accommodation_status'),
            "establishment_year": form_data.get('establishment_year'),
            "village": form_data.get('village'),
            "cell": form_data.get('cell'),
            "sector": form_data.get('sector'),
            "district": form_data.get('district'),
            "province": form_data.get('province'),
            "type_of_school": form_data.get('type_of_school'),
            "type_of_request": form_data.get('type_of_request'),
            "other_request": form_data.get('other_request'),
            "applicant_name": form_data.get('applicant_name'),
            "applicant_role": form_data.get('applicant_role'),
            "applicant_email": form_data.get('applicant_email'),
            "applicant_telephone": form_data.get('applicant_telephone')
        })
        
        doc.insert(ignore_permissions=True)
        
        # Return the tracking number
        return doc.name
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Accreditation Application Error"))
        frappe.throw(_("An error occurred while submitting your application. Please try again."))
