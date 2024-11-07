// Copyright (c) 2024, Ezra Mungai and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accreditation", {
    refresh(frm) {
        frm.page.clear_actions_menu();
        
        // Get available workflow actions
        let workflow_actions = frm.get_doctype_workflow().transitions.filter(
            d => d.state === frm.doc.workflow_state
        );

        if (workflow_actions.length) {
            let actions_dropdown = frm.page.add_action_item(__("Actions ▼"), function() {
                // This function will be overwritten, it's just a placeholder
            });

            // Create dropdown menu
            let dropdown_options = workflow_actions.map(action => {
                return {
                    label: __(action.action),
                    action: function() {
                        if (action.action === "Request Inspection") {
                            frm.call('request_inspection').then(() => frm.refresh());
                        } else if (action.action === "Complete Inspection") {
                            frm.call('complete_inspection').then(() => frm.refresh());
                        } else {
                            frm.workflow_action(action.action);
                        }
                    }
                };
            });

            // Assign dropdown options to the action button
            actions_dropdown.dropdown_options = dropdown_options;

            // Override the default click action to show the dropdown
            actions_dropdown.on_click = function() {
                let dialog = new frappe.ui.Dialog({
                    title: __("Select Action"),
                    fields: [{
                        fieldtype: "HTML",
                        fieldname: "actions_html"
                    }]
                });

                let actions_html = dropdown_options.map(option => 
                    `<div class="dropdown-item" style="cursor: pointer; padding: 10px;">
                        ${option.label}
                    </div>`
                ).join("");

                dialog.fields_dict.actions_html.$wrapper.html(actions_html);
                dialog.fields_dict.actions_html.$wrapper.find(".dropdown-item").click(function() {
                    let action = dropdown_options[$(this).index()].action;
                    dialog.hide();
                    action();
                });

                dialog.show();
            };
        }
    },
});
