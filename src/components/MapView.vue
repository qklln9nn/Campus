<template>
  <div class="map-view-container">
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon paths issue
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const props = defineProps<{
  lat: number
  lng: number
  popupText?: string
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const marker = shallowRef<L.Marker | null>(null)

onMounted(() => {
  if (!mapContainer.value) return

  map.value = L.map(mapContainer.value, {
    zoomControl: true,
    scrollWheelZoom: false // Better UX when scrolling down a page
  }).setView([props.lat, props.lng], 16)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map.value)

  marker.value = L.marker([props.lat, props.lng]).addTo(map.value)
  
  if (props.popupText) {
    marker.value.bindPopup(props.popupText).openPopup()
  }

  // Ensure map tiles load correctly if initialized inside a hidden or transitioning container
  setTimeout(() => {
    map.value?.invalidateSize()
  }, 100)
})

watch(() => [props.lat, props.lng, props.popupText], ([newLat, newLng, newText]) => {
  if (map.value && marker.value && typeof newLat === 'number' && typeof newLng === 'number') {
    marker.value.setLatLng([newLat, newLng])
    map.value.setView([newLat, newLng])
    
    if (newText && typeof newText === 'string') {
      marker.value.bindPopup(newText)
    }
  }
})

onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>

<style scoped>
.map-view-container {
  width: 100%;
}
.map-container {
  width: 100%;
  height: 250px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  z-index: 1;
}
</style>
