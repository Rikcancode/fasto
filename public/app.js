const statusEl = document.getElementById("status");
const authLinkEl = document.getElementById("withings-auth");
const navConnectWithings = document.getElementById("nav-connect-withings");
const navPlanSettings = document.getElementById("nav-plan-settings");
const navChangeAccount = document.getElementById("nav-change-account");
const dateRangeMode = document.getElementById("date-range-mode");
const dateRangeSection = document.getElementById("date-range-section");
const settingsOverlay = document.getElementById("settings-overlay");
const statusIcon = document.getElementById("status-icon");
const statusText = document.getElementById("status-text");
const navStatus = document.querySelector(".nav-status");
const navUser = document.getElementById("nav-user");
const userName = document.getElementById("user-name");
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

const weightCurrentEl = document.getElementById("weight-current");
const weightLastEl = document.getElementById("weight-last");
const weightTargetEl = document.getElementById("weight-target");
const weightNextMilestoneEl = document.getElementById("weight-next-milestone");

const fatCurrentEl = document.getElementById("fat-current");
const fatLastEl = document.getElementById("fat-last");
const fatTargetEl = document.getElementById("fat-target");
const fatNextMilestoneEl = document.getElementById("fat-next-milestone");

let weightChart;
let fatChart;
let customDateRange = null; // Store custom date range

function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined) return "--";
  return value.toFixed(decimals);
}

function parseDate(value) {
  // Ensure consistent date parsing - use UTC to avoid timezone issues
  if (typeof value === 'string') {
    return new Date(value + 'T00:00:00Z');
  }
  return new Date(value);
}

function findCurrentWeekGoal(weeklyGoals) {
  if (!Array.isArray(weeklyGoals) || weeklyGoals.length === 0) {
    return null;
  }
  const today = new Date();
  const sorted = [...weeklyGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const weekStart = parseDate(sorted[i].weekStart);
    if (today >= weekStart) {
      return sorted[i];
    }
  }
  return sorted[0];
}

function latestValue(series) {
  if (!Array.isArray(series) || series.length === 0) return null;
  return series[series.length - 1].value;
}

function buildGoalSeries(weeklyGoals, field) {
  if (!Array.isArray(weeklyGoals)) return [];
  return weeklyGoals
    .map((goal) => ({ x: goal.weekStart, y: goal[field] }))
    .filter((point) => point.y !== undefined && point.y !== null);
}

function calculateDateRange(series, weeklyGoals, ultimateGoal, goalPeriod) {
  // If custom date range is set, use it
  if (customDateRange?.startDate && customDateRange?.endDate) {
    return {
      min: parseDate(customDateRange.startDate),
      max: parseDate(customDateRange.endDate)
    };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Default: from goal period start (or earliest milestone) to target date + 1 month
  if (ultimateGoal?.targetDate) {
    const targetDate = parseDate(ultimateGoal.targetDate);
    const endDate = new Date(targetDate);
    endDate.setMonth(endDate.getMonth() + 1); // Add 1 month to target date
    
    // Use goal period start if available, otherwise find earliest milestone or measurement
    let startDate = goalPeriod?.startDate 
      ? parseDate(goalPeriod.startDate)
      : null;
    
    // If no goal period start, use earliest milestone or measurement
    if (!startDate) {
      const dates = [];
      
      // Add milestone dates
      if (Array.isArray(weeklyGoals) && weeklyGoals.length > 0) {
        const sorted = [...weeklyGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        dates.push(parseDate(sorted[0].weekStart));
      }
      
      // Add earliest measurement if available
      if (Array.isArray(series) && series.length > 0) {
        const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
        dates.push(parseDate(sorted[0].date));
      }
      
      startDate = dates.length > 0 ? dates[0] : today;
    }
    
    return {
      min: startDate,
      max: endDate
    };
  }
  
  // If no target date but we have goal period, use it
  if (goalPeriod?.startDate && goalPeriod?.endDate) {
    return {
      min: parseDate(goalPeriod.startDate),
      max: parseDate(goalPeriod.endDate)
    };
  }
  
  // Fallback: calculate from data if no target date
  const dates = [];
  
  // Add measurement dates
  if (Array.isArray(series)) {
    for (const point of series) {
      const dateStr = point.date.includes('T') ? point.date.split('T')[0] : point.date;
      dates.push(parseDate(dateStr));
    }
  }
  
  // Add milestone dates
  if (Array.isArray(weeklyGoals)) {
    for (const goal of weeklyGoals) {
      const dateStr = goal.weekStart.includes('T') ? goal.weekStart.split('T')[0] : goal.weekStart;
      dates.push(parseDate(dateStr));
    }
  }
  
  if (dates.length === 0) {
    return { min: today, max: today };
  }
  
  dates.sort((a, b) => a - b);
  return { min: dates[0], max: dates[dates.length - 1] };
}

function buildMilestoneSeries(weeklyGoals, ultimateGoal, field, goalPeriod, chartDateRange) {
  const milestones = [];
  
  // Determine the valid date range for milestones
  let minDate = null;
  let maxDate = null;
  
  if (goalPeriod?.startDate && goalPeriod?.endDate) {
    minDate = goalPeriod.startDate;
    maxDate = goalPeriod.endDate;
  } else if (chartDateRange) {
    // Use chart date range if no goal period
    minDate = chartDateRange.min.toISOString().split('T')[0];
    maxDate = chartDateRange.max.toISOString().split('T')[0];
  }
  
  // Add all bi-weekly milestones (only if within valid date range)
  if (Array.isArray(weeklyGoals) && weeklyGoals.length > 0) {
    const sorted = [...weeklyGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    for (const goal of sorted) {
      const value = goal[field];
      if (value !== undefined && value !== null && value > 0) {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = goal.weekStart.includes('T') ? goal.weekStart.split('T')[0] : goal.weekStart;
        
        // Only include milestones within the valid date range
        if (minDate && maxDate) {
          if (dateStr < minDate || dateStr > maxDate) {
            continue; // Skip milestones outside valid range
          }
        }
        
        milestones.push({
          x: dateStr,
          y: value
        });
      }
    }
  }
  
  // Only add ultimate goal if there are milestones and it's different from the last one
  if (milestones.length > 0 && ultimateGoal && ultimateGoal[field] !== undefined && ultimateGoal.targetDate) {
    const lastMilestone = milestones[milestones.length - 1];
    const ultimateDate = ultimateGoal.targetDate.includes('T') 
      ? ultimateGoal.targetDate.split('T')[0] 
      : ultimateGoal.targetDate;
    const ultimateValue = ultimateGoal[field];
    
    // Check if ultimate goal is within valid date range
    if (minDate && maxDate) {
      if (ultimateDate < minDate || ultimateDate > maxDate) {
        // Ultimate goal is outside range, don't add it
        return milestones;
      }
    }
    
    // Only add if date or value is different from the last milestone
    if (lastMilestone.x !== ultimateDate || Math.abs(lastMilestone.y - ultimateValue) > 0.1) {
      milestones.push({
        x: ultimateDate,
        y: ultimateValue
      });
    }
  }
  
  return milestones;
}

function renderChart(canvasId, title, series, weeklyGoals, ultimateGoal, field, unitLabel, goalPeriod) {
  const ctx = document.getElementById(canvasId);
  const range = calculateDateRange(series, weeklyGoals, ultimateGoal, goalPeriod);

  // Filter measurements based on custom date range or goal period
  let filteredSeries = series || [];
  const rangeStart = range.min.toISOString().split('T')[0];
  const rangeEnd = range.max.toISOString().split('T')[0];
  
  filteredSeries = (series || []).filter((point) => {
    const dateStr = point.date.includes('T') ? point.date.split('T')[0] : point.date;
    return dateStr >= rangeStart && dateStr <= rangeEnd;
  });

  // Normalize all dates to UTC to avoid timezone issues
  const measurementsDataset = {
    label: `${title} measurements`,
    data: filteredSeries.map((point) => {
      // Ensure date is in YYYY-MM-DD format, Chart.js will parse it correctly
      const dateStr = point.date.includes('T') ? point.date.split('T')[0] : point.date;
      return { x: dateStr, y: point.value };
    }),
    borderColor: "#4f46e5",
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    tension: 0.2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: "#4f46e5",
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2,
    showLine: true,
    fill: false,
  };

  // Milestones as connected circles (filtered by goal period and chart date range)
  const milestoneData = buildMilestoneSeries(weeklyGoals, ultimateGoal, field, goalPeriod, range);
  console.log(`Milestone data for ${field}:`, milestoneData, 'goalPeriod:', goalPeriod, 'chartRange:', rangeStart, 'to', rangeEnd);
  
  const milestoneDataset = {
    label: "Milestones",
    data: milestoneData,
    borderColor: "#10b981",
    backgroundColor: "#10b981",
    borderWidth: 2,
    pointRadius: 6,
    pointHoverRadius: 8,
    pointBackgroundColor: "#10b981",
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2,
    tension: 0,
    fill: false,
    showLine: true,
  };
  
  // Highlight the last milestone (ultimate goal) differently
  const ultimateDataset = {
    label: "Target",
    data: milestoneData.length > 0 ? [milestoneData[milestoneData.length - 1]] : [],
    borderColor: "#f97316",
    backgroundColor: "#f97316",
    borderWidth: 3,
    pointRadius: 8,
    pointHoverRadius: 10,
    pointBackgroundColor: "#f97316",
    pointBorderColor: "#ffffff",
    pointBorderWidth: 3,
    showLine: false,
  };

  // Always include milestone datasets if we have milestone data within the chart range
  const datasets = [measurementsDataset];
  
  // Only add milestones if they're within the chart date range (rangeStart/rangeEnd already declared above)
  const milestonesInRange = milestoneData.filter(m => {
    const dateStr = m.x.includes('T') ? m.x.split('T')[0] : m.x;
    return dateStr >= rangeStart && dateStr <= rangeEnd;
  });
  
  if (milestonesInRange.length > 0) {
    // Create filtered milestone dataset with only points in range
    const filteredMilestoneDataset = {
      ...milestoneDataset,
      data: milestonesInRange
    };
    datasets.push(filteredMilestoneDataset);
    
    // Only show target dataset if there's more than one milestone (to highlight the last one)
    if (milestonesInRange.length > 1) {
      const filteredUltimateDataset = {
        ...ultimateDataset,
        data: [milestonesInRange[milestonesInRange.length - 1]]
      };
      datasets.push(filteredUltimateDataset);
    }
  }

  console.log(`Rendering chart ${canvasId} with datasets:`, datasets.length, 'milestone data points:', milestoneData.length);
  
  const config = {
    type: "line",
    data: {
      datasets: datasets,
    },
    options: {
      responsive: true,
      interaction: {
        intersect: true,
        mode: 'nearest',
      },
      plugins: {
        legend: {
          position: "bottom",
          display: true,
        },
        annotation: {
          annotations: ultimateGoal?.targetDate
            ? {
                targetDate: {
                  type: "line",
                  xMin: parseDate(ultimateGoal.targetDate),
                  xMax: parseDate(ultimateGoal.targetDate),
                  borderColor: "#f97316",
                  borderWidth: 1,
                  borderDash: [5, 5],
                  label: {
                    display: true,
                    content: "Target date",
                    position: "start",
                    backgroundColor: "rgba(249, 115, 22, 0.8)",
                    color: "#fff",
                  },
                },
              }
            : {},
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              // Chart.js time scale already formats dates correctly
              return context[0].label || '';
            },
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null && context.parsed.y !== undefined) {
                label += context.parsed.y.toFixed(1) + ' ' + unitLabel;
              }
              return label;
            },
            filter: function(tooltipItem) {
              // Only show tooltip items that have actual data points at this exact date
              // For milestone datasets, only show if there's a point at this exact date
              if (tooltipItem.dataset.label === 'Milestones' || tooltipItem.dataset.label === 'Target') {
                // Check if this dataset has a point at the hovered date
                const hoveredDate = tooltipItem.label;
                const hasPointAtDate = tooltipItem.dataset.data.some(point => {
                  const pointDate = typeof point.x === 'string' ? point.x : new Date(point.x).toISOString().split('T')[0];
                  return pointDate === hoveredDate;
                });
                return hasPointAtDate && tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined;
              }
              // For measurements, show if there's valid data
              return tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined;
            }
          }
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "week",
            displayFormats: {
              week: 'MMM d, yyyy'
            }
          },
          // Set min/max based on calculated range
          min: range.min.toISOString().split('T')[0],
          max: range.max.toISOString().split('T')[0],
        },
        y: {
          title: {
            display: true,
            text: unitLabel,
          },
        },
      },
    },
  };

  if (canvasId === "weight-chart") {
    if (weightChart) weightChart.destroy();
    weightChart = new Chart(ctx, config);
  } else {
    if (fatChart) fatChart.destroy();
    fatChart = new Chart(ctx, config);
  }
}

function findNextMilestone(weeklyGoals, ultimateGoal, field, currentValue) {
  if (!Array.isArray(weeklyGoals) || weeklyGoals.length === 0) {
    return null;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find next milestone after today
  const sorted = [...weeklyGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  for (const goal of sorted) {
    const milestoneDate = parseDate(goal.weekStart);
    if (milestoneDate > today && goal[field] !== undefined && goal[field] !== null) {
      return {
        date: goal.weekStart,
        value: goal[field],
        field: field
      };
    }
  }
  
  // If no future milestone, check ultimate goal
  if (ultimateGoal?.targetDate && ultimateGoal[field] !== undefined) {
    const targetDate = parseDate(ultimateGoal.targetDate);
    if (targetDate > today) {
      return {
        date: ultimateGoal.targetDate,
        value: ultimateGoal[field],
        field: field
      };
    }
  }
  
  return null;
}

function calculateWeeksUntil(targetDate) {
  if (!targetDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDate(targetDate);
  const diffTime = target - today;
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks > 0 ? diffWeeks : 0;
}

function updateSummary(measurements, weeklyGoals, ultimateGoal) {
  const lastWeight = latestValue(measurements.weight);
  const lastFat = latestValue(measurements.bodyFat);
  
  // Weight summary
  weightLastEl.textContent = lastWeight ? `${formatNumber(lastWeight)} kg` : "--";
  
  if (ultimateGoal?.weightKg && ultimateGoal?.targetDate) {
    weightTargetEl.textContent = `${formatNumber(ultimateGoal.weightKg)} kg`;
    const date = new Date(ultimateGoal.targetDate);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weeksLeft = calculateWeeksUntil(ultimateGoal.targetDate);
    const dateWithWeeks = weeksLeft !== null ? `${dateStr} (${weeksLeft} weeks)` : dateStr;
    weightTargetEl.setAttribute('data-date', dateWithWeeks);
  } else {
    weightTargetEl.textContent = "--";
    weightTargetEl.removeAttribute('data-date');
  }
  
  const nextWeightMilestone = findNextMilestone(weeklyGoals, ultimateGoal, "weightKg", lastWeight);
  if (nextWeightMilestone) {
    const date = new Date(nextWeightMilestone.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weightNextMilestoneEl.textContent = `${formatNumber(nextWeightMilestone.value)} kg`;
    weightNextMilestoneEl.setAttribute('data-date', dateStr);
  } else {
    weightNextMilestoneEl.textContent = "--";
    weightNextMilestoneEl.removeAttribute('data-date');
  }
  
  // Body Fat summary
  fatLastEl.textContent = lastFat ? `${formatNumber(lastFat)} %` : "--";
  
  if (ultimateGoal?.bodyFatPct && ultimateGoal?.targetDate) {
    fatTargetEl.textContent = `${formatNumber(ultimateGoal.bodyFatPct)} %`;
    const date = new Date(ultimateGoal.targetDate);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weeksLeft = calculateWeeksUntil(ultimateGoal.targetDate);
    const dateWithWeeks = weeksLeft !== null ? `${dateStr} (${weeksLeft} weeks)` : dateStr;
    fatTargetEl.setAttribute('data-date', dateWithWeeks);
  } else {
    fatTargetEl.textContent = "--";
    fatTargetEl.removeAttribute('data-date');
  }
  
  const nextFatMilestone = findNextMilestone(weeklyGoals, ultimateGoal, "bodyFatPct", lastFat);
  if (nextFatMilestone) {
    const date = new Date(nextFatMilestone.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    fatNextMilestoneEl.textContent = `${formatNumber(nextFatMilestone.value)} %`;
    fatNextMilestoneEl.setAttribute('data-date', dateStr);
  } else {
    fatNextMilestoneEl.textContent = "--";
    fatNextMilestoneEl.removeAttribute('data-date');
  }
}

function updateConnectionStatus(connected) {
  if (navStatus) {
    if (connected) {
      navStatus.classList.remove("disconnected");
      navStatus.classList.add("connected");
      statusIcon.textContent = "🟢";
      statusText.textContent = "Connected";
    } else {
      navStatus.classList.remove("connected");
      navStatus.classList.add("disconnected");
      statusIcon.textContent = "🔴";
      statusText.textContent = "Not Connected";
    }
  }
}

function updateUserInfo(user) {
  const navConnectWithings = document.getElementById("nav-connect-withings");
  
  if (user && navUser && userName) {
    // Withings API returns user info with firstname and lastname
    const displayName = user.firstname && user.lastname 
      ? `${user.firstname} ${user.lastname}`.trim()
      : user.firstname || user.lastname || user.shortname || "User";
    
    userName.textContent = displayName;
    navUser.style.display = "flex";
    
    // Hide "Connect Withings" when user is connected
    if (navConnectWithings) {
      navConnectWithings.style.display = "none";
    }
  } else if (navUser) {
    navUser.style.display = "none";
    
    // Show "Connect Withings" when user is not connected
    if (navConnectWithings) {
      navConnectWithings.style.display = "flex";
    }
  }
}

async function loadAuthUrl() {
  try {
    const response = await fetch("/api/withings/auth-url");
    const json = await response.json();
    if (json.url) {
      authLinkEl.href = json.url;
      updateConnectionStatus(false);
    }
  } catch (error) {
    console.warn("Unable to load Withings auth url", error);
    updateConnectionStatus(false);
  }
}

let dashboardData = null; // Store dashboard data for re-rendering

async function loadDashboard() {
  statusEl.textContent = "Loading data from Withings...";
  try {
    const response = await fetch("/api/dashboard");
    const json = await response.json();
    if (json.error) {
      throw new Error(json.error);
    }

    dashboardData = json; // Store for re-rendering
    updateSummary(json.measurements, json.weeklyGoals, json.ultimateGoal);
    renderCharts(json);
    
    // Update date range inputs with current range
    updateDateRangeInputs(json.goalPeriod, json.ultimateGoal);
    
    // Update connection status
    updateConnectionStatus(true);
    
    // Update user info
    updateUserInfo(json.user);

    statusEl.textContent = `Updated ${json.measurements.fetchedAt || 'just now'} - Data from Withings API`;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    updateConnectionStatus(false);
    console.error("Dashboard load error:", error);
  }
}

function renderCharts(data) {
  renderChart(
    "weight-chart",
    "Weight",
    data.measurements.weight,
    data.weeklyGoals,
    data.ultimateGoal,
    "weightKg",
    "kg",
    data.goalPeriod
  );
  renderChart(
    "fat-chart",
    "Body Fat %",
    data.measurements.bodyFat,
    data.weeklyGoals,
    data.ultimateGoal,
    "bodyFatPct",
    "%",
    data.goalPeriod
  );
}

function updateDateRangeInputs(goalPeriod, ultimateGoal) {
  const chartStartDate = document.getElementById("chart-start-date");
  const chartEndDate = document.getElementById("chart-end-date");
  
  if (customDateRange) {
    chartStartDate.value = customDateRange.startDate;
    chartEndDate.value = customDateRange.endDate;
  } else if (goalPeriod?.startDate && goalPeriod?.endDate) {
    chartStartDate.value = goalPeriod.startDate;
    chartEndDate.value = goalPeriod.endDate;
  } else if (ultimateGoal?.targetDate) {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = new Date(ultimateGoal.targetDate);
    targetDate.setMonth(targetDate.getMonth() + 1);
    chartStartDate.value = today;
    chartEndDate.value = targetDate.toISOString().split('T')[0];
  }
}

// Goals Settings UI
const settingsPanel = document.getElementById("settings-panel");
const settingsToggle = document.getElementById("settings-toggle");
const cancelSettings = document.getElementById("cancel-settings");
const closeSettingsPanelBtn = document.getElementById("close-settings-panel");
const saveGoalsBtn = document.getElementById("save-goals");
const generateBiweeklyBtn = document.getElementById("generate-biweekly");
const addMilestoneBtn = document.getElementById("add-milestone");
const weeklyGoalsList = document.getElementById("weekly-goals-list");
const goalsStartDate = document.getElementById("goals-start-date");
const goalsEndDate = document.getElementById("goals-end-date");
let currentGoals = null;

function openSettingsPanel() {
  settingsPanel.classList.add("open");
  settingsOverlay.style.display = "block";
  loadGoalsForEditing();
}

function closeSettingsPanel() {
  settingsPanel.classList.remove("open");
  settingsOverlay.style.display = "none";
}

settingsToggle?.addEventListener("click", () => {
  openSettingsPanel();
});

navPlanSettings.addEventListener("click", (e) => {
  e.preventDefault();
  openSettingsPanel();
});

// Remove old settings toggle if it exists
if (settingsToggle) {
  settingsToggle.style.display = "none";
}

settingsOverlay.addEventListener("click", () => {
  closeSettingsPanel();
});

cancelSettings.addEventListener("click", () => {
  closeSettingsPanel();
});

closeSettingsPanelBtn.addEventListener("click", () => {
  closeSettingsPanel();
});

async function loadGoalsForEditing() {
  try {
    const response = await fetch("/api/goals");
    const goals = await response.json();
    currentGoals = goals;
    
    // Populate ultimate goal
    document.getElementById("ultimate-weight").value = goals.ultimateGoal?.weightKg || "";
    document.getElementById("ultimate-fat").value = goals.ultimateGoal?.bodyFatPct || "";
    document.getElementById("ultimate-date").value = goals.ultimateGoal?.targetDate || "";
    
    // Set goal period dates
    if (goals.goalPeriod) {
      goalsStartDate.value = goals.goalPeriod.startDate || "";
      goalsEndDate.value = goals.goalPeriod.endDate || "";
    } else {
      // Fallback: Set start/end dates from existing goals
      const weeklyGoals = goals.weeklyGoals || [];
      if (weeklyGoals.length > 0) {
        const sorted = [...weeklyGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        goalsStartDate.value = sorted[0].weekStart || "";
        if (sorted.length > 1) {
          const lastDate = new Date(sorted[sorted.length - 1].weekStart);
          lastDate.setDate(lastDate.getDate() + 13); // Add 2 weeks for bi-weekly
          goalsEndDate.value = lastDate.toISOString().split("T")[0];
        }
        // Set current values from first goal
        document.getElementById("current-weight").value = sorted[0].weightKg || "";
        document.getElementById("current-fat").value = sorted[0].bodyFatPct || "";
      }
    }
    
    // Populate weekly goals
    renderWeeklyGoals(goals.weeklyGoals || []);
  } catch (error) {
    console.error("Failed to load goals:", error);
    statusEl.textContent = `Error loading goals: ${error.message}`;
  }
}

function generateBiweeklyMilestones(startDate, endDate, startWeight, endWeight, startFat, endFat) {
  const milestones = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const numBiweeks = Math.max(1, Math.ceil(totalDays / 14));
  
  const weightStep = numBiweeks > 1 ? (endWeight - startWeight) / (numBiweeks - 1) : 0;
  const fatStep = numBiweeks > 1 ? (endFat - startFat) / (numBiweeks - 1) : 0;
  
  for (let i = 0; i < numBiweeks; i++) {
    const milestoneDate = new Date(start);
    milestoneDate.setDate(start.getDate() + (i * 14));
    
    // Don't go beyond end date
    if (milestoneDate > end) break;
    
    milestones.push({
      weekStart: milestoneDate.toISOString().split("T")[0],
      weightKg: Math.round((startWeight + (weightStep * i)) * 10) / 10,
      bodyFatPct: Math.round((startFat + (fatStep * i)) * 10) / 10,
    });
  }
  
  return milestones;
}

function renderWeeklyGoals(goals) {
  weeklyGoalsList.innerHTML = "";
  
  if (goals.length === 0) {
    weeklyGoalsList.innerHTML = '<p style="color: #94a3b8; font-style: italic;">No milestones yet. Set start/end dates and click "Generate Bi-Weekly Milestones".</p>';
    return;
  }
  
  goals.forEach((goal, index) => {
    const goalDiv = document.createElement("div");
    goalDiv.className = "weekly-goal-item";
    const endDate = new Date(goal.weekStart);
    endDate.setDate(endDate.getDate() + 13); // Bi-weekly = 14 days, show end date
    const endDateStr = endDate.toISOString().split("T")[0];
    
    goalDiv.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>Bi-Weekly Period</label>
          <input type="date" class="weekly-date" value="${goal.weekStart || ""}" data-index="${index}" />
          <small style="color: #94a3b8; display: block; margin-top: 4px;">to ${endDateStr}</small>
        </div>
        <div class="form-group">
          <label>Target Weight (kg)</label>
          <input type="number" class="weekly-weight" step="0.1" value="${goal.weightKg || ""}" data-index="${index}" />
        </div>
        <div class="form-group">
          <label>Target Body Fat (%)</label>
          <input type="number" class="weekly-fat" step="0.1" value="${goal.bodyFatPct || ""}" data-index="${index}" />
        </div>
        <button type="button" class="button remove-goal" data-index="${index}" style="background: #ef4444; margin-top: 24px;">
          Remove
        </button>
      </div>
    `;
    weeklyGoalsList.appendChild(goalDiv);
  });
  
  // Add remove listeners
  document.querySelectorAll(".remove-goal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      const updatedGoals = Array.from(document.querySelectorAll(".weekly-goal-item")).map((item, idx) => {
        if (idx === index) return null;
        return {
          weekStart: item.querySelector(".weekly-date").value,
          weightKg: parseFloat(item.querySelector(".weekly-weight").value) || 0,
          bodyFatPct: parseFloat(item.querySelector(".weekly-fat").value) || 0,
        };
      }).filter(g => g !== null);
      renderWeeklyGoals(updatedGoals);
    });
  });
}

generateBiweeklyBtn.addEventListener("click", () => {
  const startDate = goalsStartDate.value;
  const endDate = goalsEndDate.value;
  const ultimateWeight = parseFloat(document.getElementById("ultimate-weight").value) || 0;
  const ultimateFat = parseFloat(document.getElementById("ultimate-fat").value) || 0;
  
  if (!startDate || !endDate) {
    alert("Please set both start and end dates for the goal period.");
    return;
  }
  
  if (new Date(endDate) <= new Date(startDate)) {
    alert("End date must be after start date.");
    return;
  }
  
  // Get starting values from current weight/fat inputs or existing goals
  const currentWeight = parseFloat(document.getElementById("current-weight").value) || 0;
  const currentFat = parseFloat(document.getElementById("current-fat").value) || 0;
  
  let startWeight = currentWeight || ultimateWeight;
  let startFat = currentFat || ultimateFat;
  
  // If no current values set, check existing goals
  if (startWeight === 0 || startFat === 0) {
    const existingGoals = Array.from(document.querySelectorAll(".weekly-goal-item")).map(item => ({
      weekStart: item.querySelector(".weekly-date").value,
      weightKg: parseFloat(item.querySelector(".weekly-weight").value) || 0,
      bodyFatPct: parseFloat(item.querySelector(".weekly-fat").value) || 0,
    }));
    
    if (existingGoals.length > 0) {
      const sorted = [...existingGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
      startWeight = sorted[0].weightKg || startWeight;
      startFat = sorted[0].bodyFatPct || startFat;
    }
  }
  
  if (startWeight === 0 || startFat === 0) {
    alert("Please set your current weight and body fat percentage, or set target values first.");
    return;
  }
  
  // Generate bi-weekly milestones interpolating from start to ultimate goal
  const milestones = generateBiweeklyMilestones(
    startDate,
    endDate,
    startWeight,
    ultimateWeight,
    startFat,
    ultimateFat
  );
  
  renderWeeklyGoals(milestones);
});

addMilestoneBtn.addEventListener("click", () => {
  const startDate = goalsStartDate.value;
  const endDate = goalsEndDate.value;
  
  if (!startDate) {
    alert("Please set the goal period start date first.");
    return;
  }
  
  // Get existing goals
  const existingGoals = Array.from(document.querySelectorAll(".weekly-goal-item")).map(item => ({
    weekStart: item.querySelector(".weekly-date").value,
    weightKg: parseFloat(item.querySelector(".weekly-weight").value) || 0,
    bodyFatPct: parseFloat(item.querySelector(".weekly-fat").value) || 0,
  }));
  
  // Find the latest date
  let latestDate = startDate;
  if (existingGoals.length > 0) {
    const sorted = [...existingGoals].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    latestDate = sorted[0].weekStart;
  }
  
  // Add 14 days for bi-weekly
  const newDate = new Date(latestDate);
  newDate.setDate(newDate.getDate() + 14);
  
  // Don't go beyond end date if set
  if (endDate && newDate > new Date(endDate)) {
    alert("Cannot add milestone beyond the goal period end date.");
    return;
  }
  
  const newGoal = {
    weekStart: newDate.toISOString().split("T")[0],
    weightKg: 0,
    bodyFatPct: 0,
  };
  
  existingGoals.push(newGoal);
  existingGoals.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  renderWeeklyGoals(existingGoals);
});

saveGoalsBtn.addEventListener("click", async () => {
  try {
    // Collect ultimate goal
    const ultimateGoal = {
      weightKg: parseFloat(document.getElementById("ultimate-weight").value) || 0,
      bodyFatPct: parseFloat(document.getElementById("ultimate-fat").value) || 0,
      targetDate: document.getElementById("ultimate-date").value || "",
    };
    
    // Collect goal period
    const goalPeriod = {
      startDate: goalsStartDate.value || "",
      endDate: goalsEndDate.value || "",
    };
    
    // Collect bi-weekly goals (still stored as weeklyGoals in backend for compatibility)
    const weeklyGoals = Array.from(document.querySelectorAll(".weekly-goal-item")).map(item => ({
      weekStart: item.querySelector(".weekly-date").value,
      weightKg: parseFloat(item.querySelector(".weekly-weight").value) || 0,
      bodyFatPct: parseFloat(item.querySelector(".weekly-fat").value) || 0,
    })).filter(g => g.weekStart).sort((a, b) => a.weekStart.localeCompare(b.weekStart)); // Sort by date
    
    const goals = {
      weeklyGoals,
      ultimateGoal,
      goalPeriod: goalPeriod.startDate && goalPeriod.endDate ? goalPeriod : null,
    };
    
    const response = await fetch("/api/goals", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(goals),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save goals");
    }
    
    statusEl.textContent = "Goals saved successfully!";
    closeSettingsPanel();
    
    // Reload dashboard to show updated goals
    loadDashboard();
  } catch (error) {
    statusEl.textContent = `Error saving goals: ${error.message}`;
    console.error("Failed to save goals:", error);
  }
});

// Date range controls
const applyDateRangeBtn = document.getElementById("apply-date-range");
const resetDateRangeBtn = document.getElementById("reset-date-range");
const chartStartDate = document.getElementById("chart-start-date");
const chartEndDate = document.getElementById("chart-end-date");

applyDateRangeBtn.addEventListener("click", () => {
  const startDate = chartStartDate.value;
  const endDate = chartEndDate.value;
  
  if (!startDate || !endDate) {
    alert("Please set both start and end dates.");
    return;
  }
  
  if (new Date(endDate) <= new Date(startDate)) {
    alert("End date must be after start date.");
    return;
  }
  
  customDateRange = {
    startDate,
    endDate
  };
  
  dateRangeMode.value = "custom";
  
  // Re-render charts with new date range
  if (dashboardData) {
    renderCharts(dashboardData);
    statusEl.textContent = `Custom date range: ${startDate} to ${endDate}`;
  }
});

resetDateRangeBtn.addEventListener("click", () => {
  customDateRange = null;
  dateRangeMode.value = "plan";
  dateRangeSection.style.display = "none";
  if (dashboardData) {
    updateDateRangeInputs(dashboardData.goalPeriod, dashboardData.ultimateGoal);
    renderCharts(dashboardData);
    statusEl.textContent = "Date range reset to plan";
  }
});

// Sidebar toggle handlers
function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.style.display = "block";
  menuToggle.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.style.display = "none";
  menuToggle.classList.remove("active");
  document.body.style.overflow = "";
}

menuToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener("click", () => {
  closeSidebar();
});

// Close sidebar when clicking nav items on mobile
function handleNavClick(e) {
  if (window.innerWidth <= 1024) {
    closeSidebar();
  }
}

// Navigation handlers
navConnectWithings.addEventListener("click", (e) => {
  e.preventDefault();
  handleNavClick(e);
  if (authLinkEl.href && authLinkEl.href !== "#") {
    window.open(authLinkEl.href, "_blank");
  } else {
    alert("Please wait for Withings connection to be ready.");
  }
});

navPlanSettings.addEventListener("click", (e) => {
  e.preventDefault();
  handleNavClick(e);
  openSettingsPanel();
});

navChangeAccount.addEventListener("click", (e) => {
  e.preventDefault();
  handleNavClick(e);
  if (confirm("Do you want to disconnect and reconnect Withings? This will require re-authorization.")) {
    // Clear token file logic could go here
    window.open(authLinkEl.href || "#", "_blank");
  }
});

// Close sidebar on window resize if switching to desktop
window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    closeSidebar();
  }
});

// Date range selector handler
dateRangeMode.addEventListener("change", (e) => {
  const mode = e.target.value;
  if (mode === "plan") {
    customDateRange = null;
    dateRangeSection.style.display = "none";
    if (dashboardData) {
      renderCharts(dashboardData);
      updateDateRangeInputs(dashboardData.goalPeriod, dashboardData.ultimateGoal);
      statusEl.textContent = "Using plan date range";
    }
  } else if (mode === "custom") {
    dateRangeSection.style.display = "block";
    if (dashboardData) {
      updateDateRangeInputs(dashboardData.goalPeriod, dashboardData.ultimateGoal);
    }
  }
});

loadAuthUrl();
loadDashboard();
