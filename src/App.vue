<!-- src/App.vue -->
<template>
  <div style="padding: 2rem;">
    <h1>Campus EventHub 数据库连接测试</h1>
    <el-button type="primary" @click="fetchEvents">手动刷新数据</el-button>

    <ul v-if="events.length > 0">
      <li v-for="event in events" :key="event.id">
        活动名称: {{ event.title }}
      </li>
    </ul>
    <p v-else>正在加载或暂无数据...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase'

const events = ref<any[]>([])

async function fetchEvents() {
  // 从 public.events 表中选取所有列
  const { data, error } = await supabase.from('events').select('*')
  if (error) {
    console.error('拉取失败:', error.message)
  } else {
    events.value = data || []
    console.log('拉取成功:', data)
  }
}

// 页面加载时自动执行一次
onMounted(() => {
  fetchEvents()
})
</script>
