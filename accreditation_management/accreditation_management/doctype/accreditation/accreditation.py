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
        frappe.logger().info(f"Validating accreditation application: {self.name}")
        validation_errors = []
        
        # Validate prerequisites
        if not self.school_identification:
            validation_errors.append(_("School Identification is required"))
        if not self.self_assessment:
            validation_errors.append(_("Self Assessment is required"))
            
        # Validate school identification exists and is valid
        if self.school_identification:
            try:
                school_id = frappe.get_doc("School Identification", self.school_identification)
                if not school_id:
                    validation_errors.append(_("Invalid School Identification"))
            except frappe.DoesNotExistError:
                validation_errors.append(_("School Identification document not found"))
            
        # Validate self assessment exists and is valid
        if self.self_assessment:
            try:
                self_assessment = frappe.get_doc("Self Assessment", self.self_assessment)
                if not self_assessment:
                    validation_errors.append(_("Invalid Self Assessment"))
            except frappe.DoesNotExistError:
                validation_errors.append(_("Self Assessment document not found"))
            
        # Validate required fields
        required_fields = [
            ("school_name", "School Name"),
            ("school_code", "School Code"),
            ("type_of_school", "Type of School"),
            ("type_of_request", "Type of Request"),
            ("establishment_year", "Year of Establishment"),
            ("village", "Village"),
            ("cell", "Cell"),
            ("sector", "Sector"),
            ("district", "District"),
            ("province", "Province"),
            ("owner_name", "Owner Name"),
            ("applicant_name", "Applicant Name"),
            ("applicant_role", "Applicant Role"),
            ("applicant_email", "Applicant Email"),
            ("applicant_telephone", "Applicant Telephone")
        ]
        
        for field, label in required_fields:
            if not getattr(self, field):
                validation_errors.append(_(f"{label} is required"))
            
        # Validate email addresses and phone numbers
        if self.school_email and not validate_email_address(self.school_email):
            validation_errors.append(_("School Email is invalid"))
        if self.owner_email and not validate_email_address(self.owner_email):
            validation_errors.append(_("Owner Email is invalid"))
        if self.school_telephone and not validate_phone_number(self.school_telephone):
            validation_errors.append(_("School Telephone is invalid"))
            
        # If any validation errors occurred, throw them all at once
        if validation_errors:
            error_msg = "<br>".join(validation_errors)
            frappe.logger().warning(f"Validation failed for application {self.name}: {error_msg}")
            frappe.throw(error_msg)
        
        frappe.logger().info(f"Validation successful for application {self.name}")
        
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
        frappe.logger().info(f"Starting accreditation application submission")
        data = json.loads(data)
        frappe.logger().debug(f"Parsed application data: {json.dumps(data, indent=2)}")
        doc = frappe.get_doc({
            "doctype": "Accreditation",
            "school_identification": data.get('school_identification'),
            "self_assessment": data.get('self_assessment'),
            "school_name": data.get('school_name'),
            "school_code": data.get('school_code'),
            "type_of_school": data.get('type_of_school'),
            "type_of_request": data.get('type_of_request'),
            "other_request": data.get('other_request'),
            "establishment_year": data.get('establishment_year'),
            "school_email": data.get('school_email'),
            "school_telephone": data.get('school_telephone'),
            "village": data.get('village'),
            "cell": data.get('cell'),
            "sector": data.get('sector'),
            "district": data.get('district'),
            "province": data.get('province'),
            "owner_name": data.get('owner_name'),
            "owner_email": data.get('owner_email'),
            "owner_telephone": data.get('owner_telephone'),
            "applicant_name": data.get('applicant_name'),
            "applicant_role": data.get('applicant_role'),
            "applicant_email": data.get('applicant_email'),
            "applicant_telephone": data.get('applicant_telephone'),
        })
        
        doc.insert(ignore_permissions=True)
        
        frappe.logger().info(f"Successfully created accreditation application with tracking number: {doc.tracking_number}")
        frappe.logger().debug(f"Application details: {json.dumps(doc.as_dict(), indent=2)}")
        
        return {"tracking_number": doc.tracking_number}
    except Exception as e:
        error_msg = f"Error creating accreditation: {str(e)}"
        frappe.logger().error(error_msg)
        frappe.log_error(message=error_msg, title="Accreditation Application Error")
        frappe.throw(_("An error occurred while submitting the application. Please try again."))
