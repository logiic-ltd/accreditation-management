// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
    refresh(frm) {
        if (frm.doc.workflow_state === "Under Specialist Review") {
            frm.add_custom_button(__("Request Inspection"), function() {
                frm.call('request_inspection').then(() => frm.refresh());
            });
        }
        if (frm.doc.workflow_state === "Inspection Requested") {
            frm.add_custom_button(__("Complete Inspection"), function() {
                frm.call('complete_inspection').then(() => frm.refresh());
            });
        }
    },
});
