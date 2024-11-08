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
            "status": application.status,
            "school_name": application.school_name,
            "creation": application.creation.strftime("%Y-%m-%d %H:%M:%S")
        }
    return None

@frappe.whitelist(allow_guest=True)
def download_certificate(tracking_number):
    application = frappe.get_doc("Accreditation", {"tracking_number": tracking_number})
    if application and application.workflow_state == "Approved":
        if not application.certificate_generated:
            # Generate the certificate if it hasn't been generated yet
            application.generate_certificate()
            application.reload()

        # Get the existing certificate file
        files = frappe.get_all("File", 
            filters={
                "attached_to_doctype": "Accreditation", 
                "attached_to_name": application.name,
                "file_name": ("like", "%_Accreditation_Certificate.pdf")
            },
            fields=["name", "file_name"]
        )
        if files:
            file = frappe.get_doc("File", files[0].name)
            frappe.local.response.filename = file.file_name
            frappe.local.response.filecontent = file.get_content()
            frappe.local.response.type = "download"
        else:
            frappe.throw(_("Certificate file not found. Please contact support."))
    else:
        frappe.throw(_("Certificate not available for this application."))

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
        qr_base64 = frappe.safe_decode(frappe.utils.base64.b64encode(buffered.getvalue()))
        context["qr_code"] = qr_base64
    
    return frappe.render_template("templates/certificate_template.html", context)
