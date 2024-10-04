// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
	refresh(frm) {
		if (frm.doc.workflow_state === "Submitted") {
			frm.add_custom_button(__("Start Review"), function() {
				frm.call('start_review').then(() => frm.refresh());
			});
		}
		if (frm.doc.workflow_state === "Under Review") {
			frm.add_custom_button(__("Approve"), function() {
				frm.call('approve').then(() => frm.refresh());
			});
			frm.add_custom_button(__("Reject"), function() {
				frm.call('reject').then(() => frm.refresh());
			});
		}
		if (frm.doc.workflow_state === "Rejected") {
			frm.add_custom_button(__("Resubmit"), function() {
				frm.call('resubmit').then(() => frm.refresh());
			});
		}
	},
});
