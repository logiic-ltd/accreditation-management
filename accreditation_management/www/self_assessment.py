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
        response = requests.get(url, timeout=10)  # Add a timeout
        frappe.logger().info(f"API response status code: {response.status_code}")
        response.raise_for_status()
        result = response.json()
        frappe.logger().info(f"API response content: {result}")
        
        if isinstance(result, dict) and "content" in result:
            return result
        elif isinstance(result, list):
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
        frappe.log_error(f"Error loading indicator options: {str(e)}")
        frappe.throw(_("An error occurred while loading indicator options."))
def get_provisional_ranking(score):
    if score >= 80:
        return "Outstanding"
    elif score >= 70:
        return "Good"
    elif score >= 50:
        return "Satisfactory"
    else:
        return "Unsatisfactory"

def get_provisional_decision(score):
    if score >= 50:
        return "Accreditation Granted"
    else:
        return "Accreditation Not Granted"

def get_provisional_years(score):
    if score >= 80:
        return 3
    elif score >= 70:
        return 2
    elif score >= 50:
        return 1
    else:
        return 0

@frappe.whitelist(allow_guest=True)
def submit_self_assessment(form_data):
    try:
        # Parse the form data
        data = json.loads(form_data)
        
        # Load indicator options
        with open(frappe.get_app_path('accreditation_management', 'config', 'indicator_options.json'), 'r') as file:
            indicators = json.load(file)
        
        # Calculate provisional results
        provisional_area_scores = {}
        overall_score = 0
        assessment_indicators = []

        for area, criteria in indicators.items():
            area_total = 0
            criteria_count = 0
            for criterion, indicator_data in criteria.items():
                criterion_total = 0
                indicator_count = 0
                for indicator_key, indicator_info in indicator_data.items():
                    value = int(data.get(indicator_key, 0))
                    percentage = [0, 25, 50, 75, 100][value]  # Map 0-4 to percentages
                    criterion_total += percentage
                    indicator_count += 1
                    
                    # Add to assessment_indicators
                    assessment_indicators.append({
                        "indicator_number": int(indicator_key.split('_')[1]),
                        "indicator_label": indicator_info['label'],
                        "selected_value": value,
                        "score": percentage,
                        "category": area
                    })
                
                criterion_score = criterion_total / indicator_count
                area_total += criterion_score
                criteria_count += 1
            area_score = area_total / criteria_count
            provisional_area_scores[area] = area_score

        # Apply area weights
        weighted_scores = {
            "A. Land ownership, legal, School leadership and management documents": provisional_area_scores["A. Land ownership, legal, School leadership and management documents"] * 0.10,
            "School Infrastructures": provisional_area_scores["School Infrastructures"] * 0.60,
            "Teaching and learning Resources": provisional_area_scores["Teaching and learning Resources"] * 0.30
        }

        overall_score = sum(weighted_scores.values())

        provisional_ranking = get_provisional_ranking(overall_score)
        provisional_decision = get_provisional_decision(overall_score)
        provisional_years = get_provisional_years(overall_score)

        # Create a new Self Assessment document with provisional results
        doc = frappe.get_doc({
            "doctype": "Self Assessment",
            "school_name": data.get("school_name"),
            "school_code": data.get("school_code"),
            "assessment_indicators": assessment_indicators,
            "provisional_area_scores": provisional_area_scores,
            "overall_score": overall_score,
            "provisional_ranking": provisional_ranking,
            "provisional_accreditation_decision": provisional_decision,
            "provisional_accreditation_years": provisional_years,
            "type_of_request": data.get("type_of_request"),
            "selected_sector_category": data.get("selected_sector_category"),
            "selected_items": [
                {
                    "item_name": item,
                    "is_selected": True
                } for item in json.loads(data.get("selected_items", "[]"))
            ]
        })
        
        doc.insert(ignore_permissions=True)
        
        return {"message": _("Self-assessment form submitted successfully.")}
    except Exception as e:
        frappe.log_error(f"Error submitting self-assessment: {str(e)}")
        frappe.throw(_("An error occurred while submitting the form. Please try again."))
