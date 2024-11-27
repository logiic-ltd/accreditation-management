// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
    refresh(frm) {
        
        // Add validation for applicant role
        frm.set_df_property('applicant_role', 'description',
            'Select your role in relation to the school');
            
        // Add NID verification button
        if (!frm.doc.applicant_name) {
            frm.add_custom_button(__("Verify National ID"), function() {
                if (!frm.doc.national_id) {
                    frappe.msgprint(__("Please enter National ID number first"));
                    return;
                }
                
                frappe.call({
                    method: 'accreditation_management.www.nid_verification.verify_nid',
                    args: {
                        document_number: frm.doc.national_id
                    },
                    type_of_request: function(frm) {
                        // Custom logic for type_of_request field
                    },
                    other_request: function(frm) {
                        // Custom logic for other_request field
                    }
                    freeze: true,
                    freeze_message: __("Verifying National ID..."),
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            const data = r.message.data;
                            
                            // Update applicant name
                            frm.set_value('applicant_name', `${data.foreName} ${data.surnames}`);
                            
                            // Update address fields
                            frm.set_value('applicant_village', data.village);
                            frm.set_value('applicant_cell', data.cell);
                            frm.set_value('applicant_sector', data.sector);
                            frm.set_value('applicant_district', data.district);
                            frm.set_value('applicant_province', data.province);
                            
                            frappe.show_alert({
                                message: __("National ID verified successfully"),
                                indicator: 'green'
                            }, 5);
                        } else {
                            frappe.msgprint({
                                title: __("Verification Failed"),
                                indicator: 'red',
                                message: r.message.error || __("Failed to verify National ID")
                            });
                        }
                    }
                });
            }).addClass('btn-primary');
        }
            
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
