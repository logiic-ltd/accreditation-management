# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address
from frappe.utils import validate_phone_number

class Accreditation(Document):
    pass
    #def validate(self):
        #validate school email
        #if validate_email_address(self.school_email) == None or validate_email_address(self.school_email) == "":
        #    frappe.throw("School Email is invalid")
        #validate owner email
        #if validate_email_address(self.owner_email) is None or validate_email_address(self.owner_email) == "":
        #    frappe.throw("Owner Email is invalid")
        #validate owner telephone   
        #if validate_phone_number(self.school_telephone): else: frappe.throw("Owner Telephone is invalid")