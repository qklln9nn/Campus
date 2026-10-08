<template>
  <div class="map-picker-container">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="selectedLocation" class="selected-coords">
      Selected: {{ selectedLocation.lat.toFixed(6) }}, {{ selectedLocation.lng.toFixed(6) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch'
import 'leaflet-geosearch/dist/geosearch.css'

// Fix Leaflet's default icon paths issue with webpack/vite
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const props = defineProps<{
  modelValue?: { lat: number; lng: number } | null
  defaultCenter?: { lat: number; lng: number }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { lat: number; lng: number } | null): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const marker = shallowRef<L.Marker | null>(null)
const selectedLocation = ref<{ lat: number; lng: number } | null>(props.modelValue || null)

// Campus default center (can be customized)
// Let's use a generic university campus coordinate as default if not provided
const center = props.defaultCenter || { lat: -36.8523, lng: 174.7691 } // Example: University of Auckland

onMounted(() => {
  if (!mapContainer.value) return

  map.value = L.map(mapContainer.value).setView([center.lat, center.lng], 16)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map.value)

  if (selectedLocation.value) {
    marker.value = L.marker([selectedLocation.value.lat, selectedLocation.value.lng]).addTo(map.value)
    map.value.setView([selectedLocation.value.lat, selectedLocation.value.lng], 16)
  }

  map.value.on('click', (e: L.LeafletMouseEvent) => {
    const newLoc = { lat: e.latlng.lat, lng: e.latlng.lng }
    selectedLocation.value = newLoc
    
    if (marker.value && map.value) {
      marker.value.setLatLng(e.latlng)
    } else if (map.value) {
      marker.value = L.marker(e.latlng).addTo(map.value)
    }
    
    emit('update:modelValue', newLoc)
  })

  const provider = new OpenStreetMapProvider()
  const searchControl = GeoSearchControl({
    provider: provider,
    style: 'bar',
    showMarker: false,
    autoClose: true,
    retainZoomLevel: false,
    animateZoom: true,
    keepResult: true,
    searchLabel: 'Enter address or building name'
  }) as L.Control

  map.value.addControl(searchControl)

  map.value.on('geosearch/showlocation', (e: L.LeafletEvent) => {
    const { location } = e as L.LeafletEvent & { location: { x: number; y: number } }
    const newLoc = { lat: location.y, lng: location.x }
    selectedLocation.value = newLoc
    
    if (marker.value && map.value) {
      marker.value.setLatLng([newLoc.lat, newLoc.lng])
    } else if (map.value) {
      marker.value = L.marker([newLoc.lat, newLoc.lng]).addTo(map.value)
    }
    
    emit('update:modelValue', newLoc)
  })
})

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    if (marker.value && map.value) {
      map.value.removeLayer(marker.value)
      marker.value = null
    }
    selectedLocation.value = null
  } else if (newVal && (!selectedLocation.value || selectedLocation.value.lat !== newVal.lat || selectedLocation.value.lng !== newVal.lng)) {
    selectedLocation.value = newVal
    if (marker.value && map.value) {
      marker.value.setLatLng([newVal.lat, newVal.lng])
      map.value.setView([newVal.lat, newVal.lng])
    } else if (map.value) {
      marker.value = L.marker([newVal.lat, newVal.lng]).addTo(map.value)
      map.value.setView([newVal.lat, newVal.lng])
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
.map-picker-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.map-container {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  z-index: 1; /* prevent overlapping with element-plus dropdowns */
}
.selected-coords {
  font-size: 0.85rem;
  color: #64748b;
}
</style>
