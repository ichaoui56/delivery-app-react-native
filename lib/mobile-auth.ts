import * as SecureStore from "expo-secure-store"

const TOKEN_KEY = "mobile_jwt"

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

  return "https://sonic-delivery.up.railway.app"
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
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

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'ASSIGNED_TO_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REPORTED' | 'REJECTED'

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
  merchant?: Merchant
  deliveryMan?: DeliveryManInfo
}

export type OrdersResponse = {
  orders: Order[]
}

// ===== HISTORY TYPES =====
export type HistoryOrderStatus = 'PENDING' | 'ACCEPTED' | 'ASSIGNED_TO_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REPORTED' | 'REJECTED'

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
    reported: number
    totalEarnings: number
    avgDeliveryTime: string
    successRate: number
    currentStreak: number
    month: string
  }
}

// ===== HISTORY FUNCTIONS =====
export async function apiOrderHistory(
  token: string,
  options?: {
    status?: "All" | "Delivered" | "Cancelled" | "Reported" | "DELIVERED" | "CANCELLED" | "REPORTED" // Accept both formats
    take?: number
    skip?: number
  }
): Promise<OrdersHistoryResponse> {
  const params = new URLSearchParams()

  // Convert frontend status to backend status if needed
  let statusParam = options?.status
  if (statusParam) {
    // Map frontend filter to backend status
    const statusMap: Record<string, string> = {
      "Delivered": "DELIVERED",
      "Cancelled": "CANCELLED",
      "Reported": "REPORTED",
      // Keep uppercase as is
      "DELIVERED": "DELIVERED",
      "CANCELLED": "CANCELLED",
      "REPORTED": "REPORTED"
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

  // Check if body exists and has orders property (it could be empty array)
  if (!body || body.orders === undefined) {
    console.error('Invalid response structure:', body)
    throw new Error('Invalid order history response')
  }

  // It's okay if orders is an empty array
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
  status: 'REPORTED' | 'REJECTED' | 'CANCELLED' | 'DELIVERED'
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

  // Log response for debugging
  console.log('Update status response:', body)

  // Handle response - backend returns success field, but be lenient if structure differs
  if (body) {
    // Check if response has the expected structure
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

    // If body exists but doesn't match expected structure, log it
    console.warn('Unexpected response structure:', body)
  }

  throw new Error('Invalid update order status response')
}