// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
    refresh(frm) {
        // Add custom validation messages
        frm.set_df_property('type_of_request', 'description', 
            'Select at least one: TVET Trade, Combinations, Ordinary Level, Boarding Status, Primary Level, Preprimary Level');
        
        // Add validation for school status
        frm.set_df_property('school_status', 'description',
            'Select the current status of your school');
            
		if (frm.doc.status === "Submitted") {
			frm.add_custom_button(__("Start Review"), function() {
				frm.call('change_status', { new_status: "Under Review" }).then(() => frm.refresh());
			});
		}
		if (frm.doc.status === "Under Review") {
			frm.add_custom_button(__("Approve"), function() {
				frm.call('change_status', { new_status: "Approved" }).then(() => frm.refresh());
			});
			frm.add_custom_button(__("Reject"), function() {
				frm.call('change_status', { new_status: "Rejected" }).then(() => frm.refresh());
			});
		}
		if (frm.doc.status === "Rejected") {
			frm.add_custom_button(__("Resubmit"), function() {
				frm.call('change_status', { new_status: "Submitted" }).then(() => frm.refresh());
			});
		}
	},
});
