# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number
import random
import string

class Accreditation(Document):
    def before_insert(self):
        self.generate_tracking_number()

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

    def after_insert(self):
        self.send_tracking_number_email()

    def send_tracking_number_email(self):
        if self.school_email:
            frappe.sendmail(
                recipients=[self.school_email],
                subject="NESA Accreditation Application Tracking Number",
                template="accreditation_tracking_number",
                args={
                    "school_name": self.school_name,
                    "tracking_number": self.tracking_number
                },
                header=[_("Accreditation Application"), "green"]
            )
