# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
import random
import string
import json

class Accreditation(Document):
    def before_insert(self):
        frappe.logger().info(f"Before insert for {self.name}")
        self.generate_tracking_number()
        self.set_initial_state()

    def set_initial_state(self):
        frappe.logger().info(f"Setting initial state for {self.name}")
        self.workflow_state = "Draft"
        frappe.logger().info(f"Set initial state to {self.workflow_state}")

    def generate_tracking_number(self):
        frappe.logger().info(f"Generating tracking number for {self.name}")
        tracking_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        while frappe.db.exists("Accreditation", {"tracking_number": tracking_number}):
            tracking_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        self.tracking_number = tracking_number
        frappe.logger().info(f"Generated tracking number: {self.tracking_number}")

    def validate(self):
        self.update_status_history()

    def update_status_history(self):
        if self.is_new() or self.has_value_changed('workflow_state'):
            self.append('status_history', {
                'status': self.workflow_state,
                'date': frappe.utils.now(),
                'user': frappe.session.user
            })

    def on_update(self):
        self.update_status_history()
        if self.has_value_changed('workflow_state'):
            if self.workflow_state == "Approved" and not self.certificate_generated:
                self.generate_certificate()
            elif self.workflow_state != "Approved" and self.certificate_generated:
                self.revoke_certificate()

    def revoke_certificate(self):
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
        self.update_status_history()

    def on_cancel(self):
        self.update_status_history()

    @frappe.whitelist()
    def request_inspection(self):
        if self.workflow_state == "Under Specialist Review":
            inspection = frappe.get_doc({
                "doctype": "Inspection",
                "accreditation": self.name,
                "school_name": self.school_name,
            })
            inspection.insert(ignore_permissions=True)
            
            self.db_set('workflow_state', 'Inspection Requested')
            frappe.msgprint(_("Inspection requested."))

    @frappe.whitelist()
    def complete_inspection(self):
        if self.workflow_state == "Inspection Requested":
            inspection = frappe.get_doc("Inspection", {"accreditation": self.name})
            if inspection.workflow_state == "Approved by DG":
                self.db_set('workflow_state', 'Under Specialist Review')
                frappe.msgprint(_("Inspection completed. Application is now under specialist review."))
            else:
                frappe.throw(_("The inspection has not been completed and approved yet."))

    def generate_certificate(self):
        from accreditation_management.www.application_status import generate_certificate_html
        from frappe.utils.pdf import get_pdf
        
        certificate_html = generate_certificate_html(self)
        pdf = get_pdf(certificate_html)
        
        file_name = f"{self.school_name}_Accreditation_Certificate.pdf"
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": file_name,
            "attached_to_doctype": self.doctype,
            "attached_to_name": self.name,
            "content": pdf,
            "is_private": 1
        })
        _file.save()
        
        self.db_set('certificate_generated', True, update_modified=False)
        frappe.db.commit()

        frappe.msgprint(_("Certificate generated successfully."))

    def after_insert(self):
        try:
            self.send_tracking_number_email()
        except Exception as e:
            frappe.log_error(f"Failed to send tracking number email: {str(e)}", "Accreditation Email Error")

    def send_tracking_number_email(self):
        if self.contact:
            subject = _("NESA Accreditation Application Tracking Number")
            message = _("""Dear {0},

Thank you for submitting your NESA Accreditation Application.

Your application tracking number is: {1}

Please keep this number for future reference. You can use this tracking number to check the status of your application.

Best regards,
NESA Accreditation Team""").format(self.school_name, self.tracking_number)

            try:
                frappe.sendmail(
                    recipients=[self.contact],
                    subject=subject,
                    message=message,
                    header=[_("Accreditation Application"), "green"]
                )
            except frappe.OutgoingEmailError:
                frappe.log_error("Failed to send tracking number email due to missing email account configuration", "Accreditation Email Error")

@frappe.whitelist(allow_guest=True)
def create_accreditation(data):
    try:
        data = json.loads(data)
        doc = frappe.get_doc({
            "doctype": "Accreditation",
            "school_name": data.get('school_name'),
            "school_code": data.get('school_code'),
            "status": data.get('status'),
            "school_owner": data.get('school_owner'),
            "contact": data.get('contact'),
            "accommodation_status": data.get('accommodation_status'),
            "establishment_year": data.get('establishment_year'),
            "village": data.get('village'),
            "cell": data.get('cell'),
            "sector": data.get('sector'),
            "district": data.get('district'),
            "province": data.get('province'),
            "ht_name": data.get('ht_name'),
            "ht_qualification": data.get('ht_qualification'),
            "ht_telephone": data.get('ht_telephone'),
            "total_students": data.get('total_students'),
            "total_girls": data.get('total_girls'),
            "total_boys": data.get('total_boys'),
            "students_requested_level": data.get('students_requested_level'),
            "students_sen": data.get('students_sen'),
            "total_teachers": data.get('total_teachers'),
            "male_teachers": data.get('male_teachers'),
            "female_teachers": data.get('female_teachers'),
            "assistant_teachers": data.get('assistant_teachers'),
            "male_assistant_teachers": data.get('male_assistant_teachers'),
            "female_assistant_teachers": data.get('female_assistant_teachers'),
            "total_admin_staff": data.get('total_admin_staff'),
            "headteacher": data.get('headteacher'),
            "deputy_headteacher": data.get('deputy_headteacher'),
            "secretary": data.get('secretary'),
            "librarian": data.get('librarian'),
            "accountant": data.get('accountant'),
            "other_admin_staff": data.get('other_admin_staff'),
            "total_supporting_staff": data.get('total_supporting_staff'),
            "cleaners": data.get('cleaners'),
            "cleaning_company": data.get('cleaning_company'),
            "watchmen": data.get('watchmen'),
            "school_cooks": data.get('school_cooks'),
            "storekeeper": data.get('storekeeper'),
            "drivers": data.get('drivers'),
            "other_supporting_staff": data.get('other_supporting_staff'),
            "total_classrooms": data.get('total_classrooms'),
            "total_latrines": data.get('total_latrines'),
            "total_kitchens": data.get('total_kitchens'),
            "total_dining_halls": data.get('total_dining_halls'),
            "total_libraries": data.get('total_libraries'),
            "total_smart_classrooms": data.get('total_smart_classrooms'),
            "total_computer_labs": data.get('total_computer_labs'),
            "total_admin_offices": data.get('total_admin_offices'),
            "total_multipurpose_halls": data.get('total_multipurpose_halls'),
            "total_staff_rooms": data.get('total_staff_rooms')
        })
        
        doc.insert(ignore_permissions=True)
        
        return {"tracking_number": doc.tracking_number, "message": _("Application submitted successfully. Please note your tracking number.")}
    except json.JSONDecodeError:
        frappe.log_error("Invalid JSON data received")
        frappe.throw(_("Invalid data format. Please try again."))
    except frappe.ValidationError as e:
        frappe.log_error(f"Validation error: {str(e)}")
        frappe.throw(_(f"Validation error: {str(e)}"))
    except Exception as e:
        frappe.log_error(f"Error creating accreditation: {str(e)}")
        if "OutgoingEmailError" in str(e):
            return {"tracking_number": doc.tracking_number, "message": _("Application submitted successfully, but we couldn't send you an email confirmation. Please note your tracking number: {0}").format(doc.tracking_number)}
        else:
            frappe.throw(_("An unexpected error occurred while submitting the application. Please try again or contact support."))
