// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
    refresh(frm) {
        frm.page.clear_actions_menu();
        
        if (frm.doc.workflow_state === "Initial Draft") {
            frm.page.add_action_item(__("Submit Application"), function() {
                frm.workflow_action("Submit Application");
            });
        }
        
        if (frm.doc.workflow_state === "Pending Specialist Review") {
            frm.page.add_action_item(__("Start Review"), function() {
                frm.workflow_action("Start Review");
            });
        }
        
        if (frm.doc.workflow_state === "Under Specialist Review") {
            frm.page.add_action_item(__("Request Inspection"), function() {
                frm.call('request_inspection').then(() => frm.refresh());
            });
            frm.page.add_action_item(__("Reject Application"), function() {
                frm.workflow_action("Reject Application");
            });
            frm.page.add_action_item(__("Send for HoD Review"), function() {
                frm.workflow_action("Send for HoD Review");
            });
        }
        
        if (frm.doc.workflow_state === "Inspection Requested") {
            frm.page.add_action_item(__("Complete Inspection"), function() {
                frm.call('complete_inspection').then(() => frm.refresh());
            });
        }
        
        if (frm.doc.workflow_state === "Pending HoD Review") {
            frm.page.add_action_item(__("Start HoD Review"), function() {
                frm.workflow_action("Start HoD Review");
            });
        }
        
        if (frm.doc.workflow_state === "Under HoD Review") {
            frm.page.add_action_item(__("Return to Specialist"), function() {
                frm.workflow_action("Return to Specialist");
            });
            frm.page.add_action_item(__("Send for DG Approval"), function() {
                frm.workflow_action("Send for DG Approval");
            });
        }
        
        if (frm.doc.workflow_state === "Pending DG Approval") {
            frm.page.add_action_item(__("Approve"), function() {
                frm.workflow_action("Approve");
            });
            frm.page.add_action_item(__("Reject"), function() {
                frm.workflow_action("Reject");
            });
            frm.page.add_action_item(__("Return to HoD"), function() {
                frm.workflow_action("Return to HoD");
            });
        }
    },
});
