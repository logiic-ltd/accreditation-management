function startAccreditationFlow(requestType) {
    // Store the request type in localStorage
    localStorage.setItem('accreditationRequestType', requestType);
    // Navigate to school identification
    window.location.href = '/school-identification';
}

let currentSection = 0;
const sections = document.querySelectorAll('.form-section');

function showSection(n) {
    sections[n].style.display = 'block';
    document.getElementById('prevBtn').style.display = n === 0 ? 'none' : 'inline';
    document.getElementById('nextBtn').style.display = n === (sections.length - 1) ? 'none' : 'inline';
    document.getElementById('submitBtn').style.display = n === (sections.length - 1) ? 'inline' : 'none';
    
    // Update progress bar
    const progress = ((n + 1) / sections.length) * 100;
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    progressBar.textContent = `${Math.round(progress)}%`;
}

function nextPrev(n) {
    sections[currentSection].style.display = 'none';
    currentSection += n;
    if (currentSection >= sections.length) {
        document.getElementById('selfAssessmentForm').submit();
        return false;
    }
    showSection(currentSection);
}

let indicators;

frappe.ready(function() {
    showSection(currentSection);

    // Initialize school search
    initSchoolSearch();

    // Load TVET sectors and initialize trade selection
    initTVETSelection();

    // Load the indicator options from the JSON configuration file
    frappe.call({
        method: 'accreditation_management.www.self_assessment.get_indicator_options',
        callback: function(r) {
            if (r.message) {
                indicators = r.message;
                const indicatorsAreaA = document.getElementById('indicators-area-a');
                const indicatorsAreaB = document.getElementById('indicators-area-b');
                const indicatorsAreaC = document.getElementById('indicators-area-c');

                for (const [area, criteria] of Object.entries(indicators)) {
                    let areaDiv;
                    if (area.includes("A. Land ownership")) {
                        areaDiv = indicatorsAreaA;
                    } else if (area.includes("School Infrastructures")) {
                        areaDiv = indicatorsAreaB;
                    } else if (area.includes("Teaching and learning Resources")) {
                        areaDiv = indicatorsAreaC;
                    } else {
                        continue;
                    }
                    for (const [criterion, indicatorData] of Object.entries(criteria)) {
                        const table = document.createElement('table');
                        table.className = 'table table-bordered table-striped table-hover';
                        const thead = document.createElement('thead');
                        const headerRow = document.createElement('tr');
                        const criterionHeader = document.createElement('th');
                        criterionHeader.textContent = criterion;
                        const optionsHeader = document.createElement('th');
                        optionsHeader.textContent = 'Options';
                        const scoreHeader = document.createElement('th');
                        scoreHeader.id = `${criterion.replace(/\s+/g, '-')}-score`;
                        scoreHeader.textContent = 'Score: 0%';
                        scoreHeader.rowSpan = Object.keys(indicatorData).length + 1; // Span the score column
                        headerRow.appendChild(criterionHeader);
                        headerRow.appendChild(optionsHeader);
                        headerRow.appendChild(scoreHeader);
                        thead.appendChild(headerRow);
                        table.appendChild(thead);
                        const tbody = document.createElement('tbody');
                        table.appendChild(tbody);
                        areaDiv.appendChild(table);

                        let isFirstRow = true;
                        for (const [indicatorKey, indicator] of Object.entries(indicatorData)) {
                            const row = document.createElement('tr');
                            const indicatorCell = document.createElement('td');
                            indicatorCell.textContent = indicator.label;
                            const optionsCell = document.createElement('td');
                            if (!isFirstRow) {
                                optionsCell.colSpan = 2; // Span the options cell across the score column
                            }

                            indicator.options.forEach(option => {
                                const [value, text] = option.split(': ');
                                const optionContainer = document.createElement('div');
                                const radio = document.createElement('input');
                                radio.type = 'radio';
                                radio.name = indicatorKey;
                                radio.value = value;
                                radio.addEventListener('change', function() {
                                    calculateProvisionalResults();
                                    updateSelection(this);
                                });

                                optionContainer.addEventListener('click', function() {
                                    if (!radio.checked) {
                                        radio.checked = true;
                                        radio.dispatchEvent(new Event('change'));
                                    }
                                });

                                const label = document.createElement('label');
                                label.textContent = text;
                                label.style.marginRight = '10px';

                                optionContainer.appendChild(radio);
                                optionContainer.appendChild(label);
                                optionsCell.appendChild(optionContainer);
                            });

                            row.appendChild(indicatorCell);
                            row.appendChild(optionsCell);
                            tbody.appendChild(row);
                            isFirstRow = false;
                        }
                    }
                }
            }
        }
    });

    function calculateProvisionalResults() {
        if (!indicators) {
            console.error('Indicators not loaded yet');
            return;
        }

        const formData = new FormData(document.getElementById('selfAssessmentForm'));
        const areaScores = {};
        let overallScore = 0;

        // Calculate scores for each area
        for (const [area, criteria] of Object.entries(indicators)) {
            let areaTotal = 0;
            let criteriaCount = 0;
            for (const [criterion, indicatorData] of Object.entries(criteria)) {
                let criterionTotal = 0;
                let indicatorCount = 0;
                for (const indicatorKey of Object.keys(indicatorData)) {
                    const value = parseInt(formData.get(indicatorKey)) || 0;
                    const percentage = [0, 25, 50, 75, 100][value]; // Map 0-4 to percentages
                    criterionTotal += percentage;
                    indicatorCount++;
                }
                const criterionScore = criterionTotal / indicatorCount;
                areaTotal += criterionScore;
                criteriaCount++;
            }
            const areaScore = areaTotal / criteriaCount;
            areaScores[area] = areaScore;
        }

        // Apply area weights
        const weightedScores = {
            "A. Land ownership, legal, School leadership and management documents": areaScores["A. Land ownership, legal, School leadership and management documents"] * 0.10,
            "School Infrastructures": areaScores["School Infrastructures"] * 0.60,
            "Teaching and learning Resources": areaScores["Teaching and learning Resources"] * 0.30
        };

        overallScore = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);

        // Update provisional results
        document.getElementById('overallScore').textContent = `Overall Score: ${overallScore.toFixed(2)}%`;
        document.getElementById('provisionalRanking').textContent = `Provisional Ranking: ${getProvisionalRanking(overallScore)}`;
        document.getElementById('provisionalDecision').textContent = `Provisional Decision: ${getProvisionalDecision(overallScore)}`;
        document.getElementById('provisionalYears').textContent = `Provisional Accreditation Years: ${getProvisionalYears(overallScore)}`;
    }

    // Ensure provisional results are calculated after indicators are loaded
    frappe.call({
        method: 'accreditation_management.www.self_assessment.get_indicator_options',
        callback: function(r) {
            if (r.message) {
                indicators = r.message;
                calculateProvisionalResults();
            }
        }
    });

    function getProvisionalRanking(score) {
        if (score >= 80) return "Outstanding";
        if (score >= 70) return "Good";
        if (score >= 50) return "Satisfactory";
        return "Unsatisfactory";
    }

    function getProvisionalDecision(score) {
        if (score >= 80) return "Accreditation Granted";
        if (score >= 70) return "Accreditation Granted";
        if (score >= 50) return "Accreditation Granted";
        return "Accreditation Not Granted";
    }

    function getProvisionalYears(score) {
        if (score >= 80) return 3;
        if (score >= 70) return 2;
        if (score >= 50) return 1;
        return 0;
    }

    function updateSelection(selectedRadio) {
        const optionsCell = selectedRadio.closest('td');
        optionsCell.querySelectorAll('div').forEach(div => {
            div.classList.remove('selected');
        });
        selectedRadio.parentElement.classList.add('selected');
        updateCriterionScore(selectedRadio);
        calculateProvisionalResults();
    }

    function updateCriterionScore(selectedRadio) {
        const criterionTable = selectedRadio.closest('table');
        const criterionScoreHeader = criterionTable.querySelector('th:last-child');
        const allRadios = criterionTable.querySelectorAll('input[type="radio"]:checked');
        let totalScore = 0;
        allRadios.forEach(radio => {
            totalScore += parseInt(radio.value) * 25; // Convert 0-4 to 0-100%
        });
        const averageScore = allRadios.length > 0 ? totalScore / allRadios.length : 0;
        criterionScoreHeader.textContent = `Score: ${averageScore.toFixed(2)}%`;
    }

    $('#selfAssessmentForm').on('submit', function(e) {
        e.preventDefault();

        var formData = {};
        $(this).serializeArray().forEach(function(item) {
            formData[item.name] = item.value;
        });

        frappe.call({
            method: 'accreditation_management.www.self_assessment.submit_self_assessment',
            args: {
                form_data: JSON.stringify(formData)
            },
            freeze: true,
            callback: function(r) {
                if (!r.exc) {
                    frappe.msgprint({
                        title: __('Form Submitted'),
                        indicator: 'green',
                        message: __('Your self-assessment form has been submitted successfully.')
                    });
                } else {
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

// Check for stored school details on page load
const storedSchoolDetails = localStorage.getItem('schoolDetails');
if (storedSchoolDetails) {
    const details = JSON.parse(storedSchoolDetails);
    // Pre-fill the search input
    $searchInput.val(details.schoolName);
    // Show the continue button in provisional results
    $('#continueToApplication').show();

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

function initTVETSelection() {
    let currentSector = null;
    let sectorData = null;
    let combinationsData = null;

    // Show/hide sections based on request type
    $('#typeOfRequest').on('change', function() {
        const requestType = $(this).val();
        const showTVET = requestType === 'TVET Trade';
        const showCombinations = requestType === 'Combinations';
        const showProfessional = requestType === 'Professional';
        
        // Clear both sections first
        $('#tvetSelectionSection').hide();
        $('#combinationsSelectionSection').hide();
        $('#tradesContainer').empty();
        $('#combinationsContainer').empty();
        
        // Show appropriate section based on request type
        $('#tvetSelectionSection').toggle(showTVET);
        $('#combinationsSelectionSection').toggle(showCombinations || showProfessional);
        
        // Load appropriate data
        if (showTVET) {
            if (!sectorData) {
                loadSectors();
            } else {
                renderSectorGrid(sectorData.sectors);
            }
        }
        if (showCombinations) {
            if (!combinationsData) {
                loadCombinations();
            } else {
                renderCategoryGrid(combinationsData.categories);
            }
        }
        if (showProfessional) {
            loadProfessionalCombinations();
        }
        if (requestType === 'Ordinary Level') {
            loadOrdinaryLevel();
        }
        if (requestType === 'Primary Level') {
            loadPrimaryLevel();
        }
        if (requestType === 'Pre-primary Level') {
            loadPrePrimaryLevel();
        }
        if (requestType === 'Boarding Status') {
            loadBoardingStatus();
        }
        
        // Reset selection counts
        $('#selectedTradesCount').text('0 selected');
        $('#selectedCombinationsCount').text('0 selected');
    });

    function loadSectors() {
        fetch('/assets/accreditation_management/js/tvet_sectors_and_trades.json')
            .then(response => response.json())
            .then(data => {
                sectorData = data;
                renderSectorGrid(data.sectors);
            });
    }

    function renderSectorGrid(sectors) {
        const $grid = $('#sectorGrid');
        $grid.empty();
        $grid.addClass('sector-list');
        
        const sectorKeys = Object.keys(sectors);
        sectorKeys.forEach(sector => {
            const formattedSector = sector.replace(/_/g, ' ');
            const icon = getSectorIcon(sector);
            const card = $(`
                <div class="sector-card" data-sector="${sector}">
                    <div class="sector-icon">${icon}</div>
                    <div class="sector-info">
                        <div class="sector-name">${formattedSector}</div>
                        <small class="text-muted">${sectors[sector].length} trades</small>
                    </div>
                </div>
            `);

            card.on('click', function() {
                $('.sector-card').removeClass('selected');
                $(this).addClass('selected');
                currentSector = $(this).data('sector');
                const trades = sectorData.sectors[currentSector];
                renderTrades(trades);
            });

            $grid.append(card);
        });

        // Auto-select first sector
        if (sectorKeys.length > 0) {
            const firstCard = $('.sector-card').first();
            firstCard.addClass('selected');
            currentSector = sectorKeys[0];
            renderTrades(sectors[currentSector]);
        }
    }

    function getSectorIcon(sector) {
        const icons = {
            'CONSTRUCTION_BUILDING_SERVICES': '🏗️',
            'ICT_MULTIMEDIA': '💻',
            'AGRICULTURE_FOOD_PROCESSING': '🌾',
            'ENERGY': '⚡',
            'HOSPITALITY_TOURISM': '🏨',
            'ARTS_CRAFTS': '🎨',
            'TECHNICAL_SERVICES': '🔧',
            'TRANSPORT_LOGISTICS': '🚛',
            'MANUFACTURING_MINING': '⚒️',
            'BEAUTY_AESTHETICS': '💇'
        };
        return icons[sector] || '📋';
    }

    // Search functionality
    $('.trade-search').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        $('.trade-item').each(function() {
            const tradeName = $(this).find('label').text().toLowerCase();
            $(this).toggle(tradeName.includes(searchTerm));
        });
    });

    // Select/Clear All functionality
    $('#selectAllTrades').on('click', function() {
        $('#tradesContainer input[type="checkbox"]').prop('checked', true);
        updateSelectedCount();
    });

    $('#clearAllTrades').on('click', function() {
        $('#tradesContainer input[type="checkbox"]').prop('checked', false);
        updateSelectedCount();
    });

    // Handle individual trade/combination selection
    $(document).on('change', '#tradesContainer input[type="checkbox"], #combinationsContainer input[type="checkbox"]', function() {
        const container = $(this).closest('.trades-container').attr('id');
        if (container === 'tradesContainer') {
            updateSelectedCount();
        } else {
            updateSelectedCombinationsCount();
        }
    });

    // Save selection
    $('#saveTradeSelection').on('click', function() {
        const selectedTrades = [];
        $('#tradesContainer input[type="checkbox"]:checked').each(function() {
            selectedTrades.push($(this).val());
        });
        
        // Store selections in form data
        $('#selectedSectorCategory').val(currentSector || '');
        const selectedTradesJson = JSON.stringify(selectedTrades || []);
        $('#selectedItems').val(selectedTradesJson);
        
        // Update hidden form fields
        const formData = {
            type_of_request: $('#typeOfRequest').val(),
            selected_sector_category: currentSector,
            selected_items: selectedTradesJson
        };
        
        // Store the selections
        localStorage.setItem('selfAssessmentSelections', JSON.stringify(formData));
        
        frappe.show_alert({
            message: `Saved ${selectedTrades.length} trades`,
            indicator: 'green'
        });
    });
}

function renderTrades(trades) {
    const container = $('#tradesContainer');
    container.empty();

    const useColumns = trades.length > 20;
    const tradesHtml = `
        <div class="trades-grid ${useColumns ? 'row' : ''}">
            ${trades.map(trade => `
                <div class="trade-item ${useColumns ? 'col-md-4' : ''}">
                    <input type="checkbox" name="selected_trades" value="${trade}">
                    <label>${trade}</label>
                </div>
            `).join('')}
        </div>
    `;
    container.append(tradesHtml);
    
    // Add click handler for the entire trade-item
    $('.trade-item').on('click', function(e) {
        // Prevent double-triggering when clicking the checkbox directly
        if (e.target.type !== 'checkbox') {
            const checkbox = $(this).find('input[type="checkbox"]');
            checkbox.prop('checked', !checkbox.prop('checked'));
        }
        updateSelectedCount();
    });
    
    updateSelectedCount();
}

function loadCombinations() {
    fetch('/assets/accreditation_management/js/general_education_combinations.json')
        .then(response => response.json())
        .then(data => {
            combinationsData = data;
            renderCategoryGrid(data.categories);
        });
}

function loadProfessionalCombinations() {
    fetch('/assets/accreditation_management/js/professional_combinations.json')
        .then(response => response.json())
        .then(data => {
            combinationsData = data;
            renderCategoryGrid(data.categories);
        });
}

function renderCategoryGrid(categories) {
    const $list = $('#categoryGrid');
    $list.empty();
    
    const categoryKeys = Object.keys(categories);
    categoryKeys.forEach(category => {
        const icon = getCategoryIcon(category);
        const card = `
            <div class="sector-card" data-category="${category}">
                <div class="sector-icon">${icon}</div>
                <div>
                    <div class="sector-name">${category}</div>
                    <small class="text-muted">${categories[category].length} combinations</small>
                </div>
            </div>
        `;
        $list.append(card);
    });

    // Handle category selection
    $('.sector-card').on('click', function() {
        $('.sector-card').removeClass('selected');
        $(this).addClass('selected');
        const selectedCategory = $(this).data('category');
        const combinations = combinationsData.categories[selectedCategory];
        renderCombinations(combinations);
    });

    // Auto-select first category
    if (categoryKeys.length > 0) {
        const firstCard = $('.sector-card').first();
        firstCard.addClass('selected');
        const firstCategory = categoryKeys[0];
        renderCombinations(categories[firstCategory]);
    }
}

function getCategoryIcon(category) {
    const icons = {
        'Sciences': '🔬',
        'Humanities': '📚',
        'Languages': '🗣️'
    };
    return icons[category] || '📋';
}

function renderCombinations(combinations) {
    const container = $('#combinationsContainer');
    container.empty();

    const useColumns = combinations.length > 20;
    const combinationsHtml = `
        <div class="trades-grid ${useColumns ? 'row' : ''}">
            ${combinations.map(combination => `
                <div class="trade-item ${useColumns ? 'col-md-4' : ''}">
                    <input type="checkbox" name="selected_combinations" value="${combination}">
                    <label>${combination}</label>
                </div>
            `).join('')}
        </div>
    `;
    container.append(combinationsHtml);
    
    // Add click handler for the entire combination-item
    $('.trade-item').on('click', function(e) {
        if (e.target.type !== 'checkbox') {
            const checkbox = $(this).find('input[type="checkbox"]');
            checkbox.prop('checked', !checkbox.prop('checked'));
        
            const container = $(this).closest('.trades-container').attr('id');
            if (container === 'tradesContainer') {
                updateSelectedCount();
            } else {
                updateSelectedCombinationsCount();
            }
        }
    });

    updateSelectedCombinationsCount();
}

// Search functionality for combinations
$('.combination-search').on('input', function() {
    const searchTerm = $(this).val().toLowerCase();
    $('#combinationsContainer .trade-item').each(function() {
        const combinationName = $(this).find('label').text().toLowerCase();
        $(this).toggle(combinationName.includes(searchTerm));
    });
});

// Select/Clear All functionality for combinations
$('#selectAllCombinations').on('click', function() {
    $('#combinationsContainer input[type="checkbox"]').prop('checked', true);
    updateSelectedCombinationsCount();
});

$('#clearAllCombinations').on('click', function() {
    $('#combinationsContainer input[type="checkbox"]').prop('checked', false);
    updateSelectedCombinationsCount();
});

// Save combination selection
$('#saveCombinationSelection').on('click', function() {
    const selectedCombinations = [];
    $('#combinationsContainer input[type="checkbox"]:checked').each(function() {
        selectedCombinations.push($(this).val());
    });
        
    // Get currently selected category
    const selectedCategory = $('.sector-card.selected').data('category');
        
    // Store selections in form data
    $('#selectedSectorCategory').val(selectedCategory || '');
    const selectedCombinationsJson = JSON.stringify(selectedCombinations || []);
    $('#selectedItems').val(selectedCombinationsJson);
        
    // Update hidden form fields
    const formData = {
        type_of_request: $('#typeOfRequest').val(),
        selected_sector_category: selectedCategory,
        selected_items: selectedCombinationsJson
    };
        
    // Store the selections
    localStorage.setItem('selfAssessmentSelections', JSON.stringify(formData));
        
    frappe.show_alert({
        message: `Saved ${selectedCombinations.length} combinations`,
        indicator: 'green'
    });
});

function updateSelectedCombinationsCount() {
    const count = $('#combinationsContainer input[type="checkbox"]:checked').length;
    $('#selectedCombinationsCount').text(`${count} selected`);
}

function updateSelectedCount() {
    const count = $('#tradesContainer input[type="checkbox"]:checked').length;
    $('#selectedTradesCount').text(`${count} selected`);
    
    // Update "Select All" checkbox state
    const totalCheckboxes = $('#tradesContainer input[type="checkbox"]').length;
    const allChecked = count === totalCheckboxes;
    $('#selectAllTrades').prop('checked', allChecked);
}

function loadOrdinaryLevel() {
    $('#combinationsSelectionSection').show();
    fetch('/assets/accreditation_management/js/ordinary_level.json')
        .then(response => response.json())
        .then(data => {
            combinationsData = data;
            renderCategoryGrid(data.categories);
        });
}

function loadPrimaryLevel() {
    $('#combinationsSelectionSection').show();
    fetch('/assets/accreditation_management/js/primary_level.json')
        .then(response => response.json())
        .then(data => {
            combinationsData = data;
            renderCategoryGrid(data.categories);
        });
}

function loadPrePrimaryLevel() {
    $('#combinationsSelectionSection').show();
    fetch('/assets/accreditation_management/js/pre_primary_level.json')
        .then(response => response.json())
        .then(data => {
            combinationsData = data;
            renderCategoryGrid(data.categories);
        });
}

function loadBoardingStatus() {
    $('#combinationsSelectionSection').show();
    fetch('/assets/accreditation_management/js/boarding_status.json')
        .then(response => response.json())
        .then(data => {
            combinationsData = data;
            renderCategoryGrid(data.categories);
        });
}
