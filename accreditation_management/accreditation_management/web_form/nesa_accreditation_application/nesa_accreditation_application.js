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
        
        var form_data = new FormData(this);
        var json_data = {};
        form_data.forEach((value, key) => {json_data[key] = value});

        frappe.call({
            method: 'frappe.website.doctype.web_form.web_form.accept',
            type: 'POST',
            args: {
                web_form: '{{ name }}',
                data: json_data
            },
            freeze: true,
            callback: function(data) {
                if(!data.exc) {
                    frappe.msgprint({
                        title: __('Application Submitted'),
                        indicator: 'green',
                        message: __('Your NESA Accreditation Application has been submitted successfully. We will review it and get back to you soon.')
                    });
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 2000);
                }
            }
        });
    });

    // Initialize the form
    showStep(1);
});
