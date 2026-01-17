import CompanySelector from '@/components/CompanySelector';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useCompany } from '@/context/CompanyContext';
import { getCompanyParties } from '@/lib/api';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View as DefaultView, FlatList, StyleSheet, TextInput } from 'react-native';

export default function PartiesScreen() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const { selected } = useCompany();

  useEffect(() => {
    if (!selected) return;
    getCompanyParties(selected).then((res: any) => {
      const rows = res && res.data ? res.data : [];
      const mapped = rows.map((s: any) => ({
        name: s.$Name || s.Name || '',
        parent: s.$Parent || s.Parent || s.$PartyParent || 'N/A',
        primary: s.$Primary || s.Primary || 'N/A',
        openingBalance: s.$OpeningBalance || s.OpeningBalance || 0,
        closingBalance: s.$ClosingBalance || s.ClosingBalance || 0,
      }));
      setItems(mapped);
    }).catch(() => {});
  }, [selected]);

  const filtered = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const cardBg = useThemeColor({}, 'card');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Parties',
        headerRight: () => <CompanySelector />,
      }} />
      <TextInput
        style={[styles.searchBar, { color: textColor, borderColor: borderColor, backgroundColor: cardBg }]}
        placeholder="Search parties..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => item.name + index}
        renderItem={({ item }) => (
          <DefaultView style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
            <DefaultView style={styles.cardHeader}>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.partyName, { color: textColor }]}>
                {item.name}
              </Text>
              <Text style={[styles.closingBalance, { color: textColor }]}>
                ₹{Math.abs(item.closingBalance || 0).toFixed(2)}
              </Text>
            </DefaultView>
            
            <DefaultView style={styles.cardDetails}>
              <DefaultView style={styles.detailRow}>
                <Text style={[styles.label, { color: borderColor }]}>Parent:</Text>
                <Text style={[styles.value, { color: textColor }]} numberOfLines={1}>
                  {item.parent}
                </Text>
              </DefaultView>
              
              <DefaultView style={styles.detailRow}>
                <Text style={[styles.label, { color: borderColor }]}>Primary:</Text>
                <Text style={[styles.value, { color: textColor }]} numberOfLines={1}>
                  {item.primary}
                </Text>
              </DefaultView>
              
              <DefaultView style={styles.detailRow}>
                <Text style={[styles.label, { color: borderColor }]}>Opening Balance:</Text>
                <Text style={[styles.value, { color: textColor }]}>
                  ₹{Math.abs(item.openingBalance || 0).toFixed(2)}
                </Text>
              </DefaultView>
            </DefaultView>
          </DefaultView>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: 8 },
  searchBar: { 
    margin: 16, 
    padding: 12, 
    borderWidth: 1, 
    borderRadius: 8,
    fontSize: 16,
  },
  card: { 
    margin: 12, 
    marginVertical: 8,
    borderRadius: 12, 
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partyName: { 
    fontSize: 18, 
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  closingBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    flex: 0.4,
  },
  value: {
    fontSize: 13,
    flex: 0.6,
    textAlign: 'right',
  },
});
