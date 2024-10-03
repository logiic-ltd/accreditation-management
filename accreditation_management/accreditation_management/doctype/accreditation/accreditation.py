# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number
from frappe import _
import random
import string

class Accreditation(Document):
    def before_insert(self):
        self.generate_tracking_number()
        self.workflow_state = "Draft"

    def generate_tracking_number(self):
        # Generate a random 8-character alphanumeric string
        tracking_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Ensure the tracking number is unique
        while frappe.db.exists("Accreditation", {"tracking_number": tracking_number}):
            tracking_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        self.tracking_number = tracking_number

    def validate(self):
        if self.school_email and not validate_email_address(self.school_email):
            frappe.throw("School Email is invalid")
        if self.owner_email and not validate_email_address(self.owner_email):
            frappe.throw("Owner Email is invalid")
        if self.school_telephone and not validate_phone_number(self.school_telephone):
            frappe.throw("School Telephone is invalid")
        
        self.update_status_history()

    def update_status_history(self):
        if self.is_new() or self.has_value_changed('workflow_state'):
            self.append('status_history', {
                'status': self.workflow_state or "Draft",
                'date': frappe.utils.now(),
                'user': frappe.session.user
            })

    def on_update(self):
        self.update_status_history()

    def on_submit(self):
        self.update_status_history()

    def on_cancel(self):
        self.update_status_history()

    def update_status_history(self):
        if self.has_value_changed('workflow_state'):
            self.append('status_history', {
                'status': self.workflow_state,
                'date': frappe.utils.now(),
                'user': frappe.session.user
            })

    def after_insert(self):
        self.send_tracking_number_email()

    def send_tracking_number_email(self):
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
