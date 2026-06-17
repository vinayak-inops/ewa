import { getAccessToken } from '@/hooks/auth/token-store'
import { useState } from 'react'

interface ByteToBase64Result {
  success: boolean
  objectUrl?: string
  error?: string
  fileType?: string
}

interface UseByteToBase64Options {
  onSuccess?: (result: ByteToBase64Result) => void
  onError?: (error: string) => void
}

export const useByteToBase64 = (options: UseByteToBase64Options = {}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ByteToBase64Result | null>(null)
  const { onSuccess, onError } = options

  const fetchByteArray = async (serverPath: string, fileType: string): Promise<ByteToBase64Result> => {
    if (!serverPath) {
      const errorMsg = 'Server path is missing'
      setError(errorMsg)
      onError?.(errorMsg)
      return { success: false, error: errorMsg, fileType }
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        const errorMsg = 'Authentication token is missing'
        setError(errorMsg)
        onError?.(errorMsg)
        return { success: false, error: errorMsg, fileType }
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
      const url = `${baseUrl}/api/query/attendance/document?path=${encodeURIComponent(serverPath)}`

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Convert to base64 — React Native doesn't support URL.createObjectURL
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i] as number)
      }
      const base64 = btoa(binary)
      const objectUrl = `data:${fileType};base64,${base64}`

      const byteResult: ByteToBase64Result = { success: true, objectUrl, fileType }
      setResult(byteResult)
      onSuccess?.(byteResult)
      return byteResult
    } catch (err: any) {
      const errorMsg = err?.message ?? 'Failed to fetch file'
      setError(errorMsg)
      onError?.(errorMsg)
      const errorResult: ByteToBase64Result = { success: false, error: errorMsg, fileType }
      setResult(errorResult)
      return errorResult
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setLoading(false)
    setError(null)
    setResult(null)
  }

  return { fetchByteArray, loading, error, result, reset }
}

export default useByteToBase64
