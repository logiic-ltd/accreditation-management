import frappe

def redirect_after_logout(login_manager):
    """Redirect to landing page after logout"""
    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = "/accreditation"
