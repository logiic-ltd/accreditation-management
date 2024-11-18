# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number
from frappe import _, OutgoingEmailError
import random
import string
import json

class Accreditation(Document):
    def before_insert(self):
        frappe.logger().info(f"Before insert for {self.name}")
        self.generate_tracking_number()
        self.status = "Draft"

    def generate_tracking_number(self):
        frappe.logger().info(f"Generating tracking number for {self.name}")
        # Generate a unique 8-character alphanumeric tracking number
        tracking_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        while frappe.db.exists("Accreditation", {"tracking_number": tracking_number}):
            tracking_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        self.tracking_number = tracking_number
        frappe.logger().info(f"Generated tracking number: {self.tracking_number}")

    def validate(self):
        # Validate prerequisites
        if not self.school_identification:
            frappe.throw(_("School Identification is required"))
        if not self.self_assessment:
            frappe.throw(_("Self Assessment is required"))
            
        # Validate school identification exists and is valid
        school_id = frappe.get_doc("School Identification", self.school_identification)
        if not school_id:
            frappe.throw(_("Invalid School Identification"))
            
        # Validate self assessment exists and is valid
        self_assessment = frappe.get_doc("Self Assessment", self.self_assessment)
        if not self_assessment:
            frappe.throw(_("Invalid Self Assessment"))
            
        # Validate email addresses and phone numbers
        if self.school_email and not validate_email_address(self.school_email):
            frappe.throw(_("School Email is invalid"))
        if self.owner_email and not validate_email_address(self.owner_email):
            frappe.throw(_("Owner Email is invalid"))
        if self.school_telephone and not validate_phone_number(self.school_telephone):
            frappe.throw(_("School Telephone is invalid"))
        
        # Auto-populate fields from School Identification
        self.school_name = school_id.school_name
        self.school_code = school_id.school_code
        
        self.update_status_history()

    def update_status_history(self):
        # Record status changes in the status history
        if self.is_new() or self.has_value_changed('status'):
            self.append('status_history', {
                'status': self.status,
                'date': frappe.utils.now(),
                'user': frappe.session.user
            })

    def on_update(self):
        # Update status history on any update
        self.update_status_history()
        if self.has_value_changed('status'):
            if self.status == "Approved" and not self.certificate_generated:
                self.generate_certificate()
            elif self.status != "Approved" and self.certificate_generated:
                self.revoke_certificate()

    def revoke_certificate(self):
        # Delete the existing certificate file
        files = frappe.get_all("File", filters={
            "attached_to_doctype": self.doctype,
            "attached_to_name": self.name,
            "file_name": ("like", "%_Accreditation_Certificate.pdf")
        })
        for file in files:
            frappe.delete_doc("File", file.name)
        
        self.certificate_generated = False
        self.save()
        frappe.msgprint(_("Certificate has been revoked."))

    def on_submit(self):
        # Update status history when the document is submitted
        self.update_status_history()

    def on_cancel(self):
        # Update status history when the document is cancelled
        self.update_status_history()

    @frappe.whitelist()
    def change_status(self, new_status):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Under Review"],
            "Under Review": ["Approved", "Rejected"],
            "Rejected": ["Submitted"]
        }
        if new_status in valid_transitions.get(self.status, []):
            self.status = new_status
            self.save()
            frappe.msgprint(_(f"Application status changed to {new_status}."))
        else:
            frappe.throw(_("Invalid status transition."))

    def generate_certificate(self):
        from accreditation_management.www.application_status import generate_certificate_html
        from frappe.utils.pdf import get_pdf
        
        certificate_html = generate_certificate_html(self)
        pdf = get_pdf(certificate_html)
        
        # Save the PDF as an attachment
        file_name = f"{self.school_name}_Accreditation_Certificate.pdf"
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": file_name,
            "attached_to_doctype": self.doctype,
            "attached_to_name": self.name,
            "content": pdf,
            "is_private": 1  # Make the file private
        })
        _file.save()
        
        self.db_set('certificate_generated', True, update_modified=False)
        frappe.db.commit()

        frappe.msgprint(_("Certificate generated successfully."))

    def after_insert(self):
        # Send tracking number email after the document is inserted
        self.send_tracking_number_email()

    def send_tracking_number_email(self):
        try:
            # Send an email with the tracking number to the school
            if self.school_email:
                subject = _("NESA Accreditation Application Tracking Number")
                message = _("""Dear {0},

Thank you for submitting your NESA Accreditation Application.

Your application tracking number is: {1}

Please keep this number for future reference. You can use this tracking number to check the status of your application.

Best regards,
NESA Accreditation Team""").format(self.school_name, self.tracking_number)

                frappe.sendmail(
                    recipients=[self.school_email],
                    subject=subject,
                    message=message,
                    header=[_("Accreditation Application"), "green"]
                )
        except OutgoingEmailError:
            frappe.logger().warning("Email account not configured. Unable to send tracking number email.")

@frappe.whitelist(allow_guest=True)
def create_accreditation(data):
    try:
        data = json.loads(data)
        doc = frappe.get_doc({
            "doctype": "Accreditation",
            "school_name": next((item['value'] for item in data if item['name'] == 'school_name'), None),
            "mission": next((item['value'] for item in data if item['name'] == 'mission'), None),
            "objective": next((item['value'] for item in data if item['name'] == 'objective'), None),
            "curriculum": next((item['value'] for item in data if item['name'] == 'curriculum'), None),
            "establishment_year": next((item['value'] for item in data if item['name'] == 'establishment_year'), None),
            "school_email": next((item['value'] for item in data if item['name'] == 'school_email'), None),
            "school_telephone": next((item['value'] for item in data if item['name'] == 'school_telephone'), None),
            "village": next((item['value'] for item in data if item['name'] == 'village'), None),
            "cell": next((item['value'] for item in data if item['name'] == 'cell'), None),
            "sector": next((item['value'] for item in data if item['name'] == 'sector'), None),
            "district": next((item['value'] for item in data if item['name'] == 'district'), None),
            "province": next((item['value'] for item in data if item['name'] == 'province'), None),
            "owner_name": next((item['value'] for item in data if item['name'] == 'owner_name'), None),
            "owner_email": next((item['value'] for item in data if item['name'] == 'owner_email'), None),
            "owner_telephone": next((item['value'] for item in data if item['name'] == 'owner_telephone'), None)
        })
        
        doc.insert(ignore_permissions=True)
        
        return {"tracking_number": doc.tracking_number}
    except Exception as e:
        frappe.log_error(f"Error creating accreditation: {str(e)}")
        frappe.throw(_("An error occurred while submitting the application. Please try again."))
