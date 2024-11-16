# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class SelfAssessment(Document):
    def validate(self):
        # Add any custom validation logic here
        pass
