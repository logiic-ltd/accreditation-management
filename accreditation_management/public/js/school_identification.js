frappe.ready(function() {
    // Check if coming from accreditation page
    const requestType = localStorage.getItem('accreditationRequestType');
    if (requestType) {
        frappe.show_alert({
            message: `Starting application process for ${requestType}`,
            indicator: 'blue'
        }, 5);
    }
    
    $('#schoolInfoTable').hide(); // Hide the school info table by default
    initSchoolSearch();
    initFormNavigation();

    function initSchoolSearch() {
        let $searchInput = $('#schoolSearch');
        let $results = $('#schoolSearchResults');
        let searchTimeout;

        $searchInput.on('input', function() {
            $('#schoolInfoTable').hide(); // Hide the school info table when typing
            clearTimeout(searchTimeout);
            let searchTerm = $searchInput.val();
            if (searchTerm.length < 3) {
                $results.empty();
                return;
            }

            $results.html('<p>Searching...</p>');

            searchTimeout = setTimeout(() => {
                frappe.call({
                    method: 'accreditation_management.www.self_assessment.search_schools',
                    args: { search_term: searchTerm },
                    callback: function(r) {
                        if (r.message && r.message.content && r.message.content.length > 0) {
                            let results = r.message.content;
                            let html = results.map(item => `
                                <div class="school-item" style="cursor: pointer; padding: 5px; border-bottom: 1px solid #ccc;">
                                    <strong>${frappe.utils.escape_html(item.schoolName)}</strong><br>
                                    <small>${frappe.utils.escape_html(item.province || '')}${item.province && item.district ? ', ' : ''}${frappe.utils.escape_html(item.district || '')}</small>
                                </div>
                            `).join('');
                            $results.html(html);

                            $results.find('.school-item').on('click', function() {
                                let index = $(this).index();
                                let item = results[index];
                                $('#schoolName').val(item.schoolName);
                                $('#schoolCode').val(item.schoolCode);
                                $('#schoolEmail').val(item.schoolEmail || '');  // Set email field
                                $('#schoolNameDisplay').text(item.schoolName);
                                $('#schoolCodeDisplay').text(item.schoolCode);
                                $('#schoolEmailDisplay').text(item.schoolEmail || 'N/A');
                                $('#provinceDisplay').text(item.province || 'N/A');
                                $('#districtDisplay').text(item.district || 'N/A');
                                $('#sectorDisplay').text(item.sector || 'N/A');
                                $('#cellDisplay').text(item.cell || 'N/A');
                                $('#villageDisplay').text(item.village || 'N/A');
                                $('#schoolInfoTable').show(); // Show the school info table
                                $searchInput.val(item.schoolName);
                                $results.empty();

                                // Populate other form fields
                                $('#schoolEmail').val(item.schoolEmail || '');  // Ensure email is populated
                                $('#status').val(item.status || '');
                                $('#schoolOwner').val(item.schoolOwner || '');
                                $('#contact').val(item.contact || '');
                                $('#accommodationStatus').val(item.accommodationStatus || '');
                                $('#yearOfEstablishment').val(item.yearOfEstablishment || '');
                                $('#village').val(item.village || '');
                                $('#cell').val(item.cell || '');
                                $('#sector').val(item.sector || '');
                                $('#district').val(item.district || '');
                                $('#province').val(item.province || '');
                            });
                        } else {
                            $results.html('<p>No results found or unable to connect to the API. Please try again later.</p>');
                        }
                    }
                });
            }, 300);
        });

        $searchInput.on('blur', function() {
            setTimeout(() => {
                $results.empty();
            }, 200);
        });
    }

    let emailVerified = false;
    
    function initFormNavigation() {
        const sections = $('fieldset');
        let currentSection = 0;
        
        function updateNextButton() {
            if (currentSection === 0) {
                if ($('#schoolInfoTable').is(':visible')) {
                    if (emailVerified) {
                        $('#nextButton').text('Next').prop('disabled', false);
                    } else {
                        $('#nextButton').text('Verify School Email').prop('disabled', false);
                    }
                } else {
                    $('#nextButton').text('Next').prop('disabled', true);
                }
            } else {
                $('#nextButton').text(currentSection === sections.length - 1 ? 'Continue to Self Assessment' : 'Next');
            }
        }
        
        // Show first section by default
        $(sections[0]).addClass('active');
        $('#schoolSearch').closest('fieldset').addClass('active'); // Ensure school search is visible
        // Update progress bar
        function updateProgress() {
            const progress = ((currentSection + 1) / sections.length) * 100;
            $('.progress-bar').css('width', progress + '%');
        }
        
        // Handle next button click
        $('#nextButton').click(function() {
            if (currentSection === 0 && !emailVerified && $('#schoolInfoTable').is(':visible')) {
                // Show verification modal and send code
                const schoolEmail = $('#schoolEmailDisplay').text();
                if (schoolEmail === 'N/A' || !schoolEmail) {
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('No email address available for this school.')
                    });
                    return;
                }
                
                // Update email display in modal
                $('#verificationEmailDisplay').text(schoolEmail);
                
                // Clear previous code and errors
                $('#verificationCode').val('');
                $('#verificationSuccess').hide();
                
                // Show modal
                $('#verificationModal').modal('show');
                
                // Focus on input
                setTimeout(() => {
                    $('#verificationCode').focus();
                }, 500);
                
                frappe.call({
                    method: 'accreditation_management.www.school_identification.send_verification_code',
                    args: {
                        school_email: schoolEmail
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.show_alert({
                                message: __('Verification code sent to school email'),
                                indicator: 'blue'
                            }, 5);
                        }
                    }
                });
                return;
            }
            
            if (currentSection === sections.length - 1) {
                // On the last section, submit the form
                $('#schoolIdentificationForm').submit();
            } else if (currentSection < sections.length - 1) {
                $(sections[currentSection]).removeClass('active');
                currentSection++;
                $(sections[currentSection]).addClass('active');
                
                // Show/hide navigation buttons
                $('#prevButton').show();
                if (currentSection === sections.length - 1) {
                    $('#nextButton').text('Continue to Self Assessment');
                    $('#nextButton').addClass('btn-primary');
                    populateSummary();
                } else {
                    $('#nextButton').text('Next');
                    $('#nextButton').removeClass('btn-primary');
                }
                
                updateProgress();
                window.scrollTo(0, 0);
            }
        });
        
        // Handle previous button click
        $('#prevButton').click(function() {
            if (currentSection > 0) {
                $(sections[currentSection]).removeClass('active');
                currentSection--;
                $(sections[currentSection]).addClass('active');
                
                // Show/hide navigation buttons
                $('#nextButton').show().text('Next').removeClass('btn-primary');
                if (currentSection === 0) {
                    $('#prevButton').hide();
                }
                
                updateProgress();
                window.scrollTo(0, 0);
            }
        });
        
        // Initialize progress bar
        updateProgress();
    }

    function calculateTotalAdministrativeStaff() {
        const fields = ['headteacher', 'deputyHeadteacher', 'secretary', 'librarian', 'accountant', 'otherStaff'];
        let total = 0;
        fields.forEach(field => {
            const value = parseInt($(`#${field}`).val()) || 0;
            total += value;
        });
        $('#totalNumberOfAdministrativeStaff').val(total);
    }

    function calculateTotalSupportingStaff() {
        const fields = ['cleaners', 'watchmen', 'schoolCooks', 'storekeeper', 'drivers', 'otherSupportingStaff'];
        let total = 0;
        fields.forEach(field => {
            const value = parseInt($(`#${field}`).val()) || 0;
            total += value;
        });
        $('#totalNumberOfSupportingStaff').val(total);
    }

    function calculateTotalStudents() {
        const boys = parseInt($('#numberOfBoys').val()) || 0;
        const girls = parseInt($('#numberOfGirls').val()) || 0;
        $('#totalNrStudents').val(boys + girls);
    }

    function calculateTotalTeachers() {
        const maleTeachers = parseInt($('#numberOfMaleTeachers').val()) || 0;
        const femaleTeachers = parseInt($('#numberOfFemaleTeachers').val()) || 0;
        $('#numberOfTeachers').val(maleTeachers + femaleTeachers);
    }

    function calculateTotalAssistantTeachers() {
        const maleAssistantTeachers = parseInt($('#numberOfMaleAssistantTeachers').val()) || 0;
        const femaleAssistantTeachers = parseInt($('#numberOfFemaleAssistantTeachers').val()) || 0;
        $('#numberOfAssistantTeachers').val(maleAssistantTeachers + femaleAssistantTeachers);
    }

    $('#schoolIdentificationForm input').on('input', function() {
        calculateTotalAdministrativeStaff();
        calculateTotalSupportingStaff();
        calculateTotalStudents();
        calculateTotalTeachers();
        calculateTotalAssistantTeachers();
    });
    
    // Initialize verification code inputs
    function initVerificationInputs() {
        const inputs = document.querySelectorAll('.code-input');
        
        inputs.forEach((input, index) => {
            input.addEventListener('keyup', (e) => {
                const value = e.target.value;
                
                // Only allow numbers
                if (!/^\d*$/.test(value)) {
                    input.value = '';
                    return;
                }
                
                // Auto-focus next input
                if (value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                
                // Handle backspace
                if (e.key === 'Backspace' && !value && index > 0) {
                    inputs[index - 1].focus();
                }
                
                // Update hidden input with complete code
                updateVerificationCode();
            });
            
            // Handle paste event
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                
                pastedData.split('').forEach((digit, i) => {
                    if (inputs[i]) {
                        inputs[i].value = digit;
                    }
                });
                
                updateVerificationCode();
                if (inputs[pastedData.length]) {
                    inputs[pastedData.length].focus();
                }
            });
        });
    }
    
    function updateVerificationCode() {
        const code = Array.from(document.querySelectorAll('.code-input'))
            .map(input => input.value)
            .join('');
        document.getElementById('verificationCode').value = code;
    }
    
    // Handle verification code submission
    $('#verifyCodeBtn').click(function() {
        const $btn = $(this);
        const $loader = $btn.find('.verification-loader');
        const $text = $btn.find('.verify-text');
        const schoolEmail = $('#schoolEmailDisplay').text();
        const code = $('#verificationCode').val();
        
        if (code.length !== 6) {
            showVerificationFeedback('error', 'Please enter the complete 6-digit code');
            $('.code-input').addClass('error');
            setTimeout(() => $('.code-input').removeClass('error'), 500);
            return;
        }
        
        // Show loading state
        $btn.prop('disabled', true);
        $text.css('opacity', '0');
        $loader.show();
        
        frappe.call({
            method: 'accreditation_management.www.school_identification.verify_code',
            args: {
                school_email: schoolEmail,
                verification_code: code
            },
            callback: function(r) {
                if (!r.exc) {
                    emailVerified = true;
                    showVerificationFeedback('success', 'Email verified successfully!');
                    
                    setTimeout(() => {
                        $('#verificationModal').modal('hide');
                        const sections = $('fieldset');
                        $(sections[0]).removeClass('active');
                        $(sections[1]).addClass('active');
                        $('#prevButton').show();
                        updateProgress();
                        window.scrollTo(0, 0);
                    }, 1500);
                } else {
                    let errorMsg;
                    try {
                        const messages = JSON.parse(r._server_messages);
                        errorMsg = Array.isArray(messages) ? messages[0] : messages;
                    } catch (e) {
                        errorMsg = 'Verification failed';
                    }
                    showVerificationFeedback('error', errorMsg);
                    resetVerificationForm();
                    
                    // Reset button state
                    $btn.prop('disabled', false);
                    $text.css('opacity', '1');
                    $loader.hide();
                }
            },
            error: function() {
                showVerificationFeedback('error', 'Network error. Please try again.');
                resetVerificationForm();
                $btn.prop('disabled', false);
                $text.css('opacity', '1');
                $loader.hide();
            }
        });
    });
    
    function showVerificationFeedback(type, message) {
        const $feedback = $('.verification-feedback');
        const $alert = $feedback.find('.alert');
        const $icon = $feedback.find('.fa');
        const $message = $feedback.find('.feedback-message');
        
        $alert.removeClass('alert-success alert-danger')
              .addClass(type === 'success' ? 'alert-success' : 'alert-danger');
        $icon.removeClass('fa-check-circle fa-exclamation-circle')
             .addClass(type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle');
        $message.text(message);
        $feedback.fadeIn();
    }
    
    function resetVerificationForm() {
        const $btn = $('#verifyCodeBtn');
        const $loader = $btn.find('.verification-loader');
        const $text = $btn.find('.verify-text');
        
        $btn.prop('disabled', false);
        $text.css('opacity', '1');
        $loader.hide();
        $('.code-input').val('').first().focus();
        $('#verificationCode').val('');
    }
    
    // Handle resend code with cooldown
    let resendTimer = null;
    $('#resendCodeBtn').click(function() {
        const $btn = $(this);
        const $timer = $btn.find('.resend-timer');
        
        if ($btn.prop('disabled')) return;
        
        const schoolEmail = $('#schoolEmailDisplay').text();
        $btn.prop('disabled', true);
        
        frappe.call({
            method: 'accreditation_management.www.school_identification.send_verification_code',
            args: { school_email: schoolEmail },
            callback: function(r) {
                if (!r.exc) {
                    showVerificationFeedback('success', 'New verification code sent');
                    startResendTimer($btn, $timer);
                } else {
                    $btn.prop('disabled', false);
                    showVerificationFeedback('error', 'Failed to send code. Please try again.');
                }
            }
        });
    });
    
    function startResendTimer($btn, $timer) {
        let timeLeft = 30;
        $timer.show();
        
        if (resendTimer) clearInterval(resendTimer);
        
        resendTimer = setInterval(() => {
            timeLeft--;
            $timer.text(`(${timeLeft}s)`);
            
            if (timeLeft <= 0) {
                clearInterval(resendTimer);
                $btn.prop('disabled', false);
                $timer.hide();
            }
        }, 1000);
    }
    
    // Initialize verification inputs when modal shows
    $('#verificationModal').on('shown.bs.modal', function() {
        initVerificationInputs();
        $('.code-input').first().focus();
    });

    function populateSummary() {
        // Basic Information Summary
        const basicInfo = {
            'School Name': $('#schoolName').val(),
            'School Code': $('#schoolCode').val(),
            'Status': $('#status').val(),
            'Type of School': $('#typeOfSchool').val(),
            'School Owner': $('#schoolOwner').val()
        };
        
        // Student Information Summary
        const studentInfo = {
            'Total Students': $('#totalNrStudents').val(),
            'Boys': $('#numberOfBoys').val(),
            'Girls': $('#numberOfGirls').val(),
            'Students with SEN': $('#studentsWithSEN').val()
        };
        
        // Staff Information Summary
        const staffInfo = {
            'Total Teachers': $('#numberOfTeachers').val(),
            'Total Assistant Teachers': $('#numberOfAssistantTeachers').val(),
            'Administrative Staff': $('#totalNumberOfAdministrativeStaff').val(),
            'Supporting Staff': $('#totalNumberOfSupportingStaff').val()
        };
        
        // Infrastructure Summary
        const infrastructureInfo = {
            'Classrooms': $('#nbrOfClassrooms').val(),
            'Latrines/Toilets': $('#nbrOfLatrines').val(),
            'Kitchen': $('#numberOfKitchen').val(),
            'Dining Hall': $('#numberOfDiningHall').val(),
            'Library': $('#numberOfLibrary').val(),
            'Smart Classrooms': $('#numberOfSmartClassrooms').val(),
            'Computer Laboratory': $('#numberOfComputerLab').val(),
            'Administrative Offices': $('#numberOfAdminOffices').val(),
            'Multipurpose Halls': $('#numberOfMultipurposeHalls').val(),
            'Academic Staff Rooms': $('#numberOfAcademicStaffRooms').val()
        };

        // Populate summary sections
        ['basicInfo', 'studentInfo', 'staffInfo', 'infrastructureInfo'].forEach(section => {
            const $container = $(`#${section}Summary`);
            $container.empty();
            
            const data = eval(section);
            Object.entries(data).forEach(([label, value]) => {
                if (value) {
                    $container.append(`
                        <div class="summary-item">
                            <span class="summary-label">${label}:</span>
                            <span class="summary-value">${value}</span>
                        </div>
                    `);
                }
            });
        });
    }

    function clearValidationErrors() {
        $('.field-error').removeClass('field-error');
        $('.error-message').remove();
    }

    function handleValidationErrors(errors) {
        clearValidationErrors();
        
        Object.entries(errors).forEach(([fieldName, errorMessage]) => {
            const field = $(`[name="${fieldName}"]`);
            if (field.length) {
                field.addClass('field-error');
                field.after(`<div class="error-message">${errorMessage}</div>`);
                
                // If this field is in a non-active section, switch to that section
                const fieldset = field.closest('fieldset');
                if (!fieldset.hasClass('active')) {
                    const sections = $('fieldset');
                    const currentSection = sections.index(fieldset);
                    
                    // Update navigation
                    sections.removeClass('active');
                    fieldset.addClass('active');
                    
                    // Update buttons and progress
                    $('#prevButton').toggle(currentSection > 0);
                    $('#nextButton').text(currentSection === sections.length - 1 ? 'Continue to Self Assessment' : 'Next');
                    
                    // Update progress bar
                    const progress = ((currentSection + 1) / sections.length) * 100;
                    $('.progress-bar').css('width', progress + '%');
                    
                    window.scrollTo(0, 0);
                }
            }
        });
        
        // Scroll to first error if not visible
        const firstError = $('.field-error').first();
        if (firstError.length) {
            const errorTop = firstError.offset().top - 100;
            window.scrollTo(0, errorTop);
        }
    }

    $('#schoolIdentificationForm').on('submit', function(e) {
        e.preventDefault();
        clearValidationErrors();

        var formData = {};
        $(this).serializeArray().forEach(function(item) {
            formData[item.name] = item.value;
        });

        frappe.call({
            method: 'accreditation_management.www.school_identification.submit_school_identification',
            args: {
                form_data: JSON.stringify(formData)
            },
            freeze: true,
            callback: function(r) {
                if (!r.exc) {
                    frappe.msgprint({
                        title: __('Form Submitted'),
                        indicator: 'green',
                        message: __('Your school identification form has been submitted successfully.')
                    });
                    // Store school details and request type in localStorage before redirecting
                    const schoolDetails = {
                        schoolName: $('#schoolName').val(),
                        schoolCode: $('#schoolCode').val(),
                        province: $('#province').val(),
                        district: $('#district').val(),
                        sector: $('#sector').val(),
                        cell: $('#cell').val(),
                        village: $('#village').val(),
                        requestType: localStorage.getItem('accreditationRequestType')
                    };
                    localStorage.setItem('schoolDetails', JSON.stringify(schoolDetails));
                    window.location.href = '/self_assessment';
                } else {
                    if (r._server_messages) {
                        try {
                            const errors = JSON.parse(r._server_messages);
                            if (typeof errors === 'object' && errors !== null) {
                                handleValidationErrors(errors);
                                frappe.msgprint({
                                    title: __('Validation Failed'),
                                    indicator: 'red',
                                    message: __('Please correct the highlighted fields and try again.')
                                });
                                return;
                            }
                        } catch (e) {
                            // If not validation errors, show generic error
                        }
                    }
                    frappe.msgprint({
                        title: __('Submission Failed'),
                        indicator: 'red',
                        message: __('There was an error submitting your form. Please try again.')
                    });
                }
            }
        });
    });
});

function initSchoolSearch() {
    let $searchInput = $('#schoolSearch');
    let $results = $('#schoolSearchResults');
    let searchTimeout;

    $searchInput.on('input', function() {
        clearTimeout(searchTimeout);
        let searchTerm = $searchInput.val();
        if (searchTerm.length < 3) {
            $results.empty();
            return;
        }

        $results.html('<p>Searching...</p>');

        searchTimeout = setTimeout(() => {
            frappe.call({
                method: 'accreditation_management.www.self_assessment.search_schools',
                args: { search_term: searchTerm },
                callback: function(r) {
                    if (r.message && r.message.content && r.message.content.length > 0) {
                        let results = r.message.content;
                        let html = results.map(item => `
                            <div class="school-item" style="cursor: pointer; padding: 5px; border-bottom: 1px solid #ccc;">
                                <strong>${frappe.utils.escape_html(item.schoolName)}</strong><br>
                                <small>${frappe.utils.escape_html(item.province || '')}${item.province && item.district ? ', ' : ''}${frappe.utils.escape_html(item.district || '')}</small>
                            </div>
                        `).join('');
                        $results.html(html);

                        $results.find('.school-item').on('click', function() {
                            let index = $(this).index();
                            let item = results[index];
                            $('#schoolName').val(item.schoolName);
                            $('#schoolCode').val(item.schoolCode);
                            $('#schoolEmail').val(item.schoolEmail || '');  // Set email field
                            $('#schoolNameDisplay').text(item.schoolName);
                            $('#schoolCodeDisplay').text(item.schoolCode);
                            $('#schoolEmailDisplay').text(item.schoolEmail || 'N/A');
                            $('#provinceDisplay').text(item.province || 'N/A');
                            $('#districtDisplay').text(item.district || 'N/A');
                            $('#sectorDisplay').text(item.sector || 'N/A');
                            $('#cellDisplay').text(item.cell || 'N/A');
                            $('#villageDisplay').text(item.village || 'N/A');
                            $('#schoolInfoTable').show();
                            $searchInput.val(item.schoolName);
                            $results.empty();

                            // Populate other form fields
                            $('#schoolEmail').val(item.schoolEmail || '');  // Ensure email is populated
                            $('#status').val(item.status || '');
                            $('#schoolOwner').val(item.schoolOwner || '');
                            $('#contact').val(item.contact || '');
                            $('#accommodationStatus').val(item.accommodationStatus || '');
                            $('#yearOfEstablishment').val(item.yearOfEstablishment || '');
                            $('#village').val(item.village || '');
                            $('#cell').val(item.cell || '');
                            $('#sector').val(item.sector || '');
                            $('#district').val(item.district || '');
                            $('#province').val(item.province || '');
                        });
                    } else {
                        $results.html('<p>No results found or unable to connect to the API. Please try again later.</p>');
                    }
                }
            });
        }, 300);
    });

    $searchInput.on('blur', function() {
        setTimeout(() => {
            $results.empty();
        }, 200);
    });
}
