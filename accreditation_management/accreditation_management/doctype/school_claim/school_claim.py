import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number

class SchoolClaim(Document):
    def validate(self):
        self.validate_contact_info()
        
    def validate_contact_info(self):
        if not validate_email_address(self.claimant_email):
            frappe.throw("Please enter a valid email address")
            
        if not validate_phone_number(self.claimant_phone):
            frappe.throw("Please enter a valid phone number")
            
    def on_submit(self):
        self.status = "Submitted"
        self.notify_submission()
        
    def notify_submission(self):
        try:
            # Send email to claimant
            subject = "Claim Submission Confirmation"
            message = f"""Dear {self.claimant_name},

Your claim against {self.school_name} has been submitted successfully.
Claim Reference: {self.name}

We will review your claim and get back to you soon.

Best regards,
NESA Team"""

            frappe.sendmail(
                recipients=[self.claimant_email],
                subject=subject,
                message=message
            )
            
            # Send notification to administrators
            frappe.sendmail(
                recipients=["admin@nesa.gov.rw"],  # Replace with actual admin email
                subject=f"New Claim Submitted: {self.name}",
                message=f"""A new claim has been submitted:

School: {self.school_name}
Claim Type: {self.claim_type}
Claimant: {self.claimant_name}

Please review the claim in the system."""
            )
            
        except Exception as e:
            frappe.log_error(f"Failed to send claim notification: {str(e)}")
