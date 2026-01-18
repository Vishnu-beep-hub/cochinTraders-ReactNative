import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationSubscription } from 'expo-location';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import PunchCard from '../../components/trader/PunchCard';
import ShopInput from '../../components/trader/ShopInput';
import { useCompany } from '../../context/CompanyContext';
import { getCompanyParties, postTraderActivity } from '../../lib/api';

export default function DashboardScreen() {
  const [status, setStatus] = useState<'off' | 'on'>('off');
  const [shopName, setShopName] = useState('');
  const [amount, setAmount] = useState('');
  const [parties, setParties] = useState<{ name: string; closingBalance: number }[]>([]);
  const [showParties, setShowParties] = useState(false);
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalEmployeeName, setModalEmployeeName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const { refresh, selected } = useCompany();

  // Modal animations
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'tabIconDefault');

  const employeeNameRef = useRef<string | null>(null);

  // Show/hide modal animation
  const showEmployeeModalWithAnimation = useCallback(() => {
    setShowEmployeeModal(true);
    Animated.parallel([
      Animated.timing(modalSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hideEmployeeModalWithAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalSlideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowEmployeeModal(false);
      modalSlideAnim.setValue(300);
      modalOpacity.setValue(0);
    });
  }, []);

  const handleAddEmployee = async () => {
    if (!modalEmployeeName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (modalPhone.length !== 10 || !/^\d+$/.test(modalPhone)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setModalLoading(true);
      // Save to AsyncStorage
      await AsyncStorage.multiSet([
        ['employee_name', modalEmployeeName.trim()],
        ['employee_phone', modalPhone],
        ['employee_token', Date.now().toString()],
      ]);

      setEmployeeName(modalEmployeeName.trim());
      employeeNameRef.current = modalEmployeeName.trim();
      setShowSuccessModal(true);

      // Hide success modal and modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        hideEmployeeModalWithAnimation();
        setModalEmployeeName('');
        setModalPhone('');
      }, 2000);
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee details');
    } finally {
      setModalLoading(false);
    }
  };

  // Check for employee on component mount
  useEffect(() => {
    const checkEmployee = async () => {
      try {
        const name = await AsyncStorage.getItem('employee_name');
        if (name) {
          setEmployeeName(name);
          employeeNameRef.current = name;
        } else {
          showEmployeeModalWithAnimation();
        }
      } catch (error) {
        console.error('Error checking employee:', error);
        showEmployeeModalWithAnimation();
      }
    };
    checkEmployee();
  }, [showEmployeeModalWithAnimation]);

  useEffect(() => {
    if (!selected) return;
    getCompanyParties(selected).then((res: any) => {
      const rows = res && res.data ? res.data : [];
      const debtors = (rows || []).filter((r: any) => {
        const grp = r.$_PrimaryGroup || r._PrimaryGroup || r.PrimaryGroup || '';
        return String(grp).toLowerCase().includes('sundry debtors');
      }).map((p: any) => ({
        name: String(p.$Name || p.MailingName || p.Name || ''),
        closingBalance: Number(p.$ClosingBalance ?? p.ClosingBalance ?? p.Balance ?? 0) || 0,
      }));
      setParties(debtors.filter((d: any) => !!d.name));
    }).catch(() => setParties([]));
  }, [selected]);

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let subscription: LocationSubscription | null = null;
    let isMounted = true;

    (async () => {
      // ensure company list refreshed when dashboard opens
      try { await refresh(); } catch (e) {}
      const id = await AsyncStorage.getItem('employee_phone');
      if (!isMounted) return;
      setEmpId(id || null);
      
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted || permissionStatus !== 'granted') return;
      
      const getAddressFromCoords = async (lat: number, lon: number) => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: {
              'User-Agent': 'CochinTradersApp',
            },
          });
          
          if (!response.ok) {
            console.warn('Nominatim API returned status:', response.status);
            return null;
          }
          
          const data = await response.json();
          const village = data.address?.village || data.address?.city || data.address?.town || '';
          const district = data.address?.state_district || data.address?.county || '';
          
          if (!village && !district) {
            return null;
          }
          
          const locationName = [village, district].filter(Boolean).join(', ');
          return locationName;
        } catch (error) {
          console.warn('Address fetch error:', error);
          return null;
        }
      };

      const updateLocation = async (lat: number, lng: number) => {
        if (!isMounted) return;
        setCoords({ lat, lng });

        // Initial fallback
        setLocationName('Fetching address...');

        try {
          let addressName: string | null = null;

          // Try Nominatim or proxy via helper
          try {
            addressName = await getAddressFromCoords(lat, lng);
          } catch (osmErr) {
            console.warn('Nominatim/proxy reverse geocode failed:', osmErr);
          }

          // Fallback to Expo reverse geocode if no result
          if (!addressName && isMounted) {
            try {
              const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
              if (isMounted && address && address.length > 0) {
                const a = address[0];
                const parts = [a.name !== a.street ? a.name : null, a.street, a.city || a.subregion].filter((p): p is string => !!p && p.trim().length > 0);
                const uniqueParts = [...new Set(parts)];
                if (uniqueParts.length > 0) addressName = uniqueParts.join(', ');
              }
            } catch (nativeErr) {
              console.warn('Expo reverse geocode failed:', nativeErr);
            }
          }

          if (isMounted) {
            if (addressName) setLocationName(addressName);
            else setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (e) {
          console.warn('All geocoding attempts failed:', e);
          if (isMounted) setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      };

      try {
        const loc = await Location.getCurrentPositionAsync({});
        if (isMounted) updateLocation(loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        console.warn('Error getting initial location:', e);
      }
      
      if (!isMounted) return;

      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 }, (l) => {
        updateLocation(l.coords.latitude, l.coords.longitude);
      });
      
      if (!isMounted) {
        sub.remove();
      } else {
        subscription = sub;
      }
    })();

    return () => {
      isMounted = false;
      if (subscription) {
        try {
          subscription.remove();
        } catch (e) {
          console.warn('Error removing location subscription:', e);
        }
      }
    };
  }, []);

  const toggleWithName = useCallback(async () => {
    const next = status === 'on' ? 'off' : 'on';
    // Always get the latest employee name from storage when the user toggles punch
    const storedEmployeeName = await AsyncStorage.getItem('employee_name');
    if (next === 'on' && !storedEmployeeName) {
      await AsyncStorage.setItem('force_splash', '1');
      return;
    }
    setStatus(next);
    if (next === 'on') setTime(new Date().toLocaleTimeString());
    if (next === 'on') setDate(new Date().toLocaleDateString());
    const type = next === 'on' ? 'punch_in' : 'punch_out';
    const position = coords ? { lat: coords.lat, lng: coords.lng } : undefined;
    const now = new Date();
    const payload: { 
      type: string; 
      shopName: string; 
      amount: number; 
      empId?: string; 
      location?: { lat: number; lng: number }; 
      employeeName?: string; 
      place?: string; 
      date?: string; 
      time?: string; 
      companyName?: string } = {
      type,
      shopName,
      amount: Number(amount || 0) || 0,
      empId: empId || undefined,
      employeeName: storedEmployeeName || undefined,
      time: next === 'on' ? now.toLocaleTimeString() : undefined,
      date: next === 'on' ? now.toLocaleDateString() : undefined,
      place: next === 'on' ? (locationName || undefined) : undefined,
      companyName: selected || undefined,
    };
    if (position) payload.location = position;
    postTraderActivity(payload).catch(() => {});
    if (next === 'on') {
      const place = locationName || undefined;
      const info = {
        shopName,
        amount: Number(amount || 0) || 0,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        place,
        employeeName: employeeNameRef.current,
      };
      try { await AsyncStorage.setItem('last_punch', JSON.stringify(info)); } catch (e) {}
    }
  }, [status, coords, empId, shopName, amount, selected]);

  return (
    <View style={styles.container}>
      {employeeName && <Text style={styles.greeting}>Welcome, {employeeName}</Text>}
      <PunchCard status={status} time={status === 'on' ? time : currentDate.toLocaleTimeString()} date={status === 'on' ? date : currentDate.toLocaleDateString()} coords={coords} locationName={locationName} companyName={selected} onToggle={toggleWithName}>
        <View style={styles.inputWrap}>
          <ShopInput value={shopName} onChange={(v) => { setShopName(v); setShowParties(true); }} showClear={showParties || !!shopName} onClear={() => { setShopName(''); setShowParties(false); }} />
          {showParties && parties.length > 0 ? (
            <View style={[styles.suggestions, { backgroundColor: cardBg, borderColor: borderColor }]}>
              <FlatList
                data={parties.filter(p => p.name.toLowerCase().includes(shopName.toLowerCase())).slice(0,5)}
                keyExtractor={(i) => i.name}
                renderItem={({ item }) => (
                  <Pressable onPress={() => { setShopName(item.name); setAmount(String(Math.abs(item.closingBalance))); setShowParties(false); }} style={[styles.suggestionItem, { borderBottomColor: borderColor }]}>
                    <Text numberOfLines={1}>{item.name}</Text>
                  </Pressable>
                )}
              />
            </View>
          ) : null}
        </View>
        <TextInput placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} style={[styles.input, { borderColor: borderColor }]} />
      </PunchCard>

      {/* Employee Modal */}
      <Modal visible={showEmployeeModal} transparent={true} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: modalSlideAnim }],
            },
          ]}
        >
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={styles.modalTitle}>Add Employee Details</Text>
            <TextInput
              placeholder="Employee Name"
              value={modalEmployeeName}
              onChangeText={setModalEmployeeName}
              style={[styles.modalInput, { borderColor }]}
              editable={!modalLoading}
            />
            <TextInput
              placeholder="Phone Number (10 digits)"
              value={modalPhone}
              onChangeText={(v) => setModalPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
              keyboardType="numeric"
              maxLength={10}
              style={[styles.modalInput, { borderColor }]}
              editable={!modalLoading}
            />
            <TouchableOpacity
              style={[styles.modalButton, { opacity: modalLoading ? 0.6 : 1 }]}
              onPress={handleAddEmployee}
              disabled={modalLoading}
            >
              <Text style={styles.modalButtonText}>{modalLoading ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent={true} animationType="fade">
        <View style={styles.successOverlay}>
          <View style={[styles.successContent, { backgroundColor: cardBg }]}>
            <Text style={styles.successTitle}>✓ Success!</Text>
            <Text style={styles.successMessage}>Employee Added Successfully</Text>
            <Text style={styles.successName}>{modalEmployeeName}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  inputWrap: { position: 'relative', marginBottom: 8, zIndex: 1, backgroundColor: 'transparent' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 8 },
  suggestions: { position: 'absolute', top: 44, left: 0, right: 0, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, maxHeight: 200, zIndex: 1, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  suggestionItem: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  greeting: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { paddingHorizontal: 20, paddingVertical: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 50 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 16, fontSize: 16 },
  modalButton: { backgroundColor: '#780206', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  successContent: { paddingHorizontal: 30, paddingVertical: 40, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  successTitle: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: '#00a86b' },
  successMessage: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  successName: { fontSize: 18, fontWeight: '600', marginTop: 8 },
});
