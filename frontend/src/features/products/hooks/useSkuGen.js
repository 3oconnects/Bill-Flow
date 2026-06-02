import { useState } from 'react'
import { productsApi } from '@/api'

export function useSkuGen(getBrand, setValue) {
  const [loading, setLoading] = useState(false)
  const generate = async () => {
    setLoading(true)
    try {
      const res = await productsApi.generateSku(encodeURIComponent(getBrand() || ''))
      setValue('sku', res.sku || res, { shouldDirty: true })
    } catch {}
    setLoading(false)
  }
  return { generate, loading }
}
