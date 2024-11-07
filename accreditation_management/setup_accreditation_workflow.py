import frappe
import json
import os

def setup_accreditation_workflow():
    try:
        # Check if the workflow already exists
        if frappe.db.exists("Workflow", "Accreditation Workflow"):
            print("Accreditation Workflow already exists.")
            return

        # Determine the path to the JSON file
        json_file_path = os.path.join(os.path.dirname(__file__), 'accreditation_workflow.json')

        # Load the workflow configuration from JSON file
        with open(json_file_path, 'r') as file:
            workflow_config = json.load(file)

        # Create a new Workflow document
        workflow = frappe.get_doc({
            "doctype": "Workflow",
            "workflow_name": workflow_config["workflow_name"],
            "document_type": workflow_config["document_type"],
            "workflow_state_field": workflow_config["workflow_state_field"],
            "is_active": workflow_config["is_active"],
            "states": workflow_config["states"],
            "transitions": workflow_config["transitions"]
        })

        # Insert the workflow into the database
        workflow.insert(ignore_permissions=True)
        frappe.db.commit()

        print("Accreditation Workflow has been set up successfully.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        frappe.log_error(f"Error setting up Accreditation Workflow: {str(e)}")

if __name__ == "__main__":
    setup_accreditation_workflow()
