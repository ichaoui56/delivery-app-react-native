import { DeliveryAttempt } from "@/types/DeliveryAttempt"
import * as ExpoSecureStore from "expo-secure-store"

const TOKEN_KEY = "mobile_jwt"

// Helper functions to work with SecureStore
const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    return await ExpoSecureStore.getItemAsync(key)
  } catch (error) {
    console.error('Error getting secure item:', error)
    return null
  }
}

const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    await ExpoSecureStore.setItemAsync(key, value)
  } catch (error) {
    console.error('Error setting secure item:', error)
    throw error
  }
}

const deleteSecureItem = async (key: string): Promise<void> => {
  try {
    await ExpoSecureStore.deleteItemAsync(key)
  } catch (error) {
    console.error('Error deleting secure item:', error)
    throw error
  }
}

export type DeliveryMan = {
  id: number
  city: string | null
  vehicleType: string | null
  active: boolean
  baseFee?: number
}

export type DeliveryManUser = {
  id: number
  name: string
  email: string
  phone: string
  image?: string | null
  role: "DELIVERYMAN"
  deliveryMan: DeliveryMan
}

type ApiErrorBody = {
  error?: string
  errors?: Record<string, string[]>
}

function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL
  if (envUrl) return envUrl.replace(/\/$/, "")

  return "https://dash.sonixpress.ma"
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function getAuthToken(): Promise<string | null> {
  return await getSecureItem(TOKEN_KEY)
}

export async function setAuthToken(token: string): Promise<void> {
  await setSecureItem(TOKEN_KEY, token)
}

export async function clearAuthToken(): Promise<void> {
  await deleteSecureItem(TOKEN_KEY)
}

export async function apiSignIn(email: string, password: string): Promise<{ token: string; user: DeliveryManUser }> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const body = await readJsonSafe<ApiErrorBody & { token?: string; user?: DeliveryManUser }>(res)

  if (!res.ok) {
    const message = body?.error || "Login failed"
    throw new Error(message)
  }

  if (!body?.token || !body.user) {
    throw new Error("Invalid server response")
  }

  return { token: body.token, user: body.user }
}

export async function apiMe(token: string): Promise<{ user: DeliveryManUser }> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/auth/me`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  })

  const body = await readJsonSafe<ApiErrorBody & { user?: DeliveryManUser }>(res)

  if (!res.ok) {
    const message = body?.error || "Unauthorized"
    throw new Error(message)
  }

  if (!body?.user) {
    throw new Error("Invalid server response")
  }

  return { user: body.user }
}

export async function apiLogout(token: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/api/mobile/auth/logout`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => null)
}

// UPDATED: Removed DELAY, added DELAYED
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'ASSIGNED_TO_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'DELAYED' | 'REJECTED'

type Product = {
  id: number
  name: string
  image: string | null
  sku: string | null
}

type OrderItem = {
  id: number
  orderId: number
  productId: number
  quantity: number
  price: number
  originalPrice: number
  isFree: boolean
  product: Product
}

type UserInfo = {
  id: number
  name: string
  phone: string
  email?: string
  image?: string | null
}

type Merchant = {
  id: number
  companyName: string
  user: UserInfo
}

type DeliveryManInfo = {
  id: number
  user: UserInfo
}

// Delivery Note Types
export type DeliveryNote = {
  id: number
  orderId: number
  deliveryManId: number
  content: string
  isPrivate: boolean
  createdAt: string
  updatedAt: string
  deliveryMan: {
    user: {
      id: number
      name: string
      image: string | null
    }
  }
}

export interface Order {
  id: number
  orderCode: string
  customerName: string
  customerPhone: string
  address: string
  city: string
  note: string
  totalPrice: number
  paymentMethod: string
  merchantEarning: number
  status: OrderStatus
  merchantId: number
  deliveryManId: number
  discountType: string | null
  discountValue: number | null
  discountDescription: string | null
  originalTotalPrice: number | null
  totalDiscount: number | null
  buyXGetYConfig: any | null
  createdAt: string
  deliveredAt: string | null
  updatedAt: string
  orderItems: OrderItem[]
  deliveryNotes?: DeliveryNote[]  // Added delivery notes
  merchant?: Merchant
  deliveryMan?: DeliveryManInfo
}

export type OrdersResponse = {
  orders: Order[]
}

// ===== HISTORY TYPES =====
export type HistoryOrderStatus = 'PENDING' | 'ACCEPTED' | 'ASSIGNED_TO_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'DELAYED' | 'REJECTED'

export type OrderHistory = {
  id: number
  orderId: number
  orderCode: string
  customerName: string
  deliveryAddress: string
  city: string
  status: HistoryOrderStatus
  date: string
  amount: string
  totalPrice: number
  itemsCount: number
  deliveryTime?: string
  note?: string
  customerPhone: string
  paymentMethod: string
  merchant?: Merchant
  orderItems: OrderItem[]
  createdAt: string
  deliveredAt?: string | null
}

export type OrdersHistoryResponse = {
  orders: OrderHistory[]
  hasMore: boolean
  totalCount: number
}

export type OrderStatsResponse = {
  stats: {
    totalOrders: number
    delivered: number
    cancelled: number
    delayed: number
    totalEarnings: number
    avgDeliveryTime: string
    successRate: number
    currentStreak: number
    month: string
  }
}

// ===== DELIVERY NOTES TYPES & FUNCTIONS =====
export type NotesResponse = {
  notes: DeliveryNote[]
}

export type CreateNoteRequest = {
  content: string
  isPrivate?: boolean
}

export type CreateNoteResponse = {
  success: boolean
  message: string
  note: DeliveryNote
}

export type DeleteNoteResponse = {
  success: boolean
  message: string
}

export type UpdateNoteRequest = {
  content: string
  isPrivate?: boolean
}

export type UpdateNoteResponse = {
  success: boolean
  message: string
  note: DeliveryNote
}

// In mobile-auth.ts, update the apiGetOrderNotes function:
export async function apiGetOrderNotes(token: string, orderId: number): Promise<NotesResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}/note`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    // First, check if we got HTML instead of JSON
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text()
      console.error('Received non-JSON response:', text.substring(0, 200))

      // Check if this is an HTML error page
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        throw new Error('Server returned HTML instead of JSON. Check if the endpoint exists.')
      }

      throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}`)
    }

    const data = await res.json()

    if (!res.ok) {
      const errorMessage = data?.error || data?.message || `Server returned status ${res.status}`
      throw new Error(errorMessage)
    }

    // Handle different response structures
    if (data.notes !== undefined) {
      return { notes: data.notes }
    } else if (Array.isArray(data)) {
      return { notes: data }
    } else if (data.note) {
      return { notes: [data.note] }
    } else {
      // Default to empty array
      console.warn('Unexpected response structure:', data)
      return { notes: [] }
    }
  } catch (error) {
    console.error('Error in apiGetOrderNotes:', error)
    // Return empty notes instead of throwing to prevent breaking the UI
    return { notes: [] }
  }
}

// Similarly update apiCreateOrderNote:
export async function apiCreateOrderNote(
  token: string,
  orderId: number,
  data: CreateNoteRequest
): Promise<CreateNoteResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}/note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    // Check content type
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text()
      console.error('Received non-JSON response for create note:', text.substring(0, 200))
      throw new Error('Server returned non-JSON response')
    }

    const responseData = await res.json()

    if (!res.ok) {
      const errorMessage = responseData?.error || responseData?.message || `Failed to create note (${res.status})`
      throw new Error(errorMessage)
    }

    // Handle response
    if (responseData.success !== undefined && responseData.note) {
      return {
        success: responseData.success,
        message: responseData.message || 'Note added successfully',
        note: responseData.note
      }
    } else if (responseData.id) {
      return {
        success: true,
        message: 'Note added successfully',
        note: responseData
      }
    } else {
      console.warn('Unexpected create note response:', responseData)
      throw new Error('Invalid response from server')
    }
  } catch (error) {
    console.error('Error in apiCreateOrderNote:', error)
    throw error
  }
}

export async function apiDeleteOrderNote(
  token: string,
  orderId: number,
  noteId: number
): Promise<DeleteNoteResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}/note/${noteId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to delete note' }))
    throw new Error(error.error || 'Failed to delete note')
  }

  return res.json()
}

// ===== HISTORY FUNCTIONS =====
export async function apiOrderHistory(
  token: string,
  options?: {
    status?: HistoryOrderStatus | "All" | "Delivered" | "Cancelled" | "Delayed" | "DELIVERED" | "CANCELLED" | "DELAYED"
    take?: number
    skip?: number
  }
): Promise<OrdersHistoryResponse> {
  const params = new URLSearchParams()

  let statusParam = options?.status
  if (statusParam) {
    // Map frontend filter to backend status
    const statusMap: Record<string, string> = {
      "Delivered": "DELIVERED",
      "Cancelled": "CANCELLED",
      "Delayed": "DELAYED",
      "DELIVERED": "DELIVERED",
      "CANCELLED": "CANCELLED",
      "DELAYED": "DELAYED"
    }

    if (statusParam !== "All") {
      const backendStatus = statusMap[statusParam] || statusParam
      params.append('status', backendStatus)
    }
  }

  if (options?.take) params.append('take', options.take.toString())
  if (options?.skip) params.append('skip', options.skip.toString())

  const url = `${getApiBaseUrl()}/api/mobile/orders${params.toString() ? `?${params.toString()}` : ''}`

  console.log('Fetching history from:', url)

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  console.log('History response status:', res.status)

  const body = await readJsonSafe<any>(res)

  console.log('History response body:', JSON.stringify(body, null, 2))

  if (!res.ok) {
    const message = body?.error || 'Failed to fetch order history'
    throw new Error(message)
  }

  if (!body || body.orders === undefined) {
    console.error('Invalid response structure:', body)
    throw new Error('Invalid order history response')
  }

  return {
    orders: body.orders || [],
    hasMore: body.hasMore || false,
    totalCount: body.totalCount || 0
  }
}

export async function apiOrderStats(token: string): Promise<OrderStatsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  const body = await readJsonSafe<OrderStatsResponse & { error?: string }>(res)

  if (!res.ok) {
    const message = body?.error || 'Failed to fetch order statistics'
    throw new Error(message)
  }

  if (!body?.stats) {
    throw new Error('Invalid order statistics response')
  }

  return body
}

// ===== EXISTING FUNCTIONS =====
export async function apiLatestOrders(token: string): Promise<OrdersResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/latest`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  const body = await readJsonSafe<OrdersResponse>(res)

  if (!res.ok) {
    throw new Error('Failed to fetch latest orders')
  }

  if (!body?.orders) {
    throw new Error('Invalid orders response')
  }

  return body
}

export async function apiAllOrders(token: string): Promise<OrdersResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  const body = await readJsonSafe<OrdersResponse>(res)

  if (!res.ok) {
    throw new Error('Failed to fetch all orders')
  }

  if (!body?.orders) {
    throw new Error('Invalid orders response')
  }

  return body
}

export type OrderDetailsResponse = {
  order: Order
}

export async function apiOrderDetails(token: string, orderId: number): Promise<OrderDetailsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  const body = await readJsonSafe<OrderDetailsResponse>(res)

  if (!res.ok) {
    throw new Error('Failed to fetch order details')
  }

  if (!body?.order) {
    throw new Error('Invalid order details response')
  }

  return body
}

export type AcceptOrderResponse = {
  success: boolean
  message: string
  order: {
    id: number
    orderCode: string
    status: string
    deliveryManId: number
  }
}

export async function apiAcceptOrder(token: string, orderId: number): Promise<AcceptOrderResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  const body = await readJsonSafe<ApiErrorBody & AcceptOrderResponse>(res)

  if (!res.ok) {
    const message = body?.error || 'Failed to accept order'
    throw new Error(message)
  }

  if (!body?.success) {
    throw new Error('Invalid accept order response')
  }

  return body
}

export type UpdateOrderStatusRequest = {
  status: 'DELAYED' | 'REJECTED' | 'CANCELLED' | 'DELIVERED'
  reason?: string
  notes?: string
  location?: string
}

export type UpdateOrderStatusResponse = {
  success: boolean
  message: string
  order: {
    id: number
    orderCode: string
    status: string
    attemptNumber: number
  }
}

export async function apiUpdateOrderStatus(
  token: string,
  orderId: number,
  data: UpdateOrderStatusRequest
): Promise<UpdateOrderStatusResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  const body = await readJsonSafe<ApiErrorBody & UpdateOrderStatusResponse>(res)

  if (!res.ok) {
    const message = body?.error || 'Failed to update order status'
    console.error('API Error Response:', { status: res.status, body })
    throw new Error(message)
  }

  console.log('Update status response:', body)

  if (body) {
    if (body.success !== undefined || body.order) {
      return {
        success: body.success ?? true,
        message: body.message || 'Order status updated successfully',
        order: body.order || {
          id: orderId,
          orderCode: '',
          status: data.status,
          attemptNumber: 0,
        }
      }
    }
    console.warn('Unexpected response structure:', body)
  }

  throw new Error('Invalid update order status response')
}

export async function apiOrderDeliveryAttempts(token: string, orderId: number): Promise<{ attempts: DeliveryAttempt[] }> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://dash.sonixpress.ma"

  const res = await fetch(`${baseUrl}/api/mobile/orders/${orderId}/attempts`, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch delivery attempts: ${res.status}`)
  }

  const body = await res.json()
  return body
}

// ===== FINANCE FUNCTIONS =====
export interface CurrentStatus {
  totalEarned: number
  pendingEarnings: number
  collectedCOD: number
  pendingCOD: number
  availableBalance: number
  baseFee: number
}

export interface Statistics {
  totalDeliveries: number
  successfulDeliveries: number
  codOrdersCount: number
  totalCODAmount: number
  totalEarningsFromOrders: number
  totalTransferred: number
}

export interface CODOrder {
  id: number
  orderCode: string
  totalPrice: number
  deliveredAt: string | null
  customerName: string
  customerPhone: string
  address: string
  merchantName: string
}

export interface DeliveredOrder {
  id: number
  orderCode: string
  totalPrice: number
  paymentMethod: "COD" | "PREPAID"
  deliveredAt: string | null
  merchantEarning: number
}

export interface MoneyTransfer {
  id: number
  amount: number
  transferDate: string
  note: string
  reference: string | null
}

export interface FinanceData {
  currentStatus: CurrentStatus
  statistics: Statistics
  recentCODOrders: CODOrder[]
  recentDeliveredOrders: DeliveredOrder[]
  moneyTransfers: MoneyTransfer[]
}

export interface FinanceResponse {
  success: boolean
  data: FinanceData
}

export async function apiFinanceData(token: string): Promise<FinanceResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/finance`, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch finance data: ${res.status}`)
  }

  const body = await res.json()
  return body
}


export async function apiUpdateOrderNote(
  token: string, 
  orderId: number, 
  noteId: number,
  data: UpdateNoteRequest
): Promise<UpdateNoteResponse> {
  const url = `${getApiBaseUrl()}/api/mobile/orders/${orderId}/note/${noteId}`
  
  try {
    console.log(`📝 Updating note at: ${url}`)
    
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    console.log(`📊 Update note status: ${res.status}`)
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type')
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text()
      console.log(`⚠️ Update note returned HTML, text preview: ${text.substring(0, 100)}`)
      throw new Error('Le serveur n\'a pas pu mettre à jour la note.')
    }

    const responseData = await res.json()
    
    if (!res.ok) {
      const errorMessage = responseData?.error || responseData?.message || 'Échec de la mise à jour de la note'
      throw new Error(errorMessage)
    }

    // Handle response
    if (responseData.success !== undefined && responseData.note) {
      return {
        success: responseData.success,
        message: responseData.message || 'Note mise à jour avec succès',
        note: responseData.note
      }
    } else if (responseData.id) {
      return {
        success: true,
        message: 'Note mise à jour avec succès',
        note: responseData
      }
    } else {
      throw new Error('Réponse invalide du serveur')
    }
  } catch (error) {
    console.error('Error updating note:', error)
    throw error
  }
}