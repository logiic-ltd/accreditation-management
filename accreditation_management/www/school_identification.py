import frappe
import json
from frappe import _

@frappe.whitelist(allow_guest=True)
def submit_school_identification(form_data):
    try:
        # Parse the form data
        data = json.loads(form_data)
        
        # Create a new School Identification document
        doc = frappe.get_doc({
            "doctype": "School Identification",
            "school_name": data.get("school_name"),
            "school_code": data.get("school_code"),
            "status": data.get("status"),
            "type_of_school": data.get("type_of_school"),
            "school_owner": data.get("school_owner"),
            "contact": data.get("contact"),
            "accommodation_status": data.get("accommodation_status"),
            "year_of_establishment": int(data.get("year_of_establishment") or 0),
            "village": data.get("village"),
            "cell": data.get("cell"),
            "sector": data.get("sector"),
            "district": data.get("district"),
            "province": data.get("province"),
            "ht_name": data.get("ht_name"),
            "qualification_of_headteacher": data.get("qualification_of_headteacher"),
            "telephone": data.get("telephone"),
            "number_of_boys": data.get("number_of_boys"),
            "number_of_girls": data.get("number_of_girls"),
            "total_nr_students": data.get("total_nr_students"),  # This will be calculated on the client side
            "students_with_sen": data.get("students_with_sen"),
            "number_of_male_teachers": int(data.get("number_of_male_teachers") or 0),
            "number_of_female_teachers": int(data.get("number_of_female_teachers") or 0),
            "number_of_teachers": int(data.get("number_of_teachers") or 0),
            "number_of_male_assistant_teachers": int(data.get("number_of_male_assistant_teachers") or 0),
            "number_of_female_assistant_teachers": int(data.get("number_of_female_assistant_teachers") or 0),
            "number_of_assistant_teachers": int(data.get("number_of_assistant_teachers") or 0),
            "total_number_of_administrative_staff": data.get("total_number_of_administrative_staff"),
            "headteacher": data.get("headteacher"),
            "deputy_headteacher": data.get("deputy_headteacher"),
            "secretary": data.get("secretary"),
            "librarian": data.get("librarian"),
            "accountant": data.get("accountant"),
            "other_staff": data.get("other_staff"),
            "total_number_of_supporting_staff": data.get("total_number_of_supporting_staff"),
            "cleaners": data.get("cleaners"),
            "watchmen": data.get("watchmen"),
            "school_cooks": data.get("school_cooks"),
            "storekeeper": data.get("storekeeper"),
            "drivers": data.get("drivers"),
            "other_supporting_staff": data.get("other_supporting_staff"),
            "nbr_of_classrooms": data.get("nbr_of_classrooms"),
            "nbr_of_latrines": data.get("nbr_of_latrines"),
            "number_of_kitchen": data.get("number_of_kitchen"),
            "number_of_dining_hall": data.get("number_of_dining_hall"),
            "number_of_library": data.get("number_of_library"),
            "number_of_smart_classrooms": data.get("number_of_smart_classrooms"),
            "number_of_computer_lab": data.get("number_of_computer_lab"),
            "number_of_admin_offices": data.get("number_of_admin_offices"),
            "number_of_multipurpose_halls": data.get("number_of_multipurpose_halls"),
            "number_of_academic_staff_rooms": data.get("number_of_academic_staff_rooms"),
            "latitude": float(data.get("latitude") or 0),
            "longitude": float(data.get("longitude") or 0)
        })
        
        doc.insert(ignore_permissions=True)
        
        return {"message": _("School identification form submitted successfully.")}
    except Exception as e:
        frappe.log_error(f"Error submitting school identification: {str(e)}")
        frappe.throw(_("An error occurred while submitting the form. Please try again."))
