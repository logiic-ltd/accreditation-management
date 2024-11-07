// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
    refresh(frm) {
        // Clear any existing custom buttons
        frm.page.clear_actions_menu();
        
        // Add custom buttons for "Request Inspection" and "Complete Inspection"
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
        
        // Add the standard workflow actions button
        frm.page.show_menu();
        frm.workflow_button_check();
    },
});
