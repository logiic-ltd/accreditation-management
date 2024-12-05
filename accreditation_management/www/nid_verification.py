import frappe
import requests
import json
from accreditation_management.config.api_config import NID_API_URL, NID_API_SECRET

@frappe.whitelist(allow_guest=True)
def verify_nid(document_number):
    try:
        # Format the document number by removing spaces if present
        formatted_doc_number = "".join(document_number.split())
        
        # Prepare the request payload
        payload = {
            "documentNumber": formatted_doc_number,
            "secretKey": NID_API_SECRET
        }
        
        # Make the request to the NID API
        response = requests.post(NID_API_URL, json=payload)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Parse and return the response
        data = response.json()
        
        # Format the response to include only needed fields
        return {
            "success": True,
            "data": {
                "foreName": data.get("foreName"),
                "surnames": data.get("surnames"),
                "village": data.get("village"),
                "cell": data.get("cell"),
                "sector": data.get("sector"),
                "district": data.get("district"),
                "province": data.get("province")
            }
        }
        
    except requests.RequestException as e:
        frappe.logger().error(f"NID verification error: {str(e)}")
        return {
            "success": False,
            "error": "Failed to verify National ID. Please try again."
        }
    except Exception as e:
        frappe.logger().error(f"Error in NID verification: {str(e)}")
        return {
            "success": False,
            "error": "An unexpected error occurred. Please try again."
        }
