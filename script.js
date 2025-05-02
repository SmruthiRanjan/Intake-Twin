// Wrap everything in a check for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing CalorieGlass...");

    // --- DOM Elements ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const goalDisplay = document.getElementById('goal-display');
    const progressFg = document.getElementById('progress-fg');
    const progressValue = document.getElementById('progress-value');
    const addFoodForm = document.getElementById('add-food-form');
    const foodNameInput = document.getElementById('food-name');
    const foodCaloriesInput = document.getElementById('food-calories');
    const foodMealSelect = document.getElementById('food-meal');
    const foodListUl = document.getElementById('food-list');
    const foodListPlaceholder = document.getElementById('food-list-placeholder');
    const historyContent = document.getElementById('history-content');
    const historyPlaceholder = document.getElementById('history-placeholder');
    const exportExcelBtn = document.getElementById('export-excel');
    const exportPdfBtn = document.getElementById('export-pdf');
    const addWaterForm = document.getElementById('add-water-form');
    const waterAmountInput = document.getElementById('water-amount');
    const waterTotalDisplay = document.getElementById('water-total-display');
    const waterListUl = document.getElementById('water-list');
    const waterListPlaceholder = document.getElementById('water-list-placeholder');
    const statsChartCanvas = document.getElementById('stats-chart');
    const chartPlaceholder = document.getElementById('chart-placeholder');

    // --- State Variables ---
    let currentTheme = 'light';
    let calorieGoal = 2000;
    let dailyEntries = {};      // Format: { 'YYYY-MM-DD': [{id, name, calories, meal}] }
    let dailyWaterEntries = {}; // Format: { 'YYYY-MM-DD': [{id, amount}] }
    let statsChartInstance = null;

    // --- Constants ---
    const progressCircleRadius = 54;
    const progressCircumference = 2 * Math.PI * progressCircleRadius;
    const CHART_DAYS = 7;

    // --- Helper Functions ---
    function getTodayDateString() { const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
    const today = getTodayDateString();
    function calculateDailyTotal(dateString) { if(!dailyEntries||!Array.isArray(dailyEntries[dateString]))return 0; return dailyEntries[dateString].reduce((s,e)=>s+(Number(e.calories)||0),0); }
    function calculateDailyWaterTotal(dateString) { if(!dailyWaterEntries||!Array.isArray(dailyWaterEntries[dateString]))return 0; return dailyWaterEntries[dateString].reduce((s,e)=>s+(Number(e.amount)||0),0); }
    function escapeHtml(unsafe) { if(typeof unsafe !== 'string') return String(unsafe); return unsafe.replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">").replace(/"/g,"'").replace(/'/g,"'"); }
    function animateCounter(el,s,e,d){ if(!el||!document.contains(el))return; let st=null;s=Number(s)||0;e=Number(e)||0; const step=(ts)=>{if(!document.contains(el))return; if(!st)st=ts; const p=Math.min((ts-st)/d,1),c=Math.floor(p*(e-s)+s); el.textContent=c.toLocaleString(); if(p<1){window.requestAnimationFrame(step);}else{el.textContent=e.toLocaleString();}}; window.requestAnimationFrame(step); }

     // --- Local Storage ---
     function loadState() {
        console.log("Loading state...");
        currentTheme = localStorage.getItem('theme') || 'light';
        const storedGoal = localStorage.getItem('calorieGoal');
        calorieGoal = parseInt(storedGoal, 10);
        if (isNaN(calorieGoal) || calorieGoal <= 0) { calorieGoal = 2000; localStorage.setItem('calorieGoal', calorieGoal.toString()); }
        const se = localStorage.getItem('dailyEntries');
        try { dailyEntries = se ? JSON.parse(se) : {}; if (typeof dailyEntries !== 'object' || dailyEntries === null || Array.isArray(dailyEntries)) throw new Error("Invalid format"); }
        catch (e) { console.error("Err parse calories:", e); dailyEntries = {}; localStorage.removeItem('dailyEntries'); }
        const sw = localStorage.getItem('dailyWaterEntries');
        try { dailyWaterEntries = sw ? JSON.parse(sw) : {}; if (typeof dailyWaterEntries !== 'object' || dailyWaterEntries === null || Array.isArray(dailyWaterEntries)) throw new Error("Invalid format"); }
        catch (e) { console.error("Err parse water:", e); dailyWaterEntries = {}; localStorage.removeItem('dailyWaterEntries'); }
        console.log("State loaded.");
     }
    function saveState() {
        console.log("Saving state...");
        try {
            localStorage.setItem('theme', currentTheme);
            localStorage.setItem('calorieGoal', calorieGoal.toString());
            localStorage.setItem('dailyEntries', JSON.stringify(dailyEntries));
            localStorage.setItem('dailyWaterEntries', JSON.stringify(dailyWaterEntries));
        } catch (e) { console.error("Err save state:", e); alert("Could not save data."); }
    }

    // --- Theme Handling ---
    function applyTheme() {
        if (!body || !themeToggleBtn) return;
        body.classList.remove('light', 'dark'); body.classList.add(currentTheme);
        const iconSpan = themeToggleBtn.querySelector('.icon');
        if (iconSpan) { iconSpan.textContent = currentTheme === 'light' ? '☀️' : '🌙'; }
        renderStatsChart(); // Update chart colors
    }
    function toggleTheme() { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; applyTheme(); saveState(); }

    // --- UI Rendering & Updates ---
    function renderFoodList() {
        if (!foodListUl || !foodListPlaceholder) return;
        foodListUl.querySelectorAll('li.food-list-item').forEach(i => i.remove());
        const entries = dailyEntries[today] || [];
        if (entries.length === 0) { foodListPlaceholder.classList.remove('hidden'); }
        else {
            foodListPlaceholder.classList.add('hidden');
            const f = document.createDocumentFragment();
            entries.forEach((e) => {
                if (!e || typeof e.id === 'undefined') return;
                const li = document.createElement('li'); li.className = 'food-list-item'; li.setAttribute('data-id', e.id);
                li.innerHTML = `<div class="food-info"><div class="food-name">${escapeHtml(e.name||'N/A')}</div><div class="food-meal">${escapeHtml(e.meal||'N/A')}</div></div><div class="food-actions"><span class="food-calories">${escapeHtml(e.calories||0)} kcal</span><button class="delete-button" aria-label="Remove ${escapeHtml(e.name||'')}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div>`; f.appendChild(li);
            }); foodListUl.appendChild(f);
        }
    }
    function renderWaterList() {
        if (!waterListUl || !waterListPlaceholder) { console.error("Water list els missing."); return; }
        waterListUl.querySelectorAll('li.water-list-item').forEach(i => i.remove());
        const entries = dailyWaterEntries[today] || [];
        if (entries.length === 0) { waterListPlaceholder.classList.remove('hidden'); }
        else {
            waterListPlaceholder.classList.add('hidden');
            const f = document.createDocumentFragment();
            entries.forEach((e) => {
                if (!e || typeof e.id === 'undefined') return;
                const li = document.createElement('li'); li.className = 'water-list-item'; li.setAttribute('data-id', e.id);
                li.innerHTML = `<div class="water-info">${escapeHtml(e.amount||0)} ml</div><div class="water-actions"><button class="delete-button" aria-label="Remove water entry"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div>`; f.appendChild(li);
            }); waterListUl.appendChild(f);
        }
    }
    function renderHistory() {
        if (!historyContent || !historyPlaceholder) return;
        historyContent.querySelectorAll('.history-item').forEach(i => i.remove());
        const dates = Object.keys(dailyEntries).filter(d => d !== today).sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')).slice(0, 7);
        if (dates.length === 0) { historyPlaceholder.classList.remove('hidden'); }
        else {
            historyPlaceholder.classList.add('hidden');
            const f = document.createDocumentFragment();
            dates.forEach(d => {
                const tot = calculateDailyTotal(d); let fd = "Invalid";
                try { fd = new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch (e) {}
                const div = document.createElement('div'); div.className = 'history-item'; div.innerHTML = `<span class="history-date">${escapeHtml(fd)}</span><span class="history-total">${escapeHtml(tot)} kcal</span>`; f.appendChild(div);
            }); historyContent.appendChild(f);
        }
    }
    function setupProgressCircle() { if (!progressFg) return; progressFg.style.strokeDasharray = progressCircumference; progressFg.style.strokeDashoffset = progressCircumference; }
    function updateDailySummary() { if (!goalDisplay || !progressValue || !progressFg) return; const tot = calculateDailyTotal(today); goalDisplay.textContent = calorieGoal.toLocaleString(); const p = (calorieGoal > 0) ? Math.min(tot / calorieGoal, 1) : 0; const o = progressCircumference * (1 - p); progressFg.style.strokeDashoffset = Math.max(0, Math.min(progressCircumference, o)); const cur = parseInt(progressValue.textContent.replace(/,/g, ''), 10); if (!isNaN(cur) && cur !== tot) { animateCounter(progressValue, cur, tot, 750); } else { progressValue.textContent = tot.toLocaleString(); } }
    function updateWaterSummary() { if (!waterTotalDisplay) { console.error("Water total display missing."); return; } const tot = calculateDailyWaterTotal(today); waterTotalDisplay.textContent = tot.toLocaleString(); }

    // --- Combined Stats Chart Rendering ---
    function renderStatsChart() {
        if (typeof Chart === 'undefined') { console.error("Chart.js not loaded."); return; }
        if (!statsChartCanvas || !chartPlaceholder) { console.error("Chart elements missing."); return; }
        const ctx = statsChartCanvas.getContext('2d'); if (!ctx) { console.error("Could not get 2D context."); return; }
        if (statsChartInstance) { statsChartInstance.destroy(); statsChartInstance = null; }
        const allDatesSet = new Set([...Object.keys(dailyEntries), ...Object.keys(dailyWaterEntries)]); const sortedDates = Array.from(allDatesSet).sort((a, b) => new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00'));
        if ((dailyEntries[today] || dailyWaterEntries[today]) && !sortedDates.includes(today)) { let i = 0; for (; i < sortedDates.length; i++) { if (new Date(today + 'T00:00:00') < new Date(sortedDates[i] + 'T00:00:00')) { sortedDates.splice(i, 0, today); break; } } if (i === sortedDates.length) sortedDates.push(today); }
        const chartDates = sortedDates.slice(-CHART_DAYS); const hasData = chartDates.some(date => dailyEntries[date]?.length > 0 || dailyWaterEntries[date]?.length > 0);
        if (chartDates.length < 1 || !hasData) { chartPlaceholder.classList.remove('hidden'); statsChartCanvas.classList.add('hidden'); return; }
        else { chartPlaceholder.classList.add('hidden'); statsChartCanvas.classList.remove('hidden'); }
        const labels = chartDates.map(d => { try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch (e) { return "Inv" } });
        const calorieDataPoints = chartDates.map(date => calculateDailyTotal(date)); const waterDataPoints = chartDates.map(date => calculateDailyWaterTotal(date));
        const cs = getComputedStyle(document.body); const isDark = body.classList.contains('dark'); const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; const labelColor = cs.getPropertyValue('--text-muted-color').trim() || '#6B7280'; const calorieColor = cs.getPropertyValue('--primary-color').trim() || '#4ADE80'; const waterColor = cs.getPropertyValue('--water-color').trim() || '#60A5FA'; const cardBgColor = cs.getPropertyValue('--card-bg-color').trim() || '#FFFFFF'; const textColor = cs.getPropertyValue('--text-color').trim() || '#1F2937'; const cardBorderColor = cs.getPropertyValue('--card-border-color').trim() || 'rgba(0,0,0,0.05)';
        try { statsChartInstance = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: 'Calories (kcal)', data: calorieDataPoints, borderColor: calorieColor, backgroundColor: calorieColor + '1A', yAxisID: 'yCalories', tension: 0.2, pointRadius: 3, pointHoverRadius: 5, fill: true }, { label: 'Water (ml)', data: waterDataPoints, borderColor: waterColor, backgroundColor: waterColor + '1A', yAxisID: 'yWater', tension: 0.2, pointRadius: 3, pointHoverRadius: 5, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { color: labelColor, boxWidth: 12, padding: 15 } }, tooltip: { backgroundColor: cardBgColor, titleColor: textColor, bodyColor: labelColor, borderColor: cardBorderColor, borderWidth: 1, padding: 10, boxPadding: 3, mode: 'index', intersect: false, callbacks: { label: function (c) { let l = c.dataset.label || ''; if (l) { l += ': '; } if (c.parsed.y !== null) { l += c.parsed.y.toLocaleString(); if (c.dataset.label.includes('kcal')) l += ' kcal'; else if (c.dataset.label.includes('ml')) l += ' ml'; } return l; } } } }, scales: { x: { ticks: { color: labelColor }, grid: { color: gridColor, borderColor: gridColor } }, yCalories: { type: 'linear', display: true, position: 'left', beginAtZero: true, ticks: { color: calorieColor }, grid: { drawOnChartArea: false }, }, yWater: { type: 'linear', display: true, position: 'right', beginAtZero: true, ticks: { color: waterColor }, grid: { drawOnChartArea: false }, } }, interaction: { intersect: false, mode: 'index' } } }); } catch (e) { console.error("Chart Err:", e); if (chartPlaceholder) { chartPlaceholder.textContent = "Error rendering chart."; chartPlaceholder.classList.remove('hidden'); } if (statsChartCanvas) statsChartCanvas.classList.add('hidden'); }
    }

    // --- Data Export Helpers ---
    function getAllCalorieEntriesFlat() { const d = []; Object.keys(dailyEntries).sort((a, b) => new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')).forEach(dt => { if (Array.isArray(dailyEntries[dt])) { dailyEntries[dt].forEach(e => { if (e && typeof e.calories !== 'undefined') d.push({ Date: dt, Meal: e.meal || 'N/A', Food: e.name || 'N/A', Calories: e.calories }); }); } }); return d; }
    function getAllWaterEntriesFlat() { const d = []; Object.keys(dailyWaterEntries).sort((a, b) => new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')).forEach(dt => { if (Array.isArray(dailyWaterEntries[dt])) { dailyWaterEntries[dt].forEach(e => { if (e && typeof e.amount !== 'undefined') d.push({ Date: dt, Amount_ml: e.amount }); }); } }); return d; }
    function getDailySummaryDataFlat() { const s = []; const all = new Set([...Object.keys(dailyEntries), ...Object.keys(dailyWaterEntries)]); const dates = Array.from(all).sort((a, b) => new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')); dates.forEach(d => { s.push({ Date: d, TotalCalories_kcal: calculateDailyTotal(d), TotalWater_ml: calculateDailyWaterTotal(d) }); }); return s; }

    // --- EXCEL EXPORT (Multi-Sheet: Summary, Food Details, Water Details) ---
    function handleExportExcel() {
        console.log("Attempting Full Excel export...");
        if (typeof XLSX === 'undefined') { alert("Excel library not loaded."); console.error("XLSX undefined."); return; }
        const summaryData = getDailySummaryDataFlat(); const calorieData = getAllCalorieEntriesFlat(); const waterData = getAllWaterEntriesFlat();
        if (summaryData.length === 0 && calorieData.length === 0 && waterData.length === 0) { alert("No data to export."); return; }
        try {
            const wb = XLSX.utils.book_new();
            if (summaryData.length > 0) { const ws = XLSX.utils.json_to_sheet(summaryData); ws["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }]; XLSX.utils.book_append_sheet(wb, ws, "Daily Summary"); }
            if (calorieData.length > 0) { const ws = XLSX.utils.json_to_sheet(calorieData); ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: Math.max(20, ...calorieData.map(d => String(d.Food || '').length)) }, { wch: 10 }]; XLSX.utils.book_append_sheet(wb, ws, "Food Details"); }
            if (waterData.length > 0) { const ws = XLSX.utils.json_to_sheet(waterData); ws["!cols"] = [{ wch: 12 }, { wch: 12 }]; XLSX.utils.book_append_sheet(wb, ws, "Water Details"); }
            XLSX.writeFile(wb, "CalorieGlass_Full_Report.xlsx"); console.log("Excel export initiated.");
        } catch (error) { console.error("Error Excel export:", error); alert(`Excel export failed: ${error.message}`); }
    }

    // --- PDF EXPORT (Multi-Table with Titles, Timestamp in Footer) ---
    function handleExportPdf() {
        console.log("Attempting Full PDF export (Titles + Details, Timestamp Footer)...");
        if (typeof jspdf === 'undefined' || !window.jspdf?.jsPDF?.API?.autoTable) {
            alert("PDF library or plugin not loaded."); console.error("jsPDF/AutoTable undefined."); return;
        }

        const summaryData = getDailySummaryDataFlat();
        const calorieData = getAllCalorieEntriesFlat();
        const waterData = getAllWaterEntriesFlat();
        console.log(`Data: ${summaryData.length} summary, ${calorieData.length} calories, ${waterData.length} water.`);

        if (summaryData.length === 0 && calorieData.length === 0 && waterData.length === 0) {
            alert("No data available to export."); return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let finalY = 25; // Start Y position for first title (leaving space for main title)
        const pageHeight = doc.internal.pageSize.height;
        const bottomMargin = 20; // Space for footer content
        const leftMargin = 14;
        const rightMargin = 14;
        const pageWidth = doc.internal.pageSize.width;
        const generationTimestamp = `Generated: ${new Date().toLocaleString()}`; // Generate timestamp once

        // Helper to add page break if needed
        const checkPageBreak = (neededHeight = 40) => {
             if (finalY + neededHeight > pageHeight - bottomMargin) {
                 doc.addPage();
                 finalY = 20; // Reset Y for new page, leaving space for title
                 console.log("PDF page break added.");
                 return true;
             }
             return false;
        };

        try {
            console.log("Setting up PDF document with titles...");

            // --- PDF Header ---
            doc.setFontSize(18);
            doc.text("CalorieGlass Full Report", leftMargin, 20); // Main Title moved up slightly
            // Timestamp removed from here
            // --- End Header ---

            const computedStyle = getComputedStyle(document.body);
            const calorieColor = computedStyle.getPropertyValue('--primary-color').trim() || '#4ADE80';
            const waterColor = computedStyle.getPropertyValue('--water-color').trim() || '#60A5FA';
            const summaryColor = '#555';

            // --- Table 1: Daily Summary ---
            if (summaryData.length > 0) {
                checkPageBreak(20);
                doc.setFontSize(14); doc.setTextColor(summaryColor);
                doc.text("Daily Summary", leftMargin, finalY); finalY += 8;
                doc.autoTable({
                    head:[["Date", "Total Calories (kcal)", "Total Water (ml)"]],
                    body: summaryData.map(i => [i.Date, i.TotalCalories_kcal, i.TotalWater_ml]),
                    startY: finalY, theme:'grid', headStyles:{fillColor: summaryColor, textColor:'#fff'},
                    styles:{fontSize:9, cellPadding:2, overflow:'linebreak'},
                    columnStyles:{ 0:{cellWidth: 35}, 1:{halign:'right', cellWidth: 50}, 2:{halign:'right', cellWidth: 50} },
                });
                finalY = doc.lastAutoTable.finalY + 15; // Margin AFTER table
            }

            // --- Table 2: Food Details ---
            if (calorieData.length > 0) {
                checkPageBreak(20);
                doc.setFontSize(14); doc.setTextColor(calorieColor);
                doc.text("Detailed Food Entries", leftMargin, finalY); finalY += 8;
                 doc.autoTable({
                    head:[["Date","Meal","Food Name","Calories"]],
                    body: calorieData.map(i=>[i.Date,i.Meal,i.Food,i.Calories]),
                    startY: finalY, theme:'grid', headStyles:{fillColor:calorieColor,textColor:'#fff'},
                    styles:{fontSize:9,cellPadding:2,overflow:'linebreak'},
                    columnStyles:{ 0:{cellWidth:25}, 1:{cellWidth:25}, 2:{cellWidth:'auto'}, 3:{halign:'right', cellWidth: 20} },
                });
                finalY = doc.lastAutoTable.finalY + 15;
            }

            // --- Table 3: Water Details ---
             if (waterData.length > 0) {
                 checkPageBreak(20);
                 doc.setFontSize(14); doc.setTextColor(waterColor);
                 doc.text("Detailed Water Entries", leftMargin, finalY); finalY += 8;
                 doc.autoTable({
                     head:[["Date", "Amount (ml)"]],
                     body: waterData.map(i=>[i.Date, i.Amount_ml]),
                     startY: finalY, theme:'grid', headStyles:{fillColor:waterColor,textColor:'#fff'},
                     styles:{fontSize:9,cellPadding:2,overflow:'linebreak'},
                     columnStyles:{ 0:{cellWidth:25}, 1:{halign:'right', cellWidth: 30} }
                 });
                 finalY = doc.lastAutoTable.finalY + 15;
             }

            // --- Footer with Page Numbers and Timestamp ---
            console.log("Adding PDF footer...");
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i); // Switch to page i
                doc.setFontSize(9);
                doc.setTextColor(150); // Muted color for footer text

                // Timestamp (Left Aligned)
                doc.text(generationTimestamp, leftMargin, pageHeight - 10);

                // Page Number (Right Aligned)
                const pageNumText = `Page ${i} of ${pageCount}`;
                doc.text(pageNumText, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            }
            console.log("Footer added.");
            // --- End Footer ---

            console.log("Triggering PDF file download...");
            doc.save('CalorieGlass_Full_Report.pdf'); // Keep descriptive filename
            console.log("PDF export initiated.");

        } catch(error){
            console.error("Error during Full PDF export w/ Titles:", error);
            alert(`PDF export failed: ${error.message}`);
        }
    }

    // --- Event Handlers ---
    function handleAddFood(event) { event.preventDefault(); if(!foodNameInput||!foodCaloriesInput||!foodMealSelect)return; const n=foodNameInput.value.trim();const c=parseInt(foodCaloriesInput.value,10);const m=foodMealSelect.value; if(!n){alert("Enter food name.");foodNameInput.focus();return;} if(isNaN(c)||c<=0){alert("Enter positive cals.");foodCaloriesInput.focus();return;} const entry={id:Date.now(),name:n,calories:c,meal:m}; if(!Array.isArray(dailyEntries[today])){dailyEntries[today]=[];} dailyEntries[today].push(entry); renderUI();saveState();if(addFoodForm)addFoodForm.reset();if(foodNameInput)foodNameInput.focus(); }
    function handleAddWater(event) { event.preventDefault(); if(!waterAmountInput){console.error("Water input miss.");return;} const a=parseInt(waterAmountInput.value,10); if(isNaN(a)||a<=0){alert("Enter positive amount.");waterAmountInput.focus();return;} const entry={id:Date.now(),amount:a}; if(!Array.isArray(dailyWaterEntries[today])){dailyWaterEntries[today]=[];} dailyWaterEntries[today].push(entry); renderUI();saveState();if(addWaterForm)addWaterForm.reset();if(waterAmountInput)waterAmountInput.focus(); }
    function handleRemoveFood(event) { const btn=event.target.closest('.delete-button');if(!btn)return; const li=btn.closest('li.food-list-item');if(!li)return; const id=parseInt(li.getAttribute('data-id'),10);if(isNaN(id))return; li.classList.add('removing'); li.addEventListener('animationend',()=>{if(dailyEntries[today]&&Array.isArray(dailyEntries[today])){dailyEntries[today]=dailyEntries[today].filter(e=>e.id!==id);if(dailyEntries[today].length===0)delete dailyEntries[today];} li.remove();renderUI();saveState();},{once:true}); }
    function handleRemoveWater(event) { const btn=event.target.closest('.delete-button');if(!btn)return; const li=btn.closest('li.water-list-item');if(!li){console.error("Water li parent miss.");return;} const id=parseInt(li.getAttribute('data-id'),10);if(isNaN(id)){console.error("Water id invalid.");return;} li.classList.add('removing'); li.addEventListener('animationend',()=>{if(dailyWaterEntries[today]&&Array.isArray(dailyWaterEntries[today])){dailyWaterEntries[today]=dailyWaterEntries[today].filter(e=>e.id!==id);if(dailyWaterEntries[today].length===0)delete dailyWaterEntries[today];} li.remove();renderUI();saveState();},{once:true}); }

    // --- Central UI Update Function ---
    function renderUI() {
        try {
            renderFoodList(); renderWaterList(); renderHistory();
            updateDailySummary(); updateWaterSummary(); renderStatsChart();
        } catch (e) { console.error("renderUI Error:", e); }
    }

    // --- Initialization ---
    function init() {
        console.log("init: Starting...");
        if (!body || !addFoodForm || !foodListUl || !addWaterForm || !waterListUl || !statsChartCanvas || !exportExcelBtn || !exportPdfBtn || !themeToggleBtn ) {
            console.error("init: Critical DOM elements missing. Aborting.");
            alert("Error: App could not load correctly."); return;
        }
        loadState(); applyTheme(); setupProgressCircle(); renderUI(); setupEventListeners();
        console.log("init: Application initialized successfully.");
    }
    function setupEventListeners() {
        console.log("setupEventListeners: Attaching..."); let c = 0;
        if (themeToggleBtn) { themeToggleBtn.addEventListener('click', toggleTheme); c++; }
        if (addFoodForm) { addFoodForm.addEventListener('submit', handleAddFood); c++; }
        if (addWaterForm) { addWaterForm.addEventListener('submit', handleAddWater); c++; }
        if (foodListUl) { foodListUl.addEventListener('click', handleRemoveFood); c++; }
        if (waterListUl) { waterListUl.addEventListener('click', handleRemoveWater); c++; }
        if (exportExcelBtn) { exportExcelBtn.addEventListener('click', handleExportExcel); c++; }
        if (exportPdfBtn) { exportPdfBtn.addEventListener('click', handleExportPdf); c++; }
        console.log(`setupEventListeners: Attached ${c} primary listeners.`);
    }

    // --- Run Initialization ---
    init();

}); // End DOMContentLoaded