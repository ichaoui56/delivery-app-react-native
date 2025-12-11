
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

type OrderStatus = 'Delivered' | 'Cancelled';

const dummyHistory = [
  {
    id: '1',
    orderId: 'ORD003',
    customerName: 'Bob Johnson',
    deliveryAddress: '789 Pine Ln, Anytown, USA',
    status: 'Delivered' as OrderStatus,
    date: '2023-10-26',
  },
  {
    id: '2',
    orderId: 'ORD004',
    customerName: 'Alice Williams',
    deliveryAddress: '101 Maple Dr, Anytown, USA',
    status: 'Cancelled' as OrderStatus,
    date: '2023-10-25',
  },
];

const HistoryScreen = () => {
  const [filter, setFilter] = useState<OrderStatus>('Delivered');

  const filteredHistory = dummyHistory.filter((order) => order.status === filter);

  const renderHistoryItem = ({ item }: { item: typeof dummyHistory[0] }) => (
    <View style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>{item.orderId}</Text>
        <Text style={[styles.status, getStatusStyle(item.status)]}>{item.status}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <Text style={styles.address}>{item.deliveryAddress}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{item.date}</Text>
      </View>
    </View>
  );

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return { backgroundColor: '#28a745', color: '#fff' };
      case 'Cancelled':
        return { backgroundColor: '#dc3545', color: '#fff' };
      default:
        return {};
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order history</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'Delivered' && styles.activeFilterChip]}
          onPress={() => setFilter('Delivered')}
        >
          <Text style={[styles.filterChipText, filter === 'Delivered' && styles.activeFilterChipText]}>Delivered</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'Cancelled' && styles.activeFilterChip]}
          onPress={() => setFilter('Cancelled')}
        >
          <Text style={[styles.filterChipText, filter === 'Cancelled' && styles.activeFilterChipText]}>Cancelled</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No orders found</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0586b5',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeFilterChip: {
    backgroundColor: '#0586b5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  listContainer: {
    padding: 10,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardBody: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});

export default HistoryScreen;
