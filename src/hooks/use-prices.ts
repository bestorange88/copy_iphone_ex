import { useState, useEffect } from 'react'
import { subscribeToPrices, fetchAllPrices, type MarketItem } from '@/services/price-service'

export function usePrices(refreshInterval = 5000) {
  const [prices, setPrices] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initial fetch
    fetchAllPrices()
      .then((data) => {
        setPrices(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })

    // Subscribe to updates
    const unsubscribe = subscribeToPrices((newPrices) => {
      setPrices(newPrices)
    }, refreshInterval)

    return () => {
      unsubscribe()
    }
  }, [refreshInterval])

  return { prices, loading, error }
}
