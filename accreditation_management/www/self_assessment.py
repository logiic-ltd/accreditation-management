import frappe
from frappe import _
import requests
from accreditation_management.config.api_config import SCHOOL_SEARCH_ENDPOINT

@frappe.whitelist(allow_guest=True)
def search_schools(search_term, page=0, size=20, sort="schoolName,asc"):
    if not search_term:
        frappe.logger().info("Search term is empty, returning empty result")
        return {"content": [], "totalElements": 0, "totalPages": 0}

    url = f"{SCHOOL_SEARCH_ENDPOINT}?name={search_term}&page={page}&size={size}&sort={sort}"
    try:
        frappe.logger().info(f"Constructed API URL: {url}")
        frappe.logger().info(f"Attempting to call API with URL: {url}")
        response = requests.get(url)
        frappe.logger().info(f"API response status code: {response.status_code}")
        response.raise_for_status()
        result = response.json()
        frappe.logger().info(f"API response content: {result}")
        
        # Check if the result is a list of schools or a single school
        if isinstance(result, list):
            return {"content": result, "totalElements": len(result), "totalPages": 1}
        elif isinstance(result, dict) and "schoolName" in result:
            return {"content": [result], "totalElements": 1, "totalPages": 1}
        else:
            frappe.logger().error(f"Unexpected API response format: {result}")
            return {"content": [], "totalElements": 0, "totalPages": 0}
    except requests.RequestException as e:
        frappe.log_error(f"Error searching schools: {str(e)}")
        return {"content": [], "totalElements": 0, "totalPages": 0}

@frappe.whitelist(allow_guest=True)
def start_self_assessment(school):
    if isinstance(school, str):
        school = frappe.parse_json(school)
    
    school_doc = frappe.get_doc({
        "doctype": "School",
        "school_name": school.get("name"),
        "school_code": school.get("code"),
        "address": school.get("address"),
        "school_owner": school.get("owner")
    })
    school_doc.insert(ignore_permissions=True)

    assessment = frappe.get_doc({
        "doctype": "Self Assessment",
        "school": school_doc.name,
        "status": "In Progress"
    })
    assessment.insert(ignore_permissions=True)

    return f"/self-assessment/{assessment.name}"
import frappe
import json
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_indicator_options():
    try:
        with open(frappe.get_app_path('accreditation_management', 'config', 'indicator_options.json'), 'r') as file:
            data = json.load(file)
        return data
    except Exception as e:
        frappe.log_error(f"Error calculating provisional results: {str(e)}")
        frappe.log_error(f"Error loading indicator options: {str(e)}")
        frappe.throw(_("An error occurred while loading indicator options."))

@frappe.whitelist(allow_guest=True)
def submit_self_assessment(form_data):
    try:
        # Parse the form data
        data = json.loads(form_data)
        
        # Calculate provisional results
        provisional_area_scores = {}
        overall_score = 0

        for area, criteria in data.items():
            area_total = 0
            criteria_count = 0
            for criterion, indicators in criteria.items():
                criterion_total = sum(int(data.get(indicator, 0)) for indicator in indicators)
                criterion_score = (criterion_total / (len(indicators) * 4)) * 100
                area_total += criterion_score
                criteria_count += 1
            area_score = (area_total / criteria_count) * (float(area.split('%')[0]) / 100)
            provisional_area_scores[area] = area_score
            overall_score += area_score

        provisional_ranking = get_provisional_ranking(overall_score)
        provisional_decision = get_provisional_decision(overall_score)
        provisional_years = get_provisional_years(overall_score)

        # Create a new Self Assessment document with provisional results
        doc = frappe.get_doc({
            "doctype": "Self Assessment",
            "school_name": data.get("school_name"),
            "submission_date": data.get("submission_date"),
            **{f"indicator_{i}": data.get(f"indicator_{i}") for i in range(1, 54)},
            "provisional_area_scores": provisional_area_scores,
            "overall_score": overall_score,
            "provisional_ranking": provisional_ranking,
            "provisional_accreditation_decision": provisional_decision,
            "provisional_accreditation_years": provisional_years
        })
        
        doc.insert(ignore_permissions=True)
        
        return {"message": _("Self-assessment form submitted successfully.")}
    except Exception as e:
        frappe.log_error(f"Error submitting self-assessment: {str(e)}")
        frappe.throw(_("An error occurred while submitting the form. Please try again."))
