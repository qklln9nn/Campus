<template>
  <!-- Admin Dashboard Container -->
  <div class="admin-dashboard">
    <!-- Page Header & Refresh Button -->
    <div class="page-heading">
      <div>
        <span class="eyebrow">Admin Console</span>
        <h1>Event Management Dashboard</h1>
        <p>Live approval and moderation queues from Supabase.</p>
      </div>
      <el-button :loading="loadingEvents || loadingReports" @click="loadDashboard" type="primary" size="large">
        <el-icon class="el-icon--left"><Refresh /></el-icon>
        Refresh Dashboard
      </el-button>
    </div>

    <!-- Error Alert -->
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <!-- Top KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-wrap primary"><el-icon><DataLine /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-title">Total Events</div>
          <div class="kpi-value">{{ events.length }}</div>
          <div class="kpi-trend positive"><el-icon><TopRight /></el-icon> +12% this week</div>
        </div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-icon-wrap"><el-icon><CircleCheck /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-title">Published</div>
          <div class="kpi-value">{{ publishedCount }}</div>
          <div class="kpi-trend positive">Active on campus</div>
        </div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-icon-wrap"><el-icon><Bell /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-title">Pending Reviews</div>
          <div class="kpi-value">{{ pendingEventCount }}</div>
          <div class="kpi-trend neutral">Requires action</div>
        </div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-icon-wrap"><el-icon><Warning /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-title">Open Reports</div>
          <div class="kpi-value">{{ pendingReportCount }}</div>
          <div class="kpi-trend negative" v-if="pendingReportCount > 0">Urgent</div>
          <div class="kpi-trend positive" v-else>All clear</div>
        </div>
      </div>
    </div>

    <!-- Trend Chart Area (Full Width) -->
    <div class="trend-chart-container">
      <div class="chart-card large-chart-card">
        <div class="chart-header">
          <h3>Annual Event Scheduling Trends</h3>
          <span class="chart-subtitle">Based on event start dates</span>
        </div>
        <v-chart class="chart large-chart" :option="trendChartOption" autoresize />
      </div>
    </div>

    <!-- Data Visualization Area -->
    <div class="charts-grid">
      <div class="chart-card full-width-chart">
        <h3>Global Trending Events</h3>
        <span class="chart-subtitle" style="display:block; margin-top:-10px; margin-bottom: 16px; font-size: 0.85rem; color: #94a3b8;">Based on event registrations and waitlist</span>
        <v-chart class="chart" :option="globalTrendingChartOption" autoresize />
      </div>
      <div class="chart-card">
        <h3>Event Status Distribution</h3>
        <v-chart class="chart" :option="statusChartOption" autoresize />
      </div>
      <div class="chart-card">
        <h3>Events by Category</h3>
        <v-chart class="chart" :option="categoryChartOption" autoresize />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Refresh, DataLine, CircleCheck, Bell, Warning, TopRight } from '@element-plus/icons-vue'

// ECharts imports
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'

// Register ECharts components
use([CanvasRenderer, PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

import { useModerationStore } from '@/stores/moderationStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { categorySlug } from '@/lib/category'

// --- Store Initializations ---
const moderationStore = useModerationStore()
const categoryStore = useCategoryStore()

const {
  events,
  loadingEvents,
  loadingReports,
  errorMessage,
  pendingEventCount,
  pendingReportCount,
} = storeToRefs(moderationStore)
const { activeCategories } = storeToRefs(categoryStore)

// --- Computed Statistics ---
const publishedCount = computed(() => events.value.filter(e => e.status === 'published').length)
const draftCount = computed(() => events.value.filter(e => e.status === 'draft').length)
const rejectedCount = computed(() => events.value.filter(e => e.status === 'rejected').length)
const cancelledCount = computed(() => events.value.filter(e => e.status === 'cancelled').length)

// --- Chart Options ---
const trendChartOption = computed(() => {
  const displayMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  const eventCounts = new Array(12).fill(0)

  events.value.forEach(event => {
    const dateObj = new Date(event.date)
    if (!isNaN(dateObj.getTime())) {
      const mIdx = dateObj.getMonth()
      const displayIdx = monthIndices.indexOf(mIdx)
      
      if (displayIdx !== -1) {
        eventCounts[displayIdx] += 1
      }
    }
  })

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Scheduled Events'], top: '2%' },
    grid: { left: '3%', right: '4%', bottom: '5%', top: '15%', containLabel: true },
    xAxis: [{ type: 'category', data: displayMonths, axisTick: { alignWithLabel: true } }],
    yAxis: [
      {
        type: 'value',
        name: 'Total Events',
        min: 0,
        minInterval: 1,
        axisLabel: { formatter: '{value}' }
      }
    ],
    series: [
      {
        name: 'Scheduled Events',
        type: 'bar',
        barWidth: '40%',
        itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
        data: eventCounts
      }
    ]
  }
})

const statusChartOption = computed(() => {
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 'bottom', left: 'center' },
    series: [
      {
        name: 'Event Status',
        type: 'pie',
        radius: ['45%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: [
          { value: publishedCount.value, name: 'Published', itemStyle: { color: '#67c23a' } },
          { value: pendingEventCount.value, name: 'Pending', itemStyle: { color: '#e6a23c' } },
          { value: draftCount.value, name: 'Drafts', itemStyle: { color: '#909399' } },
          { value: rejectedCount.value, name: 'Rejected', itemStyle: { color: '#f56c6c' } },
          { value: cancelledCount.value, name: 'Cancelled', itemStyle: { color: '#878c94' } }
        ]
      }
    ]
  }
})

const categoryChartOption = computed(() => {
  const categoryCounts = activeCategories.value.map(cat => ({
    name: cat.name,
    value: events.value.filter(e => categorySlug(e.category) === cat.slug).length
  })).filter(c => c.value > 0)
  
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: categoryCounts.map(c => c.name), axisTick: { alignWithLabel: true } },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Events',
        type: 'bar',
        barWidth: '50%',
        data: categoryCounts.map(c => c.value),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ]
  }
})

// === Global Trending (Registration Based) ===
const globalTrendingChartOption = computed(() => {
  // Get top 5 events globally by registrations + waitlist
  const eventsWithScore = events.value.map(e => ({
    title: e.title.length > 35 ? e.title.substring(0, 35) + '...' : e.title,
    // Score based on real attendance numbers
    score: (e.registeredCount || 0) + (e.waitlistCount || 0) * 0.5
  }))
  .filter(e => e.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

  const titles = eventsWithScore.map(e => e.title).reverse();
  const views = eventsWithScore.map(e => e.score).reverse();

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '2%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: { type: 'value', name: 'Total Attendees' },
    yAxis: { type: 'category', data: titles },
    series: [
      {
        name: 'Attendees (Reg + Waitlist)',
        type: 'bar',
        data: views,
        itemStyle: { 
          color: '#f43f5e', // rose color for hot trends
          borderRadius: [0, 4, 4, 0] 
        },
        label: { show: true, position: 'right' }
      }
    ]
  }
})

// --- Dashboard Actions ---
async function loadDashboard() {
  try {
    await Promise.all([
      moderationStore.fetchEvents(), 
      moderationStore.fetchReports(),
      categoryStore.fetchCategories()
    ])
  } catch {
    ElMessage.error(errorMessage.value || 'Unable to load the moderation dashboard.')
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
@import '../../assets/styles/AdminDashboard.css';

/* Override the old overview style in AdminDashboard.css if it exists */
.overview { display: none; }

/* Dashboard new grid styles */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s, box-shadow 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
}

.kpi-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: #f1f5f9;
  color: #64748b;
}

.kpi-card.success .kpi-icon-wrap { background: #dcfce7; color: #16a34a; }
.kpi-card.warning .kpi-icon-wrap { background: #fef3c7; color: #d97706; }
.kpi-card.danger .kpi-icon-wrap { background: #fee2e2; color: #dc2626; }
.kpi-card .kpi-icon-wrap.primary { background: #e0f2fe; color: #0284c7; }

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-title {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-top: 4px;
  line-height: 1;
}

.kpi-trend {
  font-size: 0.75rem;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.kpi-trend.positive { color: #16a34a; }
.kpi-trend.neutral { color: #64748b; }
.kpi-trend.negative { color: #dc2626; }

/* Charts Area */
.trend-chart-container {
  margin-bottom: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.chart-subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
}

.large-chart-card {
  height: 500px;
}

.large-chart {
  height: 400px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  height: 350px;
  display: flex;
  flex-direction: column;
}

.chart-card h3 {
  margin: 0 0 16px 0;
  font-size: 1.05rem;
  color: #334155;
  font-weight: 600;
}

.chart {
  flex: 1;
  width: 100%;
}

.full-width-chart {
  grid-column: 1 / -1;
  height: 400px;
}

@media (max-width: 900px) {
  .charts-grid { grid-template-columns: 1fr; }
  .chart-card { height: 300px; }
}
</style>
