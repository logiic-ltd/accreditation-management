# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class SchoolIdentification(Document):
    def validate(self):
        # Ensure teacher counts are valid integers
        self.number_of_male_teachers = int(self.number_of_male_teachers or 0)
        self.number_of_female_teachers = int(self.number_of_female_teachers or 0)
        self.number_of_teachers = self.number_of_male_teachers + self.number_of_female_teachers
