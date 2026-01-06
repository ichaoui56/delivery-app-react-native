export type DeliveryAttempt = {
  id: number
  orderId: number
  attemptNumber: number
  deliveryManId: number | null
  attemptedAt: string
  status: "TENTATIVE" | "ÉCHEC" | "RÉUSSIE" | "CLIENT_INDISPONIBLE" | "ADRESSE_ERRONÉE" | "REFUSÉ" | "AUTRE"
  reason: string | null
  notes: string | null
  location: string | null
}