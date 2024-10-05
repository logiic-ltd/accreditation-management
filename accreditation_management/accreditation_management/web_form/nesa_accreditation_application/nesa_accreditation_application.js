frappe.ready(function() {
    let currentStep = 1;
    const totalSteps = 3;

    function updateProgressBar() {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        $('#progressBar').css('width', `${progress}%`);
    }

    function showStep(step) {
        $('.form-step').hide();
        $(`#step${step}`).show();
        $('.progress-step').removeClass('active');
        $(`.progress-step[data-step="${step}"]`).addClass('active');
        updateProgressBar();
    }

    $('.next-step').click(function() {
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    });

    $('.prev-step').click(function() {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    $('#nesaAccreditationForm').on('submit', function(e) {
        e.preventDefault();
        
        var json_data = {};
        $(this).serializeArray().forEach(function(item) {
            json_data[item.name] = item.value;
        });

        frappe.call({
            method: 'frappe.website.doctype.web_form.web_form.accept',
            type: 'POST',
            args: {
                web_form: 'nesa-accreditation-application',
                data: json_data
            },
            freeze: true,
            callback: function(data) {
                if(!data.exc) {
                    frappe.call({
                        method: 'accreditation_management.accreditation_management.doctype.accreditation.accreditation.create_accreditation',
                        args: {
                            data: json_data
                        },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.msgprint({
                                    title: __('Application Submitted'),
                                    indicator: 'green',
                                    message: __('Your NESA Accreditation Application has been submitted successfully. Your tracking number is: ' + r.message.tracking_number)
                                });
                                setTimeout(function() {
                                    window.location.href = '/application-status?tracking_number=' + r.message.tracking_number;
                                }, 3000);
                            }
                        }
                    });
                }
            }
        });
    });

    // Initialize the form
    showStep(1);
});
