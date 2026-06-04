// 위치 기능 공통 상수/헬퍼 (page.jsx, NavigationMap.jsx 공유)

// 위치를 받지 못할 때 사용하는 기본 좌표 (서울시청)
export const fallbackLocation = { lat: 37.566481, lon: 126.985023 };

export const geolocationOptions = {
  timeout: 12000,
  enableHighAccuracy: false,
  maximumAge: 60000,
};

export async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}
