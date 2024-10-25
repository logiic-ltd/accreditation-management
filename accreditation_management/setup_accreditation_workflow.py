import frappe
import json
from frappe.model.document import Document
from frappe.model.workflow import Workflow

def setup_accreditation_workflow():
    try:
        # Check if the workflow already exists
        if frappe.db.exists("Workflow", "Accreditation Workflow"):
            print("Accreditation Workflow already exists.")
            return

        # Load the workflow configuration from JSON file
        with open('accreditation_management/accreditation_workflow.json', 'r') as file:
            workflow_config = json.load(file)

        workflow = frappe.new_doc("Workflow")
        workflow.update(workflow_config)

        # Save the workflow
        workflow.insert(ignore_permissions=True)
        frappe.db.commit()

        print("Accreditation Workflow has been set up successfully.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        frappe.log_error(f"Error setting up Accreditation Workflow: {str(e)}")

if __name__ == "__main__":
    setup_accreditation_workflow()
