frappe.ready(function() {
    let emailVerified = false;
    
    initFormNavigation();
    initSchoolSearch();
    initVerificationHandlers();
    
    function initFormNavigation() {
        const sections = $('fieldset');
        let currentSection = 0;
        
        function updateNextButton() {
            if (currentSection === 0) {
                if ($('#schoolInfoTable').is(':visible')) {
                    if (emailVerified) {
                        $('#nextButton').text('Next').prop('disabled', false);
                    } else {
                        $('#nextButton').text('Verify Email').prop('disabled', false);
                    }
                } else {
                    $('#nextButton').prop('disabled', true);
                }
            }
        }

        function updateProgress() {
            const progress = ((currentSection + 1) / sections.length) * 100;
            $('.progress-bar').css('width', progress + '%');
        }

        $('#nextButton').click(function() {
            if (currentSection === 0 && !emailVerified) {
                $('#verificationModal').modal('show');
                return;
            }
            
            if (validateSection(currentSection)) {
                $(sections[currentSection]).hide();
                currentSection++;
                $(sections[currentSection]).show();
                updateNavigation();
                updateProgress();
            }
        });

        $('#prevButton').click(function() {
            $(sections[currentSection]).hide();
            currentSection--;
            $(sections[currentSection]).show();
            updateNavigation();
            updateProgress();
        });

        function updateNavigation() {
            $('#prevButton').toggle(currentSection > 0);
            $('#nextButton').text(currentSection === sections.length - 1 ? 'Submit' : 'Next');
            updateNextButton();
        }

        sections.hide();
        $(sections[currentSection]).show();
        updateNavigation();
        updateProgress();
    }

    function initSchoolSearch() {
        let $searchInput = $('#schoolSearch');
        let $results = $('#schoolSearchResults');
        let searchTimeout;

        $searchInput.on('input', function() {
            clearTimeout(searchTimeout);
            const query = $(this).val();

            if (query.length < 3) {
                $results.empty();
                return;
            }

            searchTimeout = setTimeout(() => {
                frappe.call({
                    method: 'accreditation_management.www.school_identification.search_schools',
                    args: { query: query },
                    callback: function(r) {
                        if (!r.exc) {
                            displaySearchResults(r.message);
                        }
                    }
                });
            }, 300);
        });

        function displaySearchResults(schools) {
            $results.empty();
            
            if (!schools.length) {
                $results.append('<div class="alert alert-info">No schools found</div>');
                return;
            }

            const $list = $('<div class="list-group"></div>');
            schools.forEach(school => {
                $list.append(`
                    <button type="button" class="list-group-item list-group-item-action school-item" 
                            data-school='${JSON.stringify(school)}'>
                        ${school.school_name} - ${school.school_code}
                    </button>
                `);
            });
            
            $results.append($list);
        }

        $results.on('click', '.school-item', function() {
            const school = $(this).data('school');
            displaySchoolInfo(school);
            $searchInput.val(school.school_name);
            $results.empty();
            $('#nextButton').prop('disabled', false);
        });

        function displaySchoolInfo(school) {
            $('#schoolInfoTable').show();
            $('#schoolNameDisplay').text(school.school_name);
            $('#schoolCodeDisplay').text(school.school_code);
            $('#schoolEmailDisplay').text(school.email);
            $('#provinceDisplay').text(school.province);
            $('#districtDisplay').text(school.district);
            $('#sectorDisplay').text(school.sector);
            $('#cellDisplay').text(school.cell);
            $('#villageDisplay').text(school.village);
            
            $('#verificationEmailDisplay').text(school.email);
            updateNextButton();
        }
    }

    function initVerificationHandlers() {
        const $codeInputs = $('.code-input');
        
        $codeInputs.on('input', function(e) {
            const $current = $(this);
            const value = $current.val();
            
            if (value.length === 1) {
                const $next = $current.next('.code-input');
                if ($next.length) {
                    $next.focus();
                }
            }
            updateVerificationCode();
        });

        $codeInputs.on('keydown', function(e) {
            if (e.key === 'Backspace' && !$(this).val()) {
                const $prev = $(this).prev('.code-input');
                if ($prev.length) {
                    $prev.focus();
                }
            }
        });

        function updateVerificationCode() {
            const code = Array.from(document.querySelectorAll('.code-input'))
                .map(input => input.value)
                .join('');
            document.getElementById('verificationCode').value = code;
        }

        $('#verifyCodeBtn').click(function() {
            const $btn = $(this);
            const $loader = $btn.find('.verification-loader');
            const $text = $btn.find('.verify-text');
            const schoolEmail = $('#schoolEmailDisplay').text();
            const code = $('#verificationCode').val();
            
            if (code.length !== 6) {
                showVerificationFeedback('error', 'Please enter the complete 6-digit code');
                $('.code-input').addClass('error');
                return;
            }

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
                            updateNextButton();
                        }, 1500);
                    } else {
                        showVerificationFeedback('error', 'Invalid verification code');
                        resetVerificationForm();
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

        $('#resendCodeBtn').click(function() {
            const schoolEmail = $('#schoolEmailDisplay').text();
            
            frappe.call({
                method: 'accreditation_management.www.school_identification.send_verification_code',
                args: {
                    school_email: schoolEmail
                },
                callback: function(r) {
                    if (!r.exc) {
                        showVerificationFeedback('success', 'Verification code resent successfully');
                        resetVerificationForm();
                    }
                }
            });
        });
    }

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
        
        $feedback.show();
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

    function validateSection(sectionIndex) {
        // Add validation logic for each section
        return true;
    }
});
