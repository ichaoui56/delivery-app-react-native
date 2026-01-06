import { 
  apiLogout, 
  apiMe, 
  apiSignIn, 
  clearAuthToken, 
  getAuthToken, 
  setAuthToken, 
  type DeliveryManUser 
} from "@/lib/mobile-auth"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

type AuthStatus = "loading" | "signedOut" | "signedIn"

// Define the type for profile update data
type UpdateProfileData = {
  name: string
  phone?: string | null
  vehicleType?: string | null
  image?: string | null
  notificationEnabled?: boolean
}

type AuthContextValue = {
  status: AuthStatus
  token: string | null
  user: DeliveryManUser | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (data: UpdateProfileData) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<DeliveryManUser | null>(null)

  const refresh = async () => {
    const stored = await getAuthToken()
    if (!stored) {
      setToken(null)
      setUser(null)
      setStatus("signedOut")
      return
    }

    try {
      const me = await apiMe(stored)
      setToken(stored)
      setUser(me.user)
      setStatus("signedIn")
    } catch {
      await clearAuthToken()
      setToken(null)
      setUser(null)
      setStatus("signedOut")
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const signIn = async (email: string, password: string) => {
    const result = await apiSignIn(email, password)
    await setAuthToken(result.token)
    setToken(result.token)
    setUser(result.user)
    setStatus("signedIn")
  }

  const signOut = async () => {
    const currentToken = token
    setToken(null)
    setUser(null)
    setStatus("signedOut")

    await clearAuthToken()

    if (currentToken) {
      await apiLogout(currentToken)
    }
  }

  // Add this function to update user profile
  const updateProfile = async (data: UpdateProfileData) => {
    if (!token) {
      throw new Error("Not authenticated")
    }

    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://sonic-delivery.up.railway.app"
    
    try {
      const response = await fetch(`${baseUrl}/api/mobile/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error || "Failed to update profile"
        throw new Error(errorMessage)
      }

      if (!result.user) {
        throw new Error("Invalid response from server")
      }

      // Update the user state with new data
      setUser(result.user)
      
      // Also refresh to ensure we have the latest data
      await refresh()
      
    } catch (error) {
      console.error("Profile update error:", error)
      throw error
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({ 
      status, 
      token, 
      user, 
      signIn, 
      signOut, 
      refresh,
      updateProfile 
    }),
    [status, token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}