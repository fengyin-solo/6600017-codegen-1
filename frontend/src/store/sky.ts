import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { STARS, CONSTELLATIONS } from '../data/stars'
import type { Star } from '../types'

export interface LocationPreset {
  name: string
  nameCn: string
  latitude: number
  longitude: number
}

const LOCATION_PRESETS: LocationPreset[] = [
  { name: 'Beijing', nameCn: '北京', latitude: 39.9, longitude: 116.4 },
  { name: 'Shanghai', nameCn: '上海', latitude: 31.2, longitude: 121.5 },
  { name: 'Guangzhou', nameCn: '广州', latitude: 23.1, longitude: 113.3 },
  { name: 'Chengdu', nameCn: '成都', latitude: 30.7, longitude: 104.1 },
  { name: 'Xi\'an', nameCn: '西安', latitude: 34.3, longitude: 108.9 },
  { name: 'Harbin', nameCn: '哈尔滨', latitude: 45.8, longitude: 126.5 },
  { name: 'Kunming', nameCn: '昆明', latitude: 25.0, longitude: 102.7 },
  { name: 'Urumqi', nameCn: '乌鲁木齐', latitude: 43.8, longitude: 87.6 },
  { name: 'Tokyo', nameCn: '东京', latitude: 35.7, longitude: 139.7 },
  { name: 'New York', nameCn: '纽约', latitude: 40.7, longitude: -74.0 },
  { name: 'London', nameCn: '伦敦', latitude: 51.5, longitude: -0.1 },
  { name: 'Sydney', nameCn: '悉尼', latitude: -33.9, longitude: 151.2 },
]

export const useSkyStore = defineStore('sky', () => {
  const viewDate = ref(new Date())
  const zoom = ref(1.0)
  const panX = ref(0)
  const panY = ref(0)
  const showLabels = ref(true)
  const showConstLines = ref(true)
  const showGrid = ref(true)
  const selectedStar = ref<Star | null>(null)
  const searchQuery = ref('')
  const latitude = ref(39.9) // Beijing default
  const currentLocation = ref<LocationPreset>(LOCATION_PRESETS[0])

  const localSiderealTime = computed(() => {
    const d = viewDate.value
    const jd = d.getTime() / 86400000 + 2440587.5
    const T = (jd - 2451545.0) / 36525.0
    let lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000)
    lst = ((lst % 360) + 360) % 360
    return lst / 15 // convert to hours
  })

  const filteredStars = computed(() => {
    if (!searchQuery.value) return []
    const q = searchQuery.value.toLowerCase()
    return STARS.filter(s => s.name.toLowerCase().includes(q)).slice(0, 5)
  })

  function projectStar(ra: number, dec: number, cx: number, cy: number, scale: number): [number, number] {
    const ha = (localSiderealTime.value - ra) * 15 * Math.PI / 180
    const decRad = dec * Math.PI / 180
    const latRad = latitude.value * Math.PI / 180

    const alt = Math.asin(Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha))
    const az = Math.atan2(-Math.cos(decRad) * Math.sin(ha), Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(ha))

    if (alt < -0.1) return [-999, -999] // below horizon

    const r = (Math.PI / 2 - alt) * scale * 0.45
    const x = cx + panX.value + r * Math.sin(az)
    const y = cy + panY.value - r * Math.cos(az)
    return [x, y]
  }

  function starRadius(mag: number): number {
    return Math.max(1, 5 - mag) * zoom.value
  }

  function spectralColor(spectral: string): string {
    const colors: Record<string, string> = {
      'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff',
      'F': '#f8f7ff', 'G': '#fff4ea', 'K': '#ffd2a1', 'M': '#ffcc6f'
    }
    return colors[spectral] || '#ffffff'
  }

  function selectStar(x: number, y: number, cx: number, cy: number, scale: number) {
    let closest: Star | null = null
    let minDist = 20
    for (const star of STARS) {
      const [sx, sy] = projectStar(star.ra, star.dec, cx, cy, scale)
      const dist = Math.hypot(sx - x, sy - y)
      if (dist < minDist) { minDist = dist; closest = star }
    }
    selectedStar.value = closest
  }

  function setLocation(preset: LocationPreset) {
    currentLocation.value = preset
    latitude.value = preset.latitude
  }

  function setCustomLatitude(lat: number) {
    latitude.value = lat
    const matched = LOCATION_PRESETS.find(p => Math.abs(p.latitude - lat) < 0.05)
    if (matched) {
      currentLocation.value = matched
    } else {
      currentLocation.value = {
        name: 'Custom',
        nameCn: '自定义',
        latitude: lat,
        longitude: 0
      }
    }
  }

  return {
    viewDate, zoom, panX, panY, showLabels, showConstLines, showGrid,
    selectedStar, searchQuery, latitude, currentLocation,
    localSiderealTime, filteredStars,
    projectStar, starRadius, spectralColor, selectStar,
    setLocation, setCustomLatitude,
    LOCATION_PRESETS, STARS, CONSTELLATIONS
  }
})
