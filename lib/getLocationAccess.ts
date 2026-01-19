import { getCoords } from './getCoords';

export async function getAddressFromCoords(lat: number, lon: number, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`;
  try {
    console.log("🔗 Geoapify URL:", url);
    const response = await fetch(url);
    console.log("🔗 Geoapify response ok:", response.ok, "status:", response.status);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const feature = data?.features?.[0];
    const address = feature?.properties?.formatted || null;
    console.log("📍 Geoapify parsed address:", address);
    return address || null;
  } catch {
    console.warn("❌ Geoapify fetch error");
    return null;
  }
}

export async function getUserAddress(apiKey: string): Promise<string | null> {
  try {
    const coords = await getCoords();
    if (!coords) return null;
    console.log("📍 Using coords:", coords.latitude, coords.longitude);
    const address = await getAddressFromCoords(coords.latitude, coords.longitude, apiKey);
    return address;
  } catch (e) {
    console.warn("❌ getUserAddress overall failure");
    return null;
  }
}
