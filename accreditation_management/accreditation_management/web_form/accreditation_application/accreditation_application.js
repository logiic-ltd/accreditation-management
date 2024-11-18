frappe.ready(function() {
    // Initialize step navigation
    let currentStep = 1;
    showCurrentStep();

    // Handle school search and selection
    initSchoolSearch();

    // Step navigation functions
    function showCurrentStep() {
        $('.step').hide();
        $(`#step${currentStep}`).show();
        updateProgressIndicator();
    }

    function updateProgressIndicator() {
        $('.step-indicator').removeClass('active');
        $(`.step-indicator[data-step="${currentStep}"]`).addClass('active');
    }

    // Next step button handler
    $('#nextStep').on('click', async function() {
        const schoolCode = $('#schoolCode').val();
        if (!schoolCode) {
            frappe.msgprint({
                title: __('School Selection Required'),
                indicator: 'red',
                message: __('Please select a school before proceeding.')
            });
            return;
        }

        const isValid = await validatePrerequisites(schoolCode);
        if (isValid) {
            currentStep = 2;
            showCurrentStep();
        }
    });

    // Back button handler
    $('#backToSearch').on('click', function() {
        currentStep = 1;
        showCurrentStep();
    });

    // School search initialization
    function initSchoolSearch() {
        let $searchInput = $('#searchSchool');
        let $results = $('#schoolSearchResults');
        let searchTimeout;

        $searchInput.on('input', function() {
            clearTimeout(searchTimeout);
            let searchTerm = $(this).val();
            
            if (searchTerm.length < 3) {
                $results.empty();
                return;
            }

            searchTimeout = setTimeout(() => {
                frappe.call({
                    method: 'accreditation_management.www.self_assessment.search_schools',
                    args: { search_term: searchTerm },
                    callback: function(r) {
                        if (r.message && r.message.schools) {
                            displaySearchResults(r.message.schools);
                        }
                    }
                });
            }, 300);
        });

        function displaySearchResults(schools) {
            let html = schools.map(school => `
                <div class="school-result" data-code="${school.code}">
                    <strong>${school.name}</strong><br>
                    <small>${school.location || ''}</small>
                </div>
            `).join('');
            
            $results.html(html);

            $('.school-result').on('click', function() {
                let schoolCode = $(this).data('code');
                populateSchoolDetails(schoolCode);
                $results.empty();
            });
        }
    }

    // Prerequisites validation
    async function validatePrerequisites(schoolCode) {
        try {
            const result = await frappe.call({
                method: 'accreditation_management.www.accreditation_application.validate_prerequisites',
                args: { school_code: schoolCode }
            });
            
            if (result.message.success) {
                $('#self_assessment').val(result.message.self_assessment);
                $('#school_identification').val(result.message.school_identification);
                await updatePrerequisitesSummary(schoolCode);
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

    // Update prerequisites summary
    async function updatePrerequisitesSummary(schoolCode) {
        try {
            const result = await frappe.call({
                method: 'accreditation_management.www.accreditation_application.get_prerequisites_summary',
                args: { school_code: schoolCode }
            });
            
            if (result.message) {
                displayPrerequisitesSummary(result.message);
                $('#prerequisitesSummary').show();
            }
        } catch (error) {
            console.error('Error updating prerequisites summary:', error);
        }
    }

    function displayPrerequisitesSummary(data) {
        const idSummary = data.identification;
        const assessmentSummary = data.assessment;

        $('#schoolIdSummary').html(`
            <div class="card">
                <div class="card-header">School Identification Summary</div>
                <div class="card-body">
                    <p><strong>Registration Date:</strong> ${idSummary.registration_date || 'N/A'}</p>
                    <p><strong>License Number:</strong> ${idSummary.license_number || 'N/A'}</p>
                    <p><strong>Status:</strong> ${idSummary.status || 'N/A'}</p>
                </div>
            </div>
        `);

        $('#selfAssessmentSummary').html(`
            <div class="card">
                <div class="card-header">Self Assessment Summary</div>
                <div class="card-body">
                    <p><strong>Date:</strong> ${assessmentSummary.date || 'N/A'}</p>
                    <p><strong>Overall Score:</strong> ${assessmentSummary.overall_score || 'N/A'}%</p>
                    <p><strong>Provisional Ranking:</strong> ${assessmentSummary.provisional_ranking || 'N/A'}</p>
                </div>
            </div>
        `);
    }

    // Form submission handler
    $('form[data-web-form="accreditation-application"]').on('submit', async function(e) {
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
