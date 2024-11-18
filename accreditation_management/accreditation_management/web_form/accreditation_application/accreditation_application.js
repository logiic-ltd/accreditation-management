frappe.ready(function() {
    // Check for valid self assessment and school identification before allowing submission
    async function validatePrerequisites(schoolCode) {
        try {
            const result = await frappe.call({
                method: 'accreditation_management.www.accreditation_application.validate_prerequisites',
                args: { school_code: schoolCode }
            });
            
            if (result.message.success) {
                // Store the valid document references
                $('#self_assessment').val(result.message.self_assessment);
                $('#school_identification').val(result.message.school_identification);
                return true;
            } else {
                frappe.msgprint({
                    title: __('Prerequisites Not Met'),
                    indicator: 'red',
                    message: result.message.error
                });
                return false;
            }
        } catch (error) {
            frappe.msgprint({
                title: __('Validation Error'),
                indicator: 'red',
                message: __('Error checking prerequisites. Please try again.')
            });
            return false;
        }
    }

    // Bind form submission
    $('#accreditationForm').on('submit', async function(e) {
        e.preventDefault();
        
        const schoolCode = $('#schoolCode').val();
        const isValid = await validatePrerequisites(schoolCode);
        
        if (!isValid) {
            return false;
        }

        var formData = {};
        $(this).serializeArray().forEach(function(item) {
            formData[item.name] = item.value;
        });

        frappe.call({
            method: 'accreditation_management.www.accreditation_application.submit_application',
            args: {
                form_data: JSON.stringify(formData)
            },
            freeze: true,
            callback: function(r) {
                if (!r.exc) {
                    frappe.msgprint({
                        title: __('Application Submitted'),
                        indicator: 'green',
                        message: __('Your application has been submitted successfully. Your tracking number is: ' + r.message)
                    });
                    setTimeout(function() {
                        window.location.href = '/application-status?tracking_number=' + r.message;
                    }, 3000);
                } else {
                    frappe.msgprint({
                        title: __('Submission Failed'),
                        indicator: 'red',
                        message: __('There was an error submitting your application. Please try again.')
                    });
                }
            }
        });
    });

    // Handle navigation between steps
    $('#nextStep').on('click', function() {
        $('#step1').hide();
        $('#step2').show();
    });

    $('#backToSearch').on('click', function() {
        $('#step2').hide();
        $('#step1').show();
    });
});
