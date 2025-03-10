const logger = {
    info: function(msg, data) {
        console.info(`[Accreditation Form] ${msg}`, data || '');
    },
    warn: function(msg, data) {
        console.warn(`[Accreditation Form] ${msg}`, data || '');
    },
    error: function(msg, data) {
        console.error(`[Accreditation Form] ${msg}`, data || '');
    }
};

function collectFormData() {
    logger.info('Starting form data collection');
    const schoolId = $('#prerequisitesSummary').data('school-id');
    const assessmentId = $('#prerequisitesSummary').data('assessment-id');
    
    logger.info('School ID:', schoolId);
    logger.info('Assessment ID:', assessmentId);
    
    const selectedRequest = $('#typeOfRequest').val();
    
    logger.info('Selected request type:', selectedRequest);
    
    const formData = {
        school_identification: schoolId || '',
        self_assessment: assessmentId || '',
        school_name: $('#schoolName').val(),
        school_code: $('#schoolCode').val(),
        school_status: $('#status').val(),
        type_of_school: $('#typeOfSchool').val(),
        type_of_request: selectedRequest,
        other_request: $('#otherRequest').val(),
        national_id: $('#nationalId').val(),
        establishment_year: $('#establishmentYear').val(),
        village: $('#village').val(),
        cell: $('#cell').val(),
        sector: $('#sector').val(),
        district: $('#district').val(),
        province: $('#province').val(),
        owner_name: $('#ownerName').val(),
        owner_email: $('#ownerEmail').val(),
        owner_telephone: $('#ownerTelephone').val(),
        applicant_name: $('#applicantName').val(),
        applicant_role: $('#applicantRole').val(),
        applicant_email: $('#applicantEmail').val(),
        applicant_telephone: $('#applicantTelephone').val(),
        accommodation_status: $('#accommodationStatus').val()
    };

    logger.info('Form data collection complete:', formData);
    
    return formData;
}

frappe.ready(function() {
    let currentStep = 1;
    
    // Check for stored school details on page load
    const storedSchoolDetails = localStorage.getItem('schoolDetails');
    if (storedSchoolDetails) {
        const details = JSON.parse(storedSchoolDetails);
        // Pre-fill the search input
        $('#searchSchool').val(details.schoolName);

        // Show the school info table with stored details
        $('#schoolNameDisplay').text(details.schoolName);
        $('#schoolCodeDisplay').text(details.schoolCode);
        $('#provinceDisplay').text(details.province || 'N/A');
        $('#districtDisplay').text(details.district || 'N/A');
        $('#sectorDisplay').text(details.sector || 'N/A');
        $('#cellDisplay').text(details.cell || 'N/A');
        $('#villageDisplay').text(details.village || 'N/A');
        $('#schoolInfoTable').show();

        // Clear stored details after using them
        localStorage.removeItem('schoolDetails');
    }

    initSchoolSearch();
    
    $('#nextStep').on('click', function() {
        if (currentStep === 1) {
            let schoolCode = $('#schoolCode').val();
            if (!schoolCode) {
                frappe.msgprint({
                    title: __('Required'),
                    indicator: 'red',
                    message: __('Please select a school before proceeding')
                });
                return;
            }
            currentStep = 2;
            $('#step1').hide();
            $('#step2').show();
        }
    });
    
    $('#backToSearch').on('click', function() {
        currentStep = 1;
        $('#step2').hide();
        $('#step1').show();
    });

    $('#accreditationForm').on('submit', function(e) {
        e.preventDefault();
        logger.info('Form submission started');
        
        frappe.confirm('Are you sure you want to submit this application?',
            () => {
                const formData = collectFormData();
                
                if (!formData.school_identification || !formData.self_assessment) {
                    frappe.msgprint({
                        title: __('Required Fields Missing'),
                        indicator: 'red',
                        message: __('Please complete school identification and self assessment first.')
                    });
                    return;
                }

                const docData = {
                    doctype: 'Accreditation',
                    school_identification: formData.school_identification,
                    self_assessment: formData.self_assessment,
                    school_name: formData.school_name,
                    school_code: formData.school_code,
                    type_of_school: formData.type_of_school,
                    type_of_request: formData.type_of_request,
                    other_request: formData.other_request,
                    establishment_year: formData.establishment_year,
                    village: formData.village,
                    cell: formData.cell,
                    sector: formData.sector,
                    district: formData.district,
                    province: formData.province,
                    owner_name: formData.owner_name,
                    owner_email: formData.owner_email,
                    owner_telephone: formData.owner_telephone
                };

                logger.info('Sending application data to server');
                frappe.call({
                    method: 'accreditation_management.accreditation_management.doctype.accreditation.accreditation.create_accreditation',
                    args: {
                        data: JSON.stringify(formData)
                    },
                    freeze: true,
                    freeze_message: __('Submitting application...'),
                    callback: function(r) {
                        if (!r.exc) {
                            logger.info('Application submitted successfully');
                            frappe.show_alert({
                                message: __('Application submitted successfully!'),
                                indicator: 'green'
                            }, 5);
                            
                            const tracking_number = r.message.name;
                            
                            frappe.msgprint({
                                title: __('Application Submitted'),
                                indicator: 'green',
                                message: __('Your application has been submitted successfully.<br>Your tracking number is: ' + tracking_number)
                            });

                            setTimeout(function() {
                                window.location.href = '/application-status?tracking_number=' + tracking_number;
                            }, 3000);
                        } else {
                            let errorMessage = r._server_messages ? JSON.parse(r._server_messages)[0] : r.exc;
                            if (typeof errorMessage === 'string') {
                                try {
                                    errorMessage = JSON.parse(errorMessage);
                                } catch (e) {
                                }
                            }
                            
                            logger.error('Validation failed:', errorMessage);
                            frappe.msgprint({
                                title: __('Validation Failed'),
                                indicator: 'red',
                                message: errorMessage
                            });
                        }
                    }
                });
            }
        );
    });

    function initSchoolSearch() {
        let $searchInput = $('#searchSchool');
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
                                $('#schoolNameDisplay').text(item.schoolName);
                                $('#schoolCodeDisplay').text(item.schoolCode);
                                $('#provinceDisplay').text(item.province || 'N/A');
                                $('#districtDisplay').text(item.district || 'N/A');
                                $('#sectorDisplay').text(item.sector || 'N/A');
                                $('#cellDisplay').text(item.cell || 'N/A');
                                $('#villageDisplay').text(item.village || 'N/A');
                                $('#schoolInfoTable').show();
                                $searchInput.val(item.schoolName);
                                $results.empty();

                                frappe.call({
                                    method: 'accreditation_management.www.accreditation_application.get_prerequisites_summary',
                                    args: { school_code: item.schoolCode },
                                    callback: function(r) {
                                        if (r.message) {
                                            let idSummary = r.message.identification;
                                            $('#schoolIdSummary').html(`
                                                <div class="card mb-3">
                                                    <div class="card-header" style="background-color: var(--primary-color); color: white; display: flex; justify-content: space-between; align-items: center;">
                                                        <h5 class="mb-0">School Identification Summary</h5>
                                                        <a href="/school-identification?school_code=${item.schoolCode}" class="btn btn-outline-light btn-sm">
                                                            <i class="fas fa-edit"></i> Update School Information
                                                        </a>
                                                    </div>
                                                    <div class="card-body" style="border: 1px solid #e0e0e0; border-top: none;">
                                                        <table class="table table-bordered table-striped mb-0">
                                                            <tbody>
                                                                <tr>
                                                                    <td>Registration Date</td>
                                                                    <td>${idSummary.registration_date || 'N/A'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td>Registration Number</td>
                                                                    <td>${idSummary.registration_number || 'N/A'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td>Status</td>
                                                                    <td>${idSummary.status || 'N/A'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            `);

                                            let assessmentSummaries = r.message.assessment;
                                            $('#selfAssessmentSummary').html(`
                                                <div class="card mb-3">
                                                    <div class="card-header" style="background-color: var(--primary-color); color: white; display: flex; justify-content: space-between; align-items: center;">
                                                        <h5 class="mb-0">Self Assessment History</h5>
                                                        <a href="/self-assessment?school_code=${item.schoolCode}" class="btn btn-success btn-sm">
                                                            <i class="fas fa-plus-circle"></i> Add New Self Assessment
                                                        </a>
                                                    </div>
                                                    <div class="card-body" style="border: 1px solid #e0e0e0; border-top: none;">
                                                        <table class="table table-bordered table-striped mb-0">
                                                            <thead>
                                                                <tr>
                                                                    <th>Select</th>
                                                                    <th>Date</th>
                                                                    <th>Type of Request</th>
                                                                    <th>Overall Score</th>
                                                                    <th>Provisional Ranking</th>
                                                                    <th>Provisional Years</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${assessmentSummaries.map(summary => `
                                                                    <tr>
                                                                        <td>
                                                                            <input type="radio" name="selected_assessment" 
                                                                                value="${summary.id}" 
                                                                                class="assessment-selector">
                                                                        </td>
                                                                        <td>${summary.date || 'N/A'}</td>
                                                                        <td>${summary.type_of_request || 'N/A'}</td>
                                                                        <td>${summary.overall_score || 'N/A'}%</td>
                                                                        <td>${summary.provisional_ranking || 'N/A'}</td>
                                                                        <td>${summary.provisional_years || 'N/A'} years</td>
                                                                        <td>
                                                                            <button class="btn btn-sm btn-info view-assessment" 
                                                                                data-id="${summary.id}"
                                                                                data-score="${summary.overall_score}"
                                                                                data-ranking="${summary.provisional_ranking}"
                                                                                data-years="${summary.provisional_years}"
                                                                                data-date="${summary.date}">
                                                                                <i class="fas fa-eye"></i> View
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                `).join('')}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            `);
                                            
                                            if (Object.keys(r.message.identification).length === 0) {
                                                $('#schoolIdSummary').html(`
                                                    <div class="prerequisite-warning">
                                                        <div class="warning-header">
                                                            <div class="warning-icon">
                                                                <i class="fa fa-exclamation-triangle"></i>
                                                            </div>
                                                            <div class="warning-title">
                                                                <h5>School Identification Required</h5>
                                                            </div>
                                                            <div class="warning-action">
                                                                <a href="/school-identification?school_code=${item.schoolCode}" class="btn btn-primary btn-sm">
                                                                    <i class="fa fa-plus-circle"></i> Complete School Identification
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div class="warning-content">
                                                            <p>Before proceeding with your accreditation application, you need to complete the school identification process. This helps us maintain accurate records and ensures a smooth accreditation process.</p>
                                                        </div>
                                                    </div>
                                                `);
                                            }

                                            if (Object.keys(r.message.assessment).length === 0) {
                                                $('#selfAssessmentSummary').html(`
                                                    <div class="prerequisite-warning">
                                                        <div class="warning-header">
                                                            <div class="warning-icon">
                                                                <i class="fa fa-clipboard-list"></i>
                                                            </div>
                                                            <div class="warning-title">
                                                                <h5>Self Assessment Required</h5>
                                                            </div>
                                                            <div class="warning-action">
                                                                <a href="/self-assessment?school_code=${item.schoolCode}" class="btn btn-primary btn-sm">
                                                                    <i class="fa fa-tasks"></i> Start Self Assessment
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div class="warning-content">
                                                            <p>A recent self assessment (within the last 6 months) is required to proceed with your accreditation application. This helps evaluate your institution's readiness for accreditation.</p>
                                                        </div>
                                                    </div>
                                                `);
                                            }

                                            $('#prerequisitesSummary')
                                                .data('school-id', r.message.school_id)
                                                .show();
                                            
                                            // Handle assessment selection
                                            $('.assessment-selector').on('change', function() {
                                                const selectedId = $(this).val();
                                                $('#prerequisitesSummary').data('assessment-id', selectedId);
                                                
                                                // Enable next step only if an assessment is selected
                                                const hasValidSelection = $('.assessment-selector:checked').length > 0;
                                                $('#nextStep').prop('disabled', !hasValidSelection);
                                            });
                                            
                                            // Initially disable next step until selection is made
                                            $('#nextStep').prop('disabled', true);
                                        }
                                    }
                                });

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
                            $results.html(`
                                <div class="alert alert-info" role="alert">
                                    <h4 class="alert-heading"><i class="fas fa-info-circle"></i> School Not Found</h4>
                                    <p>We couldn't find any schools matching your search criteria. If your school is not registered in our system, you can register it now.</p>
                                    <hr>
                                    <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#registerSchoolModal">
                                        <i class="fas fa-plus-circle"></i> Register New School
                                    </button>
                                </div>
                            `);
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

    $('#verifyNID').on('click', function() {
        const nidNumber = $('#nationalId').val().trim();
        if (!nidNumber) {
            frappe.msgprint({
                title: __('Required'),
                indicator: 'red',
                message: __('Please enter a National ID number')
            });
            return;
        }

        frappe.call({
            method: 'accreditation_management.www.nid_verification.verify_nid',
            args: {
                document_number: nidNumber
            },
            freeze: true,
            freeze_message: __('Verifying National ID...'),
            callback: function(r) {
                if (r.message && r.message.success) {
                    const data = r.message.data;
                    $('#applicantName').val(`${data.foreName} ${data.surnames}`);
                    
                    $('#village').val(data.village);
                    $('#cell').val(data.cell);
                    $('#sector').val(data.sector);
                    $('#district').val(data.district);
                    $('#province').val(data.province);
                    
                    $('#applicantVillage').val(data.village);
                    $('#applicantCell').val(data.cell);
                    $('#applicantSector').val(data.sector);
                    $('#applicantDistrict').val(data.district);
                    $('#applicantProvince').val(data.province);
                    
                    $('#villageDisplay').text(data.village || 'N/A');
                    $('#cellDisplay').text(data.cell || 'N/A');
                    $('#sectorDisplay').text(data.sector || 'N/A');
                    $('#districtDisplay').text(data.district || 'N/A');
                    $('#provinceDisplay').text(data.province || 'N/A');
                    
                    frappe.show_alert({
                        message: __('National ID verified successfully'),
                        indicator: 'green'
                    }, 5);
                } else {
                    frappe.msgprint({
                        title: __('Verification Failed'),
                        indicator: 'red',
                        message: r.message.error || __('Failed to verify National ID')
                    });
                }
            }
        });
    });

    // Handle view assessment button clicks
    $(document).on('click', '.view-assessment', function(e) {
        e.preventDefault();
        const btn = $(this);
        const score = parseFloat(btn.data('score'));
        const scoreClass = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
        
        const modalContent = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Self Assessment Summary</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="assessment-summary-section text-center">
                            <h6>Overall Performance</h6>
                            <div class="score-badge ${scoreClass}">
                                ${score}%
                            </div>
                        </div>
                        
                        <div class="assessment-summary-section">
                            <h6>Assessment Details</h6>
                            <div class="assessment-detail-row">
                                <span class="assessment-detail-label">Assessment Date</span>
                                <span class="assessment-detail-value">${btn.data('date')}</span>
                            </div>
                            <div class="assessment-detail-row">
                                <span class="assessment-detail-label">Provisional Ranking</span>
                                <span class="assessment-detail-value">${btn.data('ranking')}</span>
                            </div>
                            <div class="assessment-detail-row">
                                <span class="assessment-detail-label">Accreditation Period</span>
                                <span class="assessment-detail-value">${btn.data('years')} years</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        $('.modal').remove();
        
        // Create and show new modal
        const modal = $('<div class="modal fade"></div>').html(modalContent);
        $('body').append(modal);
        modal.modal('show');
    });

    // Handle school registration
    $('#saveNewSchool').on('click', function() {
        const schoolData = {
            schoolName: $('#newSchoolName').val(),
            province: $('#newProvince').val(),
            district: $('#newDistrict').val(),
            sector: $('#newSector').val(),
            cell: $('#newCell').val(),
            village: $('#newVillage').val(),
            schoolStatus: $('#newSchoolStatus').val(),
            schoolOwner: $('#newSchoolOwner').val(),
            latitude: $('#newLatitude').val() ? parseFloat($('#newLatitude').val()) : null,
            longitude: $('#newLongitude').val() ? parseFloat($('#newLongitude').val()) : null,
            day: $('#newDay').val(),
            boarding: $('#newBoarding').val(),
            schoolEmail: $('#newSchoolEmail').val()
        };

        // Validate required fields
        const requiredFields = ['schoolName', 'province', 'district', 'sector', 'cell', 'village'];
        const missingFields = requiredFields.filter(field => !schoolData[field]);
        
        if (missingFields.length > 0) {
            frappe.msgprint({
                title: __('Required Fields Missing'),
                indicator: 'red',
                message: __('Please fill in all required fields marked with *')
            });
            return;
        }

        const baseUrl = "http://10.5.8.137:8081"; // Ensure this matches the BASE_URL in api_config.py
        $.ajax({
            url: `${baseUrl}/api/schools/create`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(schoolData),
            success: function(response) {
                frappe.show_alert({
                    message: __('School registered successfully!'),
                    indicator: 'green'
                }, 5);
                
                // Close modal and refresh search
                $('#registerSchoolModal').modal('hide');
                $('#searchSchool').val(schoolData.schoolName).trigger('input');
                
                // Clear form
                $('#registerSchoolForm')[0].reset();
            },
            error: function(xhr) {
                frappe.msgprint({
                    title: __('Registration Failed'),
                    indicator: 'red',
                    message: xhr.responseText || __('Failed to register school. Please try again.')
                });
            }
        });
    });
});
