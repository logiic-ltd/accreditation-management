import frappe
from frappe import _
from frappe.utils import get_url
from io import BytesIO
from frappe.utils.pdf import get_pdf

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
    QR_CODE_AVAILABLE = True
except ImportError:
    QR_CODE_AVAILABLE = False

@frappe.whitelist(allow_guest=True)
def get_application_status(tracking_number):
    application = frappe.get_doc("Accreditation", {"tracking_number": tracking_number})
    if application:
        return {
            "status": application.workflow_state,
            "school_name": application.school_name,
            "creation": application.creation.strftime("%Y-%m-%d %H:%M:%S")
        }
    return None

@frappe.whitelist(allow_guest=True)
def download_certificate(tracking_number):
    application = frappe.get_doc("Accreditation", {"tracking_number": tracking_number})
    if application and application.workflow_state == "Approved":
        certificate_html = generate_certificate_html(application)
        pdf = get_pdf(certificate_html)
        frappe.local.response.filename = f"{application.school_name}_Accreditation_Certificate.pdf"
        frappe.local.response.filecontent = pdf
        frappe.local.response.type = "download"

def generate_certificate_html(application):
    context = {
        "school_name": application.school_name,
        "tracking_number": application.tracking_number,
        "issue_date": frappe.utils.now_datetime().strftime("%B %d, %Y"),
        "qr_code": None
    }
    
    if QR_CODE_AVAILABLE:
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(get_url(f"/verify-certificate?tracking_number={application.tracking_number}"))
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = BytesIO()
        qr_img.save(buffered, format="PNG")
        qr_base64 = frappe.safe_decode(frappe.utils.cstr(frappe.utils.cstr(buffered.getvalue()).encode("base64")))
        context["qr_code"] = qr_base64
    
    return frappe.render_template("templates/certificate_template.html", context)
