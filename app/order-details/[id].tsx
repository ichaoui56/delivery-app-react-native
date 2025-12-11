
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const OrderDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Dummy data - replace with actual data fetching
  const order = {
    id: id,
    orderId: `ORD${id}`,
    customerName: 'John Doe',
    deliveryAddress: '123 Main St, Anytown, USA',
    status: 'In Progress',
    estimatedDelivery: '11:00 AM',
    items: [
      { id: '1', name: 'Product A', quantity: 2, price: 10 },
      { id: '2', name: 'Product B', quantity: 1, price: 25 },
    ],
    totalPrice: 45,
    instructions: 'Leave at the front door.',
  };

  const handleUpdateStatus = (newStatus: string) => {
    console.log(`Updating status for order ${id} to ${newStatus}`);
    // Add logic to update status
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <Text style={styles.infoText}><Text style={styles.bold}>Name:</Text> {order.customerName}</Text>
          <Text style={styles.infoText}><Text style={styles.bold}>Address:</Text> {order.deliveryAddress}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name} (x{item.quantity})</Text>
              <Text style={styles.itemPrice}>${item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalPrice}>${order.totalPrice}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text style={styles.infoText}>{order.instructions}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.acceptButton]}>
            <Text style={styles.actionButtonText}>Accept Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.navigateButton]}>
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusUpdateContainer}>
          <Text style={styles.statusUpdateTitle}>Update Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity style={styles.statusButton} onPress={() => handleUpdateStatus('Picked Up')}>
              <Text style={styles.statusButtonText}>Picked Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statusButton} onPress={() => handleUpdateStatus('Delivered')}>
              <Text style={styles.statusButtonText}>Delivered</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusButton, styles.cancelButton]} onPress={() => handleUpdateStatus('Cancelled')}>
              <Text style={styles.statusButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0586b5',
    padding: 20,
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0586b5',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemPrice: {
    fontSize: 16,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 5,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0586b5',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  navigateButton: {
    backgroundColor: '#17a2b8',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusUpdateContainer: {
    marginTop: 10,
  },
  statusUpdateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusButton: {
    backgroundColor: '#0586b5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen;
