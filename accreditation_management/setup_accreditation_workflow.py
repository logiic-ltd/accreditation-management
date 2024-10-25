import frappe

def setup_accreditation_workflow():
    workflow = frappe.new_doc("Workflow")
    workflow.workflow_name = "Accreditation Workflow"
    workflow.document_type = "Accreditation"
    workflow.workflow_state_field = "workflow_state"
    workflow.is_active = 1

    # Define states
    states = [
        {"state": "Draft", "doc_status": 0, "allow_edit": "All"},
        {"state": "Submitted", "doc_status": 1, "allow_edit": "All"},
        {"state": "Under Review", "doc_status": 1, "allow_edit": "Accreditation Reviewer"},
        {"state": "Approved", "doc_status": 1, "allow_edit": "Accreditation Approver"},
        {"state": "Rejected", "doc_status": 1, "allow_edit": "Accreditation Approver"}
    ]

    for state in states:
        workflow.append("states", state)

    # Define transitions
    transitions = [
        {"state": "Draft", "action": "Submit", "next_state": "Submitted", "allowed": "All"},
        {"state": "Submitted", "action": "Start Review", "next_state": "Under Review", "allowed": "Accreditation Reviewer"},
        {"state": "Under Review", "action": "Approve", "next_state": "Approved", "allowed": "Accreditation Approver"},
        {"state": "Under Review", "action": "Reject", "next_state": "Rejected", "allowed": "Accreditation Approver"},
        {"state": "Rejected", "action": "Resubmit", "next_state": "Submitted", "allowed": "All"}
    ]

    for transition in transitions:
        workflow.append("transitions", transition)

    # Save the workflow
    workflow.save(ignore_permissions=True)
    frappe.db.commit()

    print("Accreditation Workflow has been set up successfully.")

if __name__ == "__main__":
    setup_accreditation_workflow()
