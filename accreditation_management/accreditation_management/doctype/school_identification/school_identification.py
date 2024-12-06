# Copyright (c) 2024, Ezra Mungai and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import random_string, now_datetime, add_to_date
from frappe import _

class SchoolIdentification(Document):
    def validate(self):
        # Ensure teacher counts are valid integers
        self.number_of_male_teachers = int(self.number_of_male_teachers or 0)
        self.number_of_female_teachers = int(self.number_of_female_teachers or 0)
        self.number_of_teachers = self.number_of_male_teachers + self.number_of_female_teachers

        # Ensure assistant teacher counts are valid integers
        self.number_of_male_assistant_teachers = int(self.number_of_male_assistant_teachers or 0)
        self.number_of_female_assistant_teachers = int(self.number_of_female_assistant_teachers or 0)
        self.number_of_assistant_teachers = self.number_of_male_assistant_teachers + self.number_of_female_assistant_teachers

@frappe.whitelist(allow_guest=True)
def generate_and_send_auth_code(school_email, school_name):
    if not school_email:
        return {'status': 'error', 'message': _('School email is required.')}

    auth_code = random_string(6)
    expiry_time = add_to_date(now_datetime(), hours=1)

    auth_code_doc = frappe.get_doc({
        'doctype': 'Authentication Code',
        'school_email': school_email,
        'authentication_code': auth_code,
        'expiry_time': expiry_time,
        'school_name': school_name
    })

    auth_code_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    # Send the code via email
    subject = _("Your Authentication Code")
    message = _("Dear {0},<br><br>Your authentication code is <strong>{1}</strong>. It will expire in 1 hour.<br><br>Best regards,<br>Your Organization").format(school_name, auth_code)

    frappe.sendmail(
        recipients=[school_email],
        subject=subject,
        message=message
    )

    return {'status': 'success', 'message': _('Authentication code sent to {0}').format(school_email)}

@frappe.whitelist(allow_guest=True)
def verify_auth_code(school_email, authentication_code):
    
    name= frappe.db.get_value('Authentication Code',{
        'school_email':school_email,
        'authentication_code':authentication_code
    
    },'name')

    if not name:
        return{'status':'error','message':_('Invalid authentication code.')}
    
    auth_code_doc = frappe.get_doc('Authentication Code',name)
    current_time = now_datetime()

    if current_time > auth_code_doc.expiry_time:
        frappe.delete_doc('Authentication Code',auth_code_doc.name,ignore_permissions=True)
        frappe.db.commit()
        return {'status':'error','message':_('Authentication Code has expired.')}

    frappe.local.session['auth_verified'] = True
    frappe.local.session['auth_verified_until'] = auth_code_doc.expiry_time

    # Delete the used code
    frappe.delete_doc('Authentication Code', auth_code_doc.name, ignore_permissions=True)
    frappe.db.commit()

    return {'status': 'success', 'message': _('Authentication successful.')}
